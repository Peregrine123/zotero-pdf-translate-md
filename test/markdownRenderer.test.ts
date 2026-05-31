import assert from "node:assert/strict";
import test from "node:test";

import { renderMarkdownWithMath } from "../src/utils/markdownRenderer";

function mathNodeCount(html: string): number {
  return html.match(/<mjx-container\b/g)?.length ?? 0;
}

function assertRendersMath(markdown: string, expectedCount = 1): void {
  const html = renderMarkdownWithMath(markdown);
  assert.equal(mathNodeCount(html), expectedCount);
}

function assertDoesNotRenderMath(markdown: string): void {
  const html = renderMarkdownWithMath(markdown);
  assert.equal(mathNodeCount(html), 0);
}

test("renderMarkdownWithMath: renders basic markdown", () => {
  const html = renderMarkdownWithMath("# Title\n\nHello");
  assert.match(html, /<h1[^>]*>Title<\/h1>/);
  assert.match(html, /<p[^>]*>Hello<\/p>/);
});

test("renderMarkdownWithMath: renders inline math ($...$) via MathJax", () => {
  const html = renderMarkdownWithMath("Inline $a^2+b^2=c^2$ test");
  assert.ok(
    html.includes("mjx-container"),
    "expected MathJax markup in output",
  );
  assert.ok(!html.includes("$a^2"), "expected raw $...$ to be consumed");
});

test("renderMarkdownWithMath: renders short inline math ($k$)", () => {
  const html = renderMarkdownWithMath("Short $k$ ok");
  assert.ok(
    html.includes("mjx-container"),
    "expected MathJax markup in output",
  );
});

test("renderMarkdownWithMath: renders inline dollar math with math signals", () => {
  assertRendersMath("Inline $a^2+b^2=c^2$ test");
  assertRendersMath("Inline $\\frac{1}{2}$ test");
  assertRendersMath("Inline $x_i$ test");
});

test("renderMarkdownWithMath: renders short variable inline math", () => {
  assertRendersMath("Short $k$ ok");
});

test("renderMarkdownWithMath: rejects spaced inline dollar math", () => {
  assertDoesNotRenderMath("Inline $ a^2 $ should stay raw");
});

test("renderMarkdownWithMath: rejects multiline inline dollar math", () => {
  assertDoesNotRenderMath("Inline $a\nb$ should stay raw");
});

test("renderMarkdownWithMath: rejects natural language inside dollar delimiters", () => {
  assertDoesNotRenderMath("This is $important$ text");
});

test("renderMarkdownWithMath: rejects numeric-only dollar content", () => {
  assertDoesNotRenderMath("The price is $5$ today");
});

test("renderMarkdownWithMath: keeps escaped dollars as text", () => {
  assertDoesNotRenderMath("Escaped \\$a^2$ should stay text");
});

test("renderMarkdownWithMath: renders adjacent inline math blocks", () => {
  const html = renderMarkdownWithMath("$a$$b$");
  const count = html.match(/mjx-container/g)?.length ?? 0;
  assert.equal(count, 2);
});

test("renderMarkdownWithMath: renders block math ($$...$$) via MathJax", () => {
  const html = renderMarkdownWithMath(
    "$$\n\\int_0^1 x^2\\,dx = \\\\frac{1}{3}\n$$",
  );
  assert.ok(
    html.includes('mjx-container display="true"') ||
      html.includes("mjx-container"),
    "expected MathJax display markup in output",
  );
});

test("renderMarkdownWithMath: renders whole-line single-line display math", () => {
  assertRendersMath("$$ a^2+b^2=c^2 $$");
});

test("renderMarkdownWithMath: rejects display math with trailing prose", () => {
  assertDoesNotRenderMath("$$ a^2 $$ trailing");
});

test("renderMarkdownWithMath: rejects empty display math", () => {
  assertDoesNotRenderMath("$$$$");
  assertDoesNotRenderMath("$$\n$$");
});

test("renderMarkdownWithMath: rejects multiline display math with trailing prose", () => {
  assertDoesNotRenderMath("$$\na^2\n$$ trailing");
});

test("renderMarkdownWithMath: rejects inline text around display math delimiters", () => {
  assertDoesNotRenderMath("before $$ a^2 $$ after");
});

test("renderMarkdownWithMath: does not support paren or bracket TeX delimiters", () => {
  assertDoesNotRenderMath("Inline \\(a^2\\) should stay text");
  assertDoesNotRenderMath("Display \\[a^2\\] should stay text");
  assertDoesNotRenderMath("Inline \\\\(a^2\\\\) should stay text");
  assertDoesNotRenderMath("Display \\\\[a^2\\\\] should stay text");
});

test("renderMarkdownWithMath: does not render math inside code spans or blocks", () => {
  assertDoesNotRenderMath("Code `$a^2$` should stay code");
  assertDoesNotRenderMath("```tex\n$a^2$\n```");
  assertDoesNotRenderMath("    $$\n    a^2\n    $$");
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

test("renderMarkdownWithMath: strips unsafe MathJax href output", () => {
  const html = renderMarkdownWithMath(
    "Formula $\\href{javascript:alert(document.cookie)}{click}$",
  );
  assert.ok(!/<a\b/i.test(html), "MathJax must not emit clickable anchors");
  assert.ok(
    !/\b(?:href|xlink:href)=["']?javascript:/i.test(html),
    "unsafe MathJax href leaked",
  );
});

test("renderMarkdownWithMath: strips unsafe MathJax data href output", () => {
  const html = renderMarkdownWithMath(
    "Formula $\\href{data:text/html,<script>alert(1)</script>}{click}$",
  );
  assert.ok(!/<a\b/i.test(html), "MathJax must not emit clickable anchors");
  assert.ok(
    !/\b(?:href|xlink:href)=["']?data:/i.test(html),
    "unsafe MathJax data href leaked",
  );
});

test("renderMarkdownWithMath: does not render images by default", () => {
  const html = renderMarkdownWithMath("![alt](https://example.com/a.png)");
  assert.ok(!html.includes("<img"), "image tag should be stripped");
  assert.ok(html.includes("alt"), "alt text should be preserved");
});
