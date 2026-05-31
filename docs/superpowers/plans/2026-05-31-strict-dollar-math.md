# Strict Dollar Math Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `renderMarkdownWithMath()` support only the `$...$` and `$$...$$` math contract while rejecting overly broad or ambiguous dollar usage.

**Architecture:** Keep the rendering pipeline centralized in `src/utils/markdownRenderer.ts`. Add small parser helper functions beside the existing markdown-it rules, then drive the behavior through focused unit tests in `test/markdownRenderer.test.ts`.

**Tech Stack:** TypeScript, markdown-it custom rules, MathJax SVG rendering, Node test runner with `tsx`.

---

## File Structure

- Modify `src/utils/markdownRenderer.ts`
  - Add math-likeness helpers for inline dollar content.
  - Apply the helper in `mathInlineRule()`.
  - Keep display math strict and block-only.
- Modify `test/markdownRenderer.test.ts`
  - Add regression tests for accepted dollar math.
  - Add rejection tests for unsupported delimiters, whitespace, natural text,
    numeric-only content, escaped dollars, code spans, code fences, and display
    math with trailing prose.
- Keep `src/utils/mathjaxRenderer.ts` unchanged for this task.
- Keep UI files unchanged because the bug source is the shared renderer.

## Task 1: Add Strict Dollar Contract Tests

**Files:**
- Modify: `test/markdownRenderer.test.ts`

- [ ] **Step 1: Add helper assertions near the top of the test file**

Add these helpers after the imports:

```ts
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
```

- [ ] **Step 2: Add tests for accepted inline dollar math**

Append these tests after the existing inline math tests:

```ts
test("renderMarkdownWithMath: renders inline dollar math with math signals", () => {
  assertRendersMath("Inline $a^2+b^2=c^2$ test");
  assertRendersMath("Inline $\\frac{1}{2}$ test");
  assertRendersMath("Inline $x_i$ test");
});

test("renderMarkdownWithMath: renders short variable inline math", () => {
  assertRendersMath("Short $k$ ok");
});
```

- [ ] **Step 3: Add tests for rejected inline dollar cases**

Append these tests after the accepted inline tests:

```ts
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
```

- [ ] **Step 4: Add tests for display math boundaries**

Append these tests after the existing block math test:

```ts
test("renderMarkdownWithMath: renders whole-line single-line display math", () => {
  assertRendersMath("$$ a^2+b^2=c^2 $$");
});

test("renderMarkdownWithMath: rejects display math with trailing prose", () => {
  assertDoesNotRenderMath("$$ a^2 $$ trailing");
});

test("renderMarkdownWithMath: rejects inline text around display math delimiters", () => {
  assertDoesNotRenderMath("before $$ a^2 $$ after");
});
```

- [ ] **Step 5: Add tests for unsupported delimiters and code boundaries**

Append these tests near the other math tests:

```ts
test("renderMarkdownWithMath: does not support paren or bracket TeX delimiters", () => {
  assertDoesNotRenderMath("Inline \\(a^2\\) should stay text");
  assertDoesNotRenderMath("Display \\[a^2\\] should stay text");
});

test("renderMarkdownWithMath: does not render math inside code spans or fences", () => {
  assertDoesNotRenderMath("Code `$a^2$` should stay code");
  assertDoesNotRenderMath("```tex\n$a^2$\n```");
});
```

- [ ] **Step 6: Run tests and confirm the new tests expose current behavior**

Run:

```bash
npm test
```

Expected before implementation:

- At least `rejects natural language inside dollar delimiters` fails if
  `$important$` currently renders.
- At least `rejects numeric-only dollar content` fails if `$5$` currently
  renders.
- Other tests may already pass because the current parser is strict in those
  areas.

## Task 2: Implement Inline Math-Likeness Filtering

**Files:**
- Modify: `src/utils/markdownRenderer.ts`

- [ ] **Step 1: Add parser helper constants below `PROTOCOL_RE`**

Add this code after the existing `PROTOCOL_RE` declaration:

