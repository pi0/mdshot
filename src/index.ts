import { Renderer } from "@takumi-rs/core";
import type { Font, OutputFormat, RenderOptions } from "@takumi-rs/core";
import { renderToAST } from "md4x";
import { astToNodes } from "./_ast.ts";
import type { CodeBlockRenderer } from "./_ast.ts";
import { loadDefaultFonts } from "./_fonts.ts";
import { type Theme, baseStyle, defaultTheme, leftBorderStyle, wrapperStyle } from "./_theme.ts";

export type { Theme };
export type { CodeBlockRenderer };
export { defaultTheme };

export interface MdshotOptions {
  /** Image width in pixels (default: 1280) */
  width?: number;
  /** Image height in pixels (default: 640) */
  height?: number;
  /** Output format (default: "png") */
  format?: OutputFormat;
  /** Device pixel ratio for retina (default: 2) */
  devicePixelRatio?: number;
  /** Custom theme overrides */
  theme?: Partial<Theme>;
  /** Additional fonts to load */
  fonts?: Font[];
  /** Regex pattern to select sections by heading title */
  select?: string;
  /** Override or add the first heading title */
  title?: string;
  /** Description line shown below the title */
  description?: string;
  /** Optional custom renderer for code blocks */
  renderCodeBlock?: CodeBlockRenderer;
}

let _renderer: Renderer | undefined;

async function getRenderer(extraFonts?: Font[]): Promise<Renderer> {
  if (!_renderer) {
    const fonts = [...loadDefaultFonts(), ...(extraFonts ?? [])];
    _renderer = new Renderer({ fonts, loadDefaultFonts: false });
  } else if (extraFonts?.length) {
    await _renderer.loadFonts(extraFonts);
  }
  return _renderer;
}

export async function mdshot(markdown: string, options?: MdshotOptions): Promise<Buffer> {
  const theme: Theme = { ...defaultTheme, ...options?.theme };
  if (options?.width) {
    theme.width = options.width;
  }
  if (options?.height) {
    theme.height = options.height;
  }

  const ast = JSON.parse(renderToAST(markdown)) as {
    nodes: unknown[];
  };

  let astNodes = ast.nodes as Parameters<typeof astToNodes>[0];

  if (options?.select) {
    astNodes = filterSectionsByHeading(astNodes, new RegExp(options.select, "i"));
  }

  if (options?.title) {
    astNodes = applyTitle(astNodes, options.title);
  }

  if (options?.description) {
    astNodes = applyDescription(astNodes, options.description);
  }

  astNodes = insertTitleSeparator(astNodes);

  const children = astToNodes(astNodes, theme, options?.renderCodeBlock);

  const content = {
    type: "container" as const,
    style: baseStyle(theme),
    children,
  };

  const wrapper = wrapperStyle(theme);
  const border = leftBorderStyle(theme);
  const root =
    wrapper && border
      ? {
          type: "container" as const,
          style: wrapper,
          children: [{ type: "container" as const, style: border, children: [] }, content],
        }
      : content;

  const renderOpts: RenderOptions = {
    format: options?.format ?? "png",
    devicePixelRatio: options?.devicePixelRatio ?? 2,
  };

  const renderer = await getRenderer(options?.fonts);
  return renderer.render(root, renderOpts);
}

type MdNode = string | [string, Record<string, string>, ...MdNode[]];

function extractHeadingText(children: MdNode[]): string {
  return children
    .map((n) => (typeof n === "string" ? n : extractHeadingText(n.slice(2) as MdNode[])))
    .join("");
}

function applyTitle(nodes: MdNode[], title: string): MdNode[] {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (typeof node !== "string" && /^h[1-6]$/.test(node[0])) {
      const result = [...nodes];
      result[i] = [node[0], node[1], title];
      return result;
    }
  }
  return [["h1", {}, title], ...nodes];
}

function insertTitleSeparator(nodes: MdNode[]): MdNode[] {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (typeof node !== "string" && /^h[1-6]$/.test(node[0])) {
      let insertAt = i + 1;
      // Skip description paragraph if present
      const next = nodes[insertAt];
      if (next && typeof next !== "string" && next[0] === "p" && next[1]?.class === "description") {
        insertAt++;
      }
      const result = [...nodes];
      result.splice(insertAt, 0, ["hr", {}]);
      return result;
    }
  }
  return nodes;
}

function applyDescription(nodes: MdNode[], description: string): MdNode[] {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (typeof node !== "string" && /^h[1-6]$/.test(node[0])) {
      const result = [...nodes];
      result.splice(i + 1, 0, ["p", { class: "description" }, description]);
      return result;
    }
  }
  return [["p", { class: "description" }, description], ...nodes];
}

function filterSectionsByHeading(nodes: MdNode[], pattern: RegExp): MdNode[] {
  const result: MdNode[] = [];
  let capturing = false;
  let captureLevel = 0;

  for (const node of nodes) {
    if (typeof node !== "string" && /^h[1-6]$/.test(node[0])) {
      const level = Number(node[0][1]);
      const title = extractHeadingText(node.slice(2) as MdNode[]);
      if (pattern.test(title)) {
        capturing = true;
        captureLevel = level;
        result.push(node);
      } else if (capturing && level <= captureLevel) {
        capturing = false;
      } else if (capturing) {
        result.push(node);
      }
    } else if (capturing) {
      result.push(node);
    }
  }

  return result;
}
