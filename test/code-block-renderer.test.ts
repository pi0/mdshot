import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToAST } from "md4x";
import { astToNodes } from "../src/_ast.ts";
import { defaultTheme } from "../src/_theme.ts";

test("custom code block renderer receives code, language and theme", () => {
  const { nodes } = JSON.parse(renderToAST("> ```js\n> const n = 1;\n> ```"));
  const rendered = astToNodes(nodes, defaultTheme, ({ code, language, theme }) => {
    assert.equal(code, "const n = 1;\n");
    assert.equal(language, "js");
    assert.equal(theme, defaultTheme);
    return { type: "text", text: "custom" };
  });
  const quote = rendered[0]!;
  assert.ok(quote.type === "container");
  assert.deepEqual(quote.children, [{ type: "text", text: "custom" }]);
});

test("returning undefined uses the default code block renderer", () => {
  const { nodes } = JSON.parse(renderToAST("```\nplain\n```"));
  const fallback = astToNodes(nodes, defaultTheme);
  const rendered = astToNodes(nodes, defaultTheme, ({ language }) => {
    assert.equal(language, undefined);
    return undefined;
  });
  assert.deepEqual(rendered, fallback);
});
