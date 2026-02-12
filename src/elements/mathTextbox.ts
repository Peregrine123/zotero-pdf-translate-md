import { config } from "../../package.json";
import { getPref } from "../utils/prefs";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import {
  applyMarkdownStyle,
  syncMarkdownPreviewTypography,
} from "../utils/markdownPreviewStyle";

export class MathTextboxElement extends XULElementBase {
  private _textbox: XULTextBoxElement | null = null;
  private _overlay: HTMLElement | null = null;
  private _value: string = "";
  private _renderedValue: string | null = null;
  private _editing = false;

  private _upgradeProperty(prop: "value" | "placeholder"): void {
    // If a property was set before the custom element upgraded/initialized,
    // it becomes an own-property and will bypass our getters/setters.
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (this as any)[prop];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (this as any)[prop];
      // Re-apply so our setter runs.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any)[prop] = value;
    }
  }

  get content() {
    return MozXULElement.parseXULToFragment(`
      <editable-text id="inner-textbox" multiline="true" />
      <linkset>
        <html:link
          rel="stylesheet"
          href="chrome://${config.addonRef}/content/styles/mathTextbox.css"
        ></html:link>
        <html:link
          rel="stylesheet"
          href="chrome://${config.addonRef}/content/styles/markdownPreview.css"
        ></html:link>
        <html:link
          rel="stylesheet"
          href="chrome://${config.addonRef}/content/styles/katex.min.css"
        ></html:link>
      </linkset>
    `);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._upgradeProperty("value");
    this._upgradeProperty("placeholder");
    this.init();
  }

  init(): void {
    this._textbox = this.querySelector("#inner-textbox") as XULTextBoxElement;
    if (!this._textbox) return;
    this._textbox.addEventListener("input", this._onInput);
    this._textbox.addEventListener("focus", this._onFocus);
    this._textbox.addEventListener("blur", this._onBlur);
    this._textbox.addEventListener("keydown", this._onKeyDown);
    // Initial sync (in case value was set before init).
    const textboxValue = this._textbox.value ?? "";
    if (this._value && this._value !== textboxValue) {
      this._textbox.value = this._value;
    } else {
      this._value = textboxValue;
    }
    this._updateOverlay();
  }

  set value(v: string) {
    this._value = v ?? "";
    if (this._textbox && this._textbox.value !== this._value) {
      this._textbox.value = this._value;
    }
    this._updateOverlay();
  }
  get value() {
    return this._textbox?.value ?? this._value;
  }

  set placeholder(v: string) {
    if (this._textbox) this._textbox.placeholder = v;
  }

  focus(): void {
    this._textbox?.focus();
  }

  private _onInput = (e: Event) => {
    const val = (e.target as HTMLTextAreaElement).value;
    this._value = val;
    // do not redispatch input; bubble from inner editable-text already reaches panel listener
  };

  private _onFocus = () => {
    if (this.hasAttribute("output")) {
      return;
    }
    // Input boxes: focus means the user is editing raw Markdown.
    this._editing = true;
    this._hideOverlay();
    this._setTextboxTabbable(true);
  };

  private _onBlur = () => {
    // When editing an "output" box, show preview again on blur.
    this._editing = false;
    this._updateOverlay();
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    // Exit edit mode without requiring a click elsewhere.
    this._editing = false;
    this._updateOverlay();
    this._textbox?.blur();
    e.stopPropagation();
  };

  private _updateOverlay(): void {
    // Respect user preference gate
    const enabled = (getPref("enableMathRendering") as boolean) === true;
    if (!enabled || !this._value?.trim()) {
      this._hideOverlay();
      // Normal textbox behavior when preview is disabled/empty.
      this._setTextboxTabbable(true);
      return;
    }

    const isOutput = this.hasAttribute("output");
    // For output boxes we want to show preview immediately (no need to wait for blur).
    // Editing is an explicit action.
    if (isOutput && this._editing) {
      this._hideOverlay();
      this._setTextboxTabbable(true);
      return;
    }
    if (!isOutput) {
      // For input boxes, show preview only when not editing.
      if (this._editing) {
        this._hideOverlay();
        this._setTextboxTabbable(true);
        return;
      }
    }

    this._showOverlay();
    // When preview is visible, avoid tabbing into the hidden textbox.
    this._setTextboxTabbable(false);
  }

  private _showOverlay(): void {
    const overlay = this._getOrCreateOverlay();
    const prevHtml = overlay.innerHTML;
    try {
      applyMarkdownStyle(overlay);
      syncMarkdownPreviewTypography(this._textbox ?? this, overlay);
      if (this._renderedValue !== this._value || !prevHtml) {
        overlay.innerHTML = renderMarkdownWithMath(this._value);
        this._renderedValue = this._value;
      }
    } catch {
      // Keep the last successful render to avoid clearing content mid-stream.
      overlay.innerHTML = prevHtml || this._toPlainHtml(this._value);
      this._renderedValue = null;
    }
    this.toggleAttribute("overlay-visible", true);
  }

  private _getOrCreateOverlay(): HTMLElement {
    if (this._overlay) {
      return this._overlay;
    }
    const HTML_NS = "http://www.w3.org/1999/xhtml";
    const overlay = this.ownerDocument.createElementNS(
      HTML_NS,
      "div",
    ) as unknown as HTMLElement;
    overlay.className = "math-overlay markdown-preview";
    const isOutput = this.hasAttribute("output");
    if (isOutput) {
      // Avoid stealing clicks so users can select/copy rendered content or click links.
      overlay.addEventListener("dblclick", () => {
        this._editing = true;
        this._hideOverlay();
        this._setTextboxTabbable(true);
        this._textbox?.focus();
      });
    } else {
      // Input boxes: clicking preview returns to editing mode.
      overlay.addEventListener("click", () => {
        this._hideOverlay();
        this._setTextboxTabbable(true);
        this._textbox?.focus();
      });
    }
    this._overlay = overlay;
    this.appendChild(overlay);
    return overlay;
  }

  private _toPlainHtml(text: string): string {
    const HTML_NS = "http://www.w3.org/1999/xhtml";
    const node = this.ownerDocument.createElementNS(
      HTML_NS,
      "div",
    ) as unknown as HTMLElement;
    node.textContent = text;
    return node.innerHTML.replace(/\n/g, "<br />");
  }

  private _hideOverlay(): void {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
    this._renderedValue = null;
    this.toggleAttribute("overlay-visible", false);
  }

  private _setTextboxTabbable(tabbable: boolean) {
    if (!this._textbox) return;
    if (tabbable) {
      this._textbox.setAttribute("tabindex", "0");
    } else {
      this._textbox.setAttribute("tabindex", "-1");
    }
  }

  destroy(): void {
    this._hideOverlay();
    if (this._textbox) {
      this._textbox.removeEventListener("input", this._onInput);
      this._textbox.removeEventListener("focus", this._onFocus);
      this._textbox.removeEventListener("blur", this._onBlur);
      this._textbox.removeEventListener("keydown", this._onKeyDown);
    }
  }
}
