import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const UNSAFE_TEX_PACKAGES = new Set(["html"]);
const SAFE_TEX_PACKAGES = AllPackages.filter(
  (pkg) => !UNSAFE_TEX_PACKAGES.has(pkg),
);

const tex = new TeX({
  packages: SAFE_TEX_PACKAGES,
  maxBuffer: 10 * 1024,
});

const svg = new SVG({
  // Keep each equation self-contained to avoid cross-node font cache mismatch.
  fontCache: "none",
});

const doc = mathjax.document("", {
  InputJax: tex,
  OutputJax: svg,
});

function sanitizeMathJaxOutput(html: string): string {
  return html
    .replace(/<\/?a(?:\s[^>]*)?>/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export function renderLatexWithMathJax(
  latex: string,
  options: { displayMode: boolean },
): string {
  const node = doc.convert(latex, {
    display: options.displayMode,
  });
  return sanitizeMathJaxOutput(adaptor.outerHTML(node));
}
