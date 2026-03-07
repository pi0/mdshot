#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createFromPURL, fullName, parsePURL, resolveReadmeUrl } from "regxa";
import "regxa/registries";
import { mdshot } from "./index.ts";

// ANSI colors
const c = {
  bold: (s: string) => `\x1B[1m${s}\x1B[22m`,
  cyan: (s: string) => `\x1B[36m${s}\x1B[39m`,
  green: (s: string) => `\x1B[32m${s}\x1B[39m`,
  magenta: (s: string) => `\x1B[35m${s}\x1B[39m`,
  red: (s: string) => `\x1B[31m${s}\x1B[39m`,
  dim: (s: string) => `\x1B[2m${s}\x1B[22m`,
};

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    watch: { type: "boolean", short: "w", default: false },
    select: { type: "string", short: "s" },
    width: { type: "string" },
    height: { type: "string" },
    title: { type: "string", short: "t" },
    description: { type: "string", short: "d" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || !positionals[0]) {
  console.log(`
${c.bold("mdshot")} ${c.dim("— markdown to screenshot")}

${c.cyan("Usage:")}
  ${c.green("mdshot")} ${c.magenta("<input>")} ${c.dim("[output.png]")} ${c.dim("[options]")}

${c.cyan("Input:")}
  ${c.dim("file.md")}          Local markdown file
  ${c.dim("npm:<package>")}    README from npm registry
  ${c.dim("gh:<owner/repo>")}  README from GitHub repo
  ${c.dim("pkg:<purl>")}       README via regxa (PURL)

${c.cyan("Options:")}
  ${c.magenta("-w, --watch")}              Watch for file changes
  ${c.magenta("-s, --select")} ${c.dim("<pattern>")}   Markdown title selector
  ${c.magenta("    --width")} ${c.dim("<px>")}          Image width
  ${c.magenta("    --height")} ${c.dim("<px>")}         Image height
  ${c.magenta("-t, --title")} ${c.dim("<text>")}        Title text
  ${c.magenta("-d, --description")} ${c.dim("<text>")}  Description text
  ${c.magenta("-h, --help")}               Show this help
`);
  process.exit(positionals[0] ? 0 : 1);
}

const width = values.width ? Number(values.width) : undefined;
const height = values.height ? Number(values.height) : undefined;

function resolvePURLInput(input: string): string | undefined {
  if (!input.startsWith("pkg:")) {
    return undefined;
  }
  return input;
}

async function resolveInput(input: string): Promise<{
  markdown: string;
  outputPath: string;
  watchPath?: string;
  defaultTitle?: string;
  defaultDescription?: string;
}> {
  if (input === "npm:" || input === "gh:" || input === "pkg:") {
    throw new Error(`Invalid input: "${input}" — missing package, repo, or PURL target`);
  }
  const npmMatch = input.match(/^npm:(.+)$/);
  if (npmMatch) {
    const pkg = npmMatch[1]!;
    const res = await fetch(`https://registry.npmjs.org/${pkg}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch package "${pkg}": ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { readme?: string; description?: string };
    if (!data.readme) {
      throw new Error(`Package "${pkg}" has no README`);
    }
    const outputPath = resolve(`${pkg.replace(/[/@]/g, "_")}.png`);
    return {
      markdown: data.readme,
      outputPath,
      defaultTitle: pkg,
      defaultDescription: data.description ?? undefined,
    };
  }
  const ghMatch = input.match(/^gh:([^/]+\/.+)$/);
  if (input.startsWith("gh:") && !ghMatch) {
    throw new Error(`Invalid GitHub input: "${input}" — expected format: gh:owner/repo`);
  }
  if (ghMatch) {
    const repo = ghMatch[1]!;
    const [readmeRes, repoRes] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${repo}/HEAD/README.md`),
      fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      }).catch(() => undefined),
    ]);
    if (!readmeRes.ok) {
      throw new Error(`Failed to fetch README: ${readmeRes.status} ${readmeRes.statusText}`);
    }
    const markdown = await readmeRes.text();
    const repoData = repoRes?.ok ? ((await repoRes.json()) as { description?: string }) : undefined;
    const outputPath = resolve(`${repo.replace(/[/@]/g, "_")}.png`);
    return {
      markdown,
      outputPath,
      defaultTitle: repo,
      defaultDescription: repoData?.description ?? undefined,
    };
  }
  const purl = resolvePURLInput(input);
  if (purl) {
    try {
      const parsed = parsePURL(purl);
      const [registry, packageName, version] = createFromPURL(purl);
      const pkg = await registry.fetchPackage(packageName);

      const readmeURL = resolveReadmeUrl(
        pkg,
        registry.urls(),
        version || pkg.latestVersion || undefined,
      );
      const readmeRes = await fetch(readmeURL);
      if (!readmeRes.ok) {
        throw new Error(`Failed to fetch README: ${readmeRes.status} ${readmeRes.statusText}`);
      }
      const markdown = await readmeRes.text();

      if (!markdown.trim()) {
        throw new Error(`Package "${purl}" has no README content`);
      }

      const outputPath = resolve(`${purl.replace(/[^a-zA-Z0-9._-]/g, "_")}.png`);
      return {
        markdown,
        outputPath,
        defaultTitle: `${parsed.type}/${fullName(parsed)}`,
        defaultDescription: pkg.description || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve PURL input "${input}": ${message}`);
    }
  }
  const inputPath = resolve(input);
  const markdown = readFileSync(inputPath, "utf8");
  const outputPath = resolve(positionals[1] ? positionals[1] : input.replace(/\.md$/, ".png"));
  return { markdown, outputPath, watchPath: inputPath };
}

const input = positionals[0];
const resolved = await resolveInput(input);
const outputPath = positionals[1] ? resolve(positionals[1]) : resolved.outputPath;

async function render() {
  const { markdown } = resolved.watchPath
    ? { markdown: readFileSync(resolved.watchPath, "utf8") }
    : resolved;
  const buf = await mdshot(markdown, {
    select: values.select,
    width,
    height,
    title: values.title ?? resolved.defaultTitle,
    description: values.description ?? resolved.defaultDescription,
  });
  writeFileSync(outputPath, buf);
  console.log(`${c.green("✓")} Screenshot saved to ${c.cyan(outputPath)}`);
}

await render();

if (values.watch) {
  if (!resolved.watchPath) {
    console.error(`${c.red("✗")} Watch mode is not supported for remote inputs`);
    process.exit(1);
  }
  console.log(`${c.cyan("⟳")} Watching ${c.dim(resolved.watchPath)} for changes...`);
  const watcher = watch(resolved.watchPath);
  for await (const event of watcher) {
    if (event.eventType === "change") {
      try {
        await render();
      } catch (err) {
        console.error(`${c.red("✗")} Render error:`, err);
      }
    }
  }
}
