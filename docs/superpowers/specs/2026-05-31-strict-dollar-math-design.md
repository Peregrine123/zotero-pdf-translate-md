# Strict Dollar Math Rendering Design

## Goal

Constrain Markdown math rendering to the dollar-delimiter contract used by the
translation system prompt:

- Inline math: `$...$`
- Display math: `$$...$$`

The renderer should parse common valid model output reliably while avoiding
overly broad guesses that turn money, escaped dollars, code, or arbitrary text
into math.

## Context

`feat/math-preview` routes rendered translation output through
`renderMarkdownWithMath()` in `src/utils/markdownRenderer.ts`. That function is
used by the sidebar and standalone `math-textbox` overlay, and by the reader
popup preview.

The previous implementation had broad delimiter support through
`src/utils/mathRenderer.ts`, including `\(...\)` and `\[...\]`. For this fork,
the preferred contract is narrower because the system prompt already asks LLM
providers to emit the dollar-delimiter form. Supporting more delimiter families
adds parser ambiguity without improving the primary controlled output path.

## Supported Syntax

### Inline Math

The renderer supports `$...$` when all of these are true:

- The opening dollar is not escaped as `\$`.
- The opening dollar is not followed by another `$`.
- The first character after the opening dollar is not whitespace.
- The closing dollar is not escaped.
- The character before the closing dollar is not whitespace.
- The content does not contain a newline.
- The content looks like math.

The math-likeness check should accept:

- TeX commands such as `\frac`, `\sqrt`, `\alpha`, `\sum`, `\int`.
- Common math operators and structures such as `^`, `_`, `=`, `+`, `-`, `*`,
  `/`, `<`, `>`, `|`, `{`, `}`.
- Short variable expressions such as `x`, `k`, `x_i`, `x^2`, `n=1`.

The check should reject obvious non-math text:

- Pure natural-language words such as `$important$`.
- Pure numeric text such as `$5$`.
- Strings with leading or trailing spaces such as `$ a $`.

### Display Math

The renderer supports `$$...$$` display math when all of these are true:

- The opening `$$` starts a Markdown block after at most normal indentation.
- The closing `$$` is either on its own line or ends the same line.
- Same-line display math has no trailing prose after the closing `$$`.
- The content is non-empty after trimming.

Examples that should render:

```md
$$
a^2+b^2=c^2
$$
```

```md
$$ a^2+b^2=c^2 $$
```

Examples that should remain plain Markdown text:

```md
$$ a^2 $$ trailing text
```

```md
before $$ a^2 $$ after
```

## Unsupported Syntax

The renderer does not support these delimiter families:

- `\(...\)`
- `\[...\]`
- `\\(...\\)`
- `\\[...\\]`

If users or upstream services emit those forms, they should be treated as plain
Markdown text. The system prompt and service-specific prompts should continue to
ask models to use `$...$` and `$$...$$`.

## Markdown Boundaries

The parser must not render math inside:

- Inline code spans.
- Fenced code blocks.
- Indented code blocks.
- Escaped dollar signs.

Markdown HTML remains disabled. Link and image safety behavior stays unchanged.

## Error Handling

If a math token is accepted by the parser but MathJax rendering fails, the
renderer should fall back to escaped source text for that token. This preserves
the user's original translation output without injecting partial HTML.

The fallback is a rendering failure, not a parsing success. Tests should cover
parser acceptance separately from MathJax output so regressions are easier to
diagnose.

## Testing Requirements

Add unit coverage for:

- Valid inline math: `$a^2+b^2=c^2$`, `$k$`.
- Valid display math: multiline `$$...$$`, same-line whole-line `$$ ... $$`.
- Rejected inline math: `$ a $`, `$a\nb$`, `$important$`, `$5$`.
- Escaped dollars: `\$a$` remains text.
- Unsupported delimiters: `\(...\)` and `\[...\]` do not render as MathJax.
- Code boundaries: `` `$a^2$` `` and fenced code do not render math.
- Rejected display math with trailing prose: `$$ a^2 $$ trailing`.

The baseline verification command is:

```bash
npm test
```

Before merging, run:

```bash
npm run build
```
