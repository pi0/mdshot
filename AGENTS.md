# mdshot

Markdown-to-screenshot CLI and library. Renders markdown content as styled PNG images using the Takumi rendering engine.

## Project Structure

```
src/
  index.ts      — Main library entry. Exports `mdshot()` function and types.
  cli.ts        — CLI entry (`mdshot` bin). Parses args, resolves inputs, renders.
  _ast.ts       — Converts md4x AST nodes into Takumi render tree (containers/text).
  _theme.ts     — Theme type, default theme, and style helpers (base, wrapper, left border).
  _fonts.ts     — Loads bundled Geist/GeistMono fonts + system emoji font.
fonts/          — Bundled Geist variable font files (ttf).
```

## Architecture

1. **Markdown parsing**: Uses `md4x` (`renderToAST`) to parse markdown into a JSON AST (`[tag, attrs, ...children]` tuples).
2. **AST transforms** (`index.ts`): Optional `--select` filters sections by heading regex, `--title`/`--description` inject/override heading and description nodes, and a separator `<hr>` is auto-inserted after the title block.
3. **AST-to-render-tree** (`_ast.ts`): Walks the md4x AST and produces Takumi node tree (`container`/`text` nodes with CSS-like styles). Supports headings, paragraphs, code blocks, blockquotes, lists (ul/ol), tables, hr, and inline formatting (bold, italic, strikethrough, code, links).
4. **Rendering** (`index.ts`): Takumi `Renderer` renders the node tree to PNG (or other formats) at configurable size/DPR.

## CLI

```
mdshot <input> [output.png] [options]
```

**Inputs:**

- `file.md` — Local markdown file
- `npm:<package>` — README from npm registry (auto-fetches description)
- `gh:<owner/repo>` — README from GitHub repo (auto-fetches description)
- `pkg:<purl>` — README via regxa (cross-registry lookup via PURL)

**Options:** `--watch`/`-w`, `--select`/`-s`, `--width`, `--height`, `--title`/`-t`, `--description`/`-d`, `--help`/`-h`

## Key Dependencies

- `@takumi-rs/core` — Rust-based image renderer (provides `Renderer`, CSS-like layout)
- `md4x` — Fast markdown-to-AST parser
- `regxa` — Multi-registry package metadata + README URL resolution via PURL

## Dev Dependencies & Tooling

- **TypeScript**: `@typescript/native-preview` (tsgo) for type checking
- **Build**: `obuild`
- **Linting**: `oxlint` + `oxfmt`
- **Package manager**: pnpm (v10.29.3)
- **CI**: GitHub Actions — runs typecheck, lint

## Conventions

- ESM-only (`"type": "module"`)
- Internal/non-exported files prefixed with `_` (e.g., `_ast.ts`, `_theme.ts`, `_fonts.ts`)
- `.ts` extensions in imports
- Dev script: `pnpm mdshot` runs `node --watch ./src/cli.ts`
