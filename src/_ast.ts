import type { CSSProperties, Theme } from "./_theme.ts";

// md4x AST node: [tagName, attrs, ...children] or string
type MdNode = string | [string, Record<string, string>, ...MdNode[]];

// Takumi node types
interface TContainer {
  type: "container";
  style?: CSSProperties;
  children?: TNode[];
}

interface TText {
  type: "text";
  text: string;
  style?: CSSProperties;
}

type TNode = TContainer | TText;

export type CodeBlockRenderer = (options: {
  code: string;
  language: string | undefined;
  theme: Theme;
}) => TNode | undefined;

function text(t: string, style?: CSSProperties): TText {
  return { type: "text", text: t, ...(style && { style }) };
}

function container(style: CSSProperties, children: TNode[]): TContainer {
  return { type: "container", style, children };
}

// Flatten inline children into text nodes with inherited styles
function inlineChildren(children: MdNode[], theme: Theme, inheritStyle?: CSSProperties): TNode[] {
  const nodes: TNode[] = [];
  for (const child of children) {
    if (typeof child === "string") {
      nodes.push(text(child, inheritStyle));
    } else {
      const [tag, _attrs, ...inner] = child;
      if (tag === "img") continue;
      const style = { ...inheritStyle, ...inlineStyle(tag, theme) };
      nodes.push(...inlineChildren(inner, theme, style));
    }
  }
  return nodes;
}

function inlineStyle(tag: string, theme: Theme): CSSProperties {
  switch (tag) {
    case "strong":
      return { fontWeight: 700 };
    case "em":
      return { fontStyle: "italic" };
    case "del":
      return { textDecoration: "line-through" };
    case "code":
      return {
        backgroundColor: theme.codeBg,
        color: theme.codeText,
        fontFamily: theme.monoFamily,
        fontSize: theme.fontSize - 2,
      };
    case "a":
      return { color: theme.linkColor };
    default:
      return {};
  }
}

function headingStyle(level: number, theme: Theme): CSSProperties {
  const sizes: Record<number, number> = {
    1: 32,
    2: 26,
    3: 22,
    4: 18,
    5: 16,
    6: 14,
  };
  return {
    fontSize: sizes[level] ?? 16,
    fontWeight: 700,
    color: theme.text,
    lineHeight: 1.3,
    ...(level <= 2 && {
      paddingBottom: 8,
    }),
  };
}

export function astToNodes(
  nodes: MdNode[],
  theme: Theme,
  renderCodeBlock?: CodeBlockRenderer,
): TNode[] {
  const result: TNode[] = [];

  for (const node of nodes) {
    if (typeof node === "string") {
      result.push(text(node, { color: theme.text }));
      continue;
    }

    const [tag, _attrs, ...children] = node;

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const style = headingStyle(level, theme);
      const inline = inlineChildren(children, theme, {
        color: theme.text,
        fontSize: style.fontSize,
        fontWeight: 700,
      });
      if (inline.length === 1 && inline[0]!.type === "text") {
        result.push(text((inline[0] as TText).text, style));
      } else {
        result.push(
          container(
            { display: "flex", flexWrap: "wrap", whiteSpace: "pre-wrap", ...style },
            inline,
          ),
        );
      }
      continue;
    }

    // Paragraph
    if (tag === "p") {
      const isDescription = _attrs.class === "description";
      const inline = inlineChildren(children, theme, {
        color: isDescription ? theme.muted : theme.text,
        ...(isDescription && { fontSize: theme.fontSize + 2 }),
      });
      if (inline.length === 1 && inline[0]!.type === "text") {
        result.push(inline[0]!);
      } else {
        result.push(
          container({ display: "flex", flexWrap: "wrap", whiteSpace: "pre-wrap" }, inline),
        );
      }
      continue;
    }

    // Code block
    if (tag === "pre") {
      const codeContent = extractText(children);
      const customNode = renderCodeBlock?.({ code: codeContent, language: _attrs.language, theme });
      if (customNode) {
        result.push(customNode);
        continue;
      }
      result.push(
        container(
          {
            display: "flex",
            backgroundColor: theme.codeBg,
            borderRadius: 8,
            padding: 16,
            overflow: "hidden",
          },
          [
            text(codeContent.trimEnd(), {
              fontFamily: theme.monoFamily,
              fontSize: theme.fontSize - 2,
              color: theme.codeText,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }),
          ],
        ),
      );
      continue;
    }

    // Blockquote
    if (tag === "blockquote") {
      const inner = astToNodes(children, theme, renderCodeBlock);
      result.push(
        container(
          {
            display: "flex",
            flexDirection: "column",
            borderLeft: `3px solid ${theme.blockquoteBorder}`,
            backgroundColor: theme.blockquoteBg,
            paddingLeft: 16,
            paddingTop: 8,
            paddingBottom: 8,
            borderRadius: 4,
            gap: 8,
          },
          inner,
        ),
      );
      continue;
    }

    // Unordered list
    if (tag === "ul") {
      const items = children.filter(
        (c): c is [string, Record<string, string>, ...MdNode[]] =>
          Array.isArray(c) && c[0] === "li",
      );
      result.push(
        container(
          {
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingLeft: 8,
          },
          items.map((li) => listItem(li, theme, "bullet")),
        ),
      );
      continue;
    }

    // Ordered list
    if (tag === "ol") {
      const items = children.filter(
        (c): c is [string, Record<string, string>, ...MdNode[]] =>
          Array.isArray(c) && c[0] === "li",
      );
      result.push(
        container(
          {
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingLeft: 8,
          },
          items.map((li, i) => listItem(li, theme, "number", i + 1)),
        ),
      );
      continue;
    }

    // Horizontal rule
    if (tag === "hr") {
      result.push(
        container(
          {
            display: "flex",
            height: 1,
            backgroundColor: theme.border,
          },
          [],
        ),
      );
      continue;
    }

    // Table
    if (tag === "table") {
      result.push(renderTable(children, theme));
      continue;
    }

    // Skip unsupported elements
    if (tag === "img") continue;

    // Fallback: recurse into block-level elements
    result.push(...astToNodes(children, theme, renderCodeBlock));
  }

  return result;
}

