import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
  packages: AllPackages,
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

export function renderLatexWithMathJax(
  latex: string,
  options: { displayMode: boolean },
): string {
  const node = doc.convert(latex, {
    display: options.displayMode,
  });
  return adaptor.outerHTML(node);
}
