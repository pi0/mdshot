# mdshot

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/mdshot?color=yellow)](https://npmjs.com/package/mdshot)
[![npm downloads](https://img.shields.io/npm/dm/mdshot?color=yellow)](https://npm.chart.dev/mdshot)

<!-- /automd -->

Render beautiful screenshots from Markdown. Powered by [Takumi](https://github.com/kane50613/takumi) and [MD4x](https://github.com/unjs/md4x).

## Features

- Render Markdown to PNG images
- GitHub-flavored styling with headings, lists, tables, code blocks, blockquotes, and more
- Section selection via regex pattern matching
- Watch mode for live re-rendering
- Customizable themes, dimensions, and fonts
- Bundled with [Geist](https://vercel.com/font) font family
- System emoji font support (Linux, macOS, Windows)

## Usage

### CLI

```
Usage:
  mdshot <input> [output.png] [options]

Input:
  file.md          Local markdown file
  npm:<package>    README from npm registry
  gh:<owner/repo>  README from GitHub repo

Options:
  -w, --watch              Watch for file changes
  -s, --select <pattern>   Markdown title selector
      --width <px>          Image width
      --height <px>         Image height
  -t, --title <text>        Title text
  -d, --description <text>  Description text
  -h, --help               Show this help
```

**Examples:**

```bash
# Render a local markdown file
npx mdshot input.md

# Render with custom output path
npx mdshot input.md output.png

# From an npm package
npx mdshot npm:vue

# From a GitHub repo
npx mdshot gh:unjs/mdshot

# Render a specific section
npx mdshot README.md --select "Installation"

# Watch mode with custom dimensions
npx mdshot notes.md -w --width 800 --height 400
```

### Programmatic

```ts
import { mdshot } from "mdshot";

const png = await mdshot("# Hello World\n\nThis is **mdshot**.");

// With options
const png = await mdshot(markdown, {
  width: 800,
  height: 400,
  select: "Usage",
  theme: {
    bg: "#1e1e2e",
    text: "#cdd6f4",
  },
});
```

**Options:**

| Option             | Type             | Default | Description                                 |
| ------------------ | ---------------- | ------- | ------------------------------------------- |
| `width`            | `number`         | `1280`  | Image width in pixels                       |
| `height`           | `number`         | `640`   | Image height in pixels                      |
| `format`           | `OutputFormat`   | `"png"` | Output format                               |
| `devicePixelRatio` | `number`         | `2`     | Device pixel ratio (retina)                 |
| `theme`            | `Partial<Theme>` | -       | Custom theme overrides                      |
| `fonts`            | `Font[]`         | -       | Additional fonts to load                    |
| `select`           | `string`         | -       | Regex pattern to select sections by heading |
| `title`            | `string`         | -       | Override or add the first heading title     |
| `description`      | `string`         | -       | Description line shown below the title      |

## Development

<details>

<summary>local development</summary>

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

</details>

## License

Published under the [MIT](https://github.com/pi0/mdshot/blob/main/LICENSE) license.