function listItem(
  li: [string, Record<string, string>, ...MdNode[]],
  theme: Theme,
  mode: "bullet" | "number",
  index?: number,
): TContainer {
  const [, , ...children] = li;
  const marker = mode === "bullet" ? "\u2022 " : `${index}. `;
  const inline = inlineChildren(
    children.flatMap((c) =>
      typeof c === "string" ? [c] : c[0] === "p" ? (c.slice(2) as MdNode[]) : [c],
    ),
    theme,
    { color: theme.text },
  );

  return container({ display: "flex", flexWrap: "wrap", whiteSpace: "pre-wrap" }, [
    text(marker, { color: theme.muted }),
    ...inline,
  ]);
}

function renderTable(children: MdNode[], theme: Theme): TContainer {
  const rows: TContainer[] = [];

  for (const child of children) {
    if (typeof child === "string") continue;
    const [tag, , ...inner] = child;
    if (tag === "thead" || tag === "tbody") {
      rows.push(...renderTableRows(inner, theme, tag === "thead"));
    } else if (tag === "tr") {
      rows.push(renderTableRow(child, theme, false));
    }
  }

  return container(
    {
      display: "flex",
      flexDirection: "column",
      border: `1px solid ${theme.border}`,
      borderRadius: 8,
      overflow: "hidden",
    },
    rows,
  );
}

function renderTableRows(rows: MdNode[], theme: Theme, isHead: boolean): TContainer[] {
  return rows
    .filter(
      (r): r is [string, Record<string, string>, ...MdNode[]] => Array.isArray(r) && r[0] === "tr",
    )
    .map((r) => renderTableRow(r, theme, isHead));
}

function renderTableRow(
  row: [string, Record<string, string>, ...MdNode[]],
  theme: Theme,
  isHead: boolean,
): TContainer {
  const [, , ...cells] = row;
  return container(
    {
      display: "flex",
      flexDirection: "row",
      ...(isHead && { backgroundColor: theme.codeBg }),
      borderBottom: `1px solid ${theme.border}`,
    },
    cells
      .filter((c): c is [string, Record<string, string>, ...MdNode[]] => Array.isArray(c))
      .map((cell) => {
        const [, , ...inner] = cell;
        const inline = inlineChildren(inner, theme, {
          color: theme.text,
          ...(isHead && { fontWeight: 700 }),
        });
        return container(
          { display: "flex", flex: 1, padding: 8, flexWrap: "wrap", whiteSpace: "pre-wrap" },
          inline,
        );
      }),
  );
}

function extractText(nodes: MdNode[]): string {
  return nodes
    .map((n) => (typeof n === "string" ? n : extractText(n.slice(2) as MdNode[])))
    .join("");
}
