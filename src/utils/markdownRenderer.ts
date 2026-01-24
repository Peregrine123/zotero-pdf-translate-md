import katex from "katex";
import MarkdownIt from "markdown-it";

const DEFAULT_KATEX_OPTIONS = {
  throwOnError: false,
  errorColor: "#cc0000",
  strict: false,
} as const;

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

function isSafeLink(href: string): boolean {
  const trimmed = (href ?? "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return true;

  const m = PROTOCOL_RE.exec(trimmed);
  if (!m) return false; // Disallow relative URLs (can resolve to chrome://... base).

  const scheme = m[0].toLowerCase();
  return SAFE_PROTOCOLS.has(scheme);
}

function mathInlineRule(state: any, silent: boolean): boolean {
  const src: string = state.src;
  const start = state.pos;

  if (src[start] !== "$") return false;
  if (start > 0 && src[start - 1] === "\\") return false; // escaped: \$
  if (src[start + 1] === "$") return false; // $$ is block math

  let matchPos = start + 1;
  while ((matchPos = src.indexOf("$", matchPos)) !== -1) {
    // Ignore escaped delimiter.
    if (src[matchPos - 1] === "\\") {
      matchPos += 1;
      continue;
    }
    // Ignore $$ as a closing delimiter for inline.
    if (src[matchPos + 1] === "$") {
      matchPos += 1;
      continue;
    }

    const content = src.slice(start + 1, matchPos);
    if (!content) return false;
    if (content.includes("\n")) return false;
    if (content[0] === " " || content[content.length - 1] === " ") return false;

    if (silent) return true;

    const token = state.push("math_inline", "math", 0);
    token.content = content;
    state.pos = matchPos + 1;
    return true;
  }

  return false;
}

function mathBlockRule(
  state: any,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const startPos = state.bMarks[startLine] + state.tShift[startLine];
  const maxPos = state.eMarks[startLine];

  // Avoid parsing inside indented code blocks.
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  if (state.src.slice(startPos, startPos + 2) !== "$$") return false;

  if (silent) return true;

  let nextLine = startLine;
  const firstLine = state.src.slice(startPos + 2, maxPos);

  // One-line block: $$ ... $$
  if (firstLine.trim().endsWith("$$")) {
    const end = firstLine.lastIndexOf("$$");
    const content = firstLine.slice(0, end).trim();

    state.line = startLine + 1;
    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.content = content;
    token.map = [startLine, state.line];
    return true;
  }

  let content = firstLine;
  while (++nextLine < endLine) {
    const pos = state.bMarks[nextLine] + state.tShift[nextLine];
    const max = state.eMarks[nextLine];
    const line = state.src.slice(pos, max);

    if (line.trim().startsWith("$$")) break;
    content += `\n${line}`;
  }

  if (nextLine >= endLine) return false;

  state.line = nextLine + 1;
  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content = content.trim();
  token.map = [startLine, state.line];
  return true;
}

let md: MarkdownIt | null = null;

function getMarkdownIt(): MarkdownIt {
  if (md) return md;

  md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: false,
  });

  // Force Markdown-it to parse links, then sanitize them at render-time.
  // (Markdown-it's default validateLink rejects some protocols and leaves raw
  // markdown in the output, which is safe but harms readability.)
  md.validateLink = () => true;

  // Strip/neutralize unsafe links; also apply safe defaults for external navigation.
  const defaultLinkOpen = md.renderer.rules.link_open;
  md.renderer.rules.link_open = (
    tokens: any[],
    idx: number,
    options: any,
    env: any,
    self: any,
  ) => {
    const token = tokens[idx];
    const href = token.attrGet("href") ?? "";

    if (!isSafeLink(href)) {
      token.attrSet("href", "#");
    }
    token.attrSet("rel", "noopener noreferrer nofollow");
    token.attrSet("target", "_blank");

    return defaultLinkOpen
      ? defaultLinkOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };

  // Privacy/safety default: do not load remote images.
  md.renderer.rules.image = (tokens: any[], idx: number) => {
    const alt = tokens[idx]?.content ?? "";
    return alt ? `<span class="md-image-alt">${escapeHtml(alt)}</span>` : "";
  };

  // KaTeX math ($...$/$$...$$) support.
  md.inline.ruler.after("backticks", "math_inline", mathInlineRule);
  md.block.ruler.after("blockquote", "math_block", mathBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.renderer.rules.math_inline = (tokens: any[], idx: number) => {
    const latex = tokens[idx]?.content ?? "";
    try {
      return katex.renderToString(latex, {
        ...DEFAULT_KATEX_OPTIONS,
        displayMode: false,
      });
    } catch {
      return escapeHtml(`$${latex}$`);
    }
  };
  md.renderer.rules.math_block = (tokens: any[], idx: number) => {
    const latex = tokens[idx]?.content ?? "";
    try {
      return `${katex.renderToString(latex, {
        ...DEFAULT_KATEX_OPTIONS,
        displayMode: true,
      })}\n`;
    } catch {
      return `${escapeHtml(`$$\n${latex}\n$$`)}\n`;
    }
  };

  return md;
}

export function renderMarkdownWithMath(text: string): string {
  if (!text) return "";

  try {
    return getMarkdownIt().render(text);
  } catch {
    // Worst-case fallback: render as plain text with preserved line breaks.
    return escapeHtml(text).replace(/\n/g, "<br />");
  }
}
