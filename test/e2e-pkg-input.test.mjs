import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["./src/cli.ts", ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test("renders screenshot from pkg PURL input", { timeout: 120000 }, async () => {
  const tmp = await mkdtemp(join(tmpdir(), "mdshot-pkg-e2e-"));
  const output = join(tmp, "pkg-output.png");

  try {
    const result = await runCli(["pkg:npm/lodash", output, "--width", "640", "--height", "360"]);

    assert.equal(result.code, 0, result.stderr || "CLI exited with non-zero code");
    assert.match(result.stdout, /Screenshot saved to/);

    const outputStat = await stat(output);
    assert.ok(outputStat.size > 0, "Expected non-empty screenshot output");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("fails for empty pkg target", async () => {
  const result = await runCli(["pkg:"]);

  assert.notEqual(result.code, 0, "Expected CLI to fail for empty pkg target");
  assert.match(result.stderr, /Invalid input: "pkg:"/);
});
