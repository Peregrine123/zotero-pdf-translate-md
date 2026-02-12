import { getPref } from "./prefs";

export type MarkdownStyle = "paper" | "ui" | "compact";

const MARKDOWN_STYLE_CLASSES = [
  "md-style-paper",
  "md-style-ui",
  "md-style-compact",
] as const;

export function getMarkdownStyle(): MarkdownStyle {
  const raw = String(getPref("mathRenderingStyle") ?? "");
  if (raw === "ui" || raw === "compact") return raw;
  return "paper";
}

export function applyMarkdownStyle(target: Element): MarkdownStyle {
  const style = getMarkdownStyle();
  target.classList.remove(...MARKDOWN_STYLE_CLASSES);
  target.classList.add(`md-style-${style}`);
  return style;
}

export function syncMarkdownPreviewTypography(
  source: Element | null | undefined,
  target: HTMLElement,
): void {
  const win = target.ownerDocument.defaultView;
  if (!source || !win) return;
  const computed = win.getComputedStyle(source);
  if (!computed) return;
  target.style.fontSize = computed.fontSize;
  target.style.lineHeight = computed.lineHeight;
  target.style.color = computed.color;
}