```ts
const TEX_COMMAND_RE = /\\[a-zA-Z]+/;
const MATH_OPERATOR_RE = /[\\^_=+\-*/<>|{}]/;
const SHORT_VARIABLE_RE =
  /^[A-Za-z\u0370-\u03ff](?:[_^](?:[A-Za-z0-9\u0370-\u03ff]+|\{[^{}\n]+\}))*$/;
const NUMERIC_ONLY_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
```

- [ ] **Step 2: Add `isInlineMathContent()` below `isSafeLink()`**

Add this function after `isSafeLink()`:

```ts
function isInlineMathContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (trimmed !== content) return false;
  if (trimmed.includes("\n")) return false;
  if (NUMERIC_ONLY_RE.test(trimmed)) return false;
  if (TEX_COMMAND_RE.test(trimmed)) return true;
  if (MATH_OPERATOR_RE.test(trimmed)) return true;
  return SHORT_VARIABLE_RE.test(trimmed);
}
```

- [ ] **Step 3: Apply the helper inside `mathInlineRule()`**

Replace this block:

```ts
    const content = src.slice(start + 1, matchPos);
    if (!content) return false;
    if (content.includes("\n")) return false;
    if (content[0] === " " || content[content.length - 1] === " ") return false;
```

with:

```ts
    const content = src.slice(start + 1, matchPos);
    if (!isInlineMathContent(content)) return false;
```

- [ ] **Step 4: Run the focused renderer tests**

Run:

```bash
node --import tsx --test test/markdownRenderer.test.ts
```

Expected:

- All `renderMarkdownWithMath` tests pass.
- No test emits raw assertion errors.

- [ ] **Step 5: Run the full test suite**

Run:

```bash
npm test
```

Expected:

- TAP output shows all tests passing.
- Exit code is `0`.

## Task 3: Verify Display Math Contract and Build

**Files:**
- Review: `src/utils/markdownRenderer.ts`
- Review: `test/markdownRenderer.test.ts`

- [ ] **Step 1: Confirm display math remains block-only**

Inspect `mathBlockRule()` and confirm these conditions remain true:

```ts
if (state.sCount[startLine] - state.blkIndent >= 4) return false;
if (state.src.slice(startPos, startPos + 2) !== "$$") return false;
```

The same-line branch should only accept lines whose trimmed content ends with
the closing delimiter:

```ts
if (firstLine.trim().endsWith("$$")) {
```

- [ ] **Step 2: Run a manual renderer smoke check**

Run:

```bash
node --import tsx -e 'const m = await import("./src/utils/markdownRenderer"); const { renderMarkdownWithMath } = m.default; for (const text of ["$a^2$", "$ important $", "$5$", "$$ a^2 $$ trailing", "`$a^2$`"]) { const html = renderMarkdownWithMath(text); console.log(text, (html.match(/<mjx-container\\b/g) || []).length); }'
```

Expected output:

```text
$a^2$ 1
$ important $ 0
$5$ 0
$$ a^2 $$ trailing 0
`$a^2$` 0
```

- [ ] **Step 3: Run the build**

Run:

```bash
npm run build
```

Expected:

- `npm run check:compat` passes.
- `tsc --noEmit` passes.
- `zotero-plugin build` completes and writes the package under `build/`.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/utils/markdownRenderer.ts test/markdownRenderer.test.ts docs/superpowers/specs/2026-05-31-strict-dollar-math-design.md docs/superpowers/plans/2026-05-31-strict-dollar-math.md
git commit -m "fix(math): enforce strict dollar math parsing"
```

Expected:

- Commit succeeds with the strict parser, tests, spec, and plan.

## Self-Review

- Spec coverage: The plan covers accepted `$...$`, accepted `$$...$$`,
  rejected unsupported delimiters, rejected ambiguous dollar usage, code
  boundaries, and verification.
- Placeholder scan: No placeholder instructions are present.
- Type consistency: New helpers are local to `markdownRenderer.ts`; tests use
  existing `renderMarkdownWithMath()`.
