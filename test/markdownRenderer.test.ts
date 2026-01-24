import assert from "node:assert/strict";
import test from "node:test";

import { renderMarkdownWithMath } from "../src/utils/markdownRenderer";

test("renderMarkdownWithMath: renders basic markdown", () => {
  const html = renderMarkdownWithMath("# Title\n\nHello");
  assert.match(html, /<h1[^>]*>Title<\/h1>/);
  assert.match(html, /<p[^>]*>Hello<\/p>/);
});

test("renderMarkdownWithMath: renders inline math ($...$) via KaTeX", () => {
  const html = renderMarkdownWithMath("Inline $a^2+b^2=c^2$ test");
  assert.ok(html.includes("katex"), "expected KaTeX markup in output");
  assert.ok(!html.includes("$a^2"), "expected raw $...$ to be consumed");
});

test("renderMarkdownWithMath: renders short inline math ($k$)", () => {
  const html = renderMarkdownWithMath("Short $k$ ok");
  assert.ok(html.includes("katex"), "expected KaTeX markup in output");
});

test("renderMarkdownWithMath: renders block math ($$...$$) via KaTeX", () => {
  const html = renderMarkdownWithMath(
    "$$\n\\int_0^1 x^2\\,dx = \\\\frac{1}{3}\n$$",
  );
  assert.ok(
    html.includes("katex-display") || html.includes("katex"),
    "expected KaTeX display markup in output",
  );
});

test("renderMarkdownWithMath: blocks javascript: links", () => {
  const html = renderMarkdownWithMath("[x](javascript:alert(1))");
  assert.ok(
    !html.toLowerCase().includes("javascript:"),
    "unsafe protocol leaked",
  );
});

test("renderMarkdownWithMath: blocks relative links (chrome base safety)", () => {
  const html = renderMarkdownWithMath("[x](foo/bar)");
  assert.ok(
    !html.includes('href="foo/bar"'),
    "relative href should not be emitted",
  );
});

test("renderMarkdownWithMath: escapes raw HTML input", () => {
  const html = renderMarkdownWithMath('<img src=x onerror="alert(1)">');
  assert.ok(html.includes("&lt;img"), "expected HTML to be escaped");
  assert.ok(!html.includes("<img"), "raw HTML should not render");
});

test("renderMarkdownWithMath: does not render images by default", () => {
  const html = renderMarkdownWithMath("![alt](https://example.com/a.png)");
  assert.ok(!html.includes("<img"), "image tag should be stripped");
  assert.ok(html.includes("alt"), "alt text should be preserved");
});
