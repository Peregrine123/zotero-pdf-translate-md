# Task-001：翻译输出框支持 Markdown + LaTeX（$...$/$$...$$）渲染预览

- Status: in-progress
- Date: 2026-01-24
- Scope: 所有“翻译结果/输出框”（侧栏/独立窗口、Reader 选中文本弹窗、extra engines 输出框）
- Related files (现状定位):
  - 侧栏/独立窗口主面板：`src/elements/panel.ts`
  - extra engines 面板构建与更新：`src/modules/tabpanel.ts`
  - Reader 选中文本弹窗输出：`src/modules/popup.ts`
  - 现有数学渲染（KaTeX + overlay 思路）：`src/utils/mathRenderer.ts`、`src/elements/mathTextbox.ts`
  - 偏好项：`addon/prefs.js`（`enableMathRendering`）与 `addon/chrome/content/preferences.xhtml`

## 任务描述

目前插件的翻译输出框主要以纯文本展示（`editable-text`/`textarea`），对翻译服务返回的 Markdown 内容（列表、标题、代码块等）无法做“可读的排版预览”；同时我们希望在译文中稳定支持 LaTeX 数学公式：

- 行内公式：`$ ... $`
- 块级公式：`$$ ... $$`

目标是在不改变“原始文本可编辑”的前提下，为**所有翻译输出框**增加“渲染预览”能力：

- 编辑态：仍然编辑原始 Markdown 文本（不把渲染后的 HTML 写回文本）
- 预览态：失焦/只读时显示渲染后的效果；点击预览可回到编辑态
- Markdown：尽量覆盖常用语法（标题/列表/引用/代码块/链接/图片等）；其中图片需考虑隐私/安全（建议默认不加载远程图片或提供开关）

非目标（本任务不做/可后续扩展）：

- 不把渲染后的 HTML 持久化到条目字段/注释中（仍存储原始文本）
- 不允许 Markdown 中的原生 HTML 执行（安全原因）

## 过程设计

### 1) 渲染管线（Markdown + Math）

建议新增统一的渲染入口（示意）：

- `renderMarkdownWithMath(doc, text) => safeHtml`

实现思路（可选其一，需保证安全与可维护）：

1. **Markdown 解析器方案（推荐）**
   - 引入 Markdown 解析库（如 `markdown-it`），配置 `html: false` 禁止原生 HTML
   - 数学公式：
     - 优先使用 markdown-it 的数学扩展（KaTeX 渲染），统一处理 `$...$` 与 `$$...$$`
     - 或复用现有 `src/utils/mathRenderer.ts` 的正则能力，以“占位符”方式在 Markdown 前后做替换
   - 链接安全：只允许 `http(s):`、`mailto:` 等白名单协议；阻止 `javascript:` 等
2. **占位符 + 现有 KaTeX 复用（依赖最少）**
   - 先从原始文本中提取数学片段（`$...$`/`$$...$$`/`\\(...\\)`/`\\[...\\]`），替换成占位符
   - 对剩余文本做 Markdown 渲染（仅生成安全子集）
   - 将占位符替换为 `katex.renderToString(...)` 的输出 HTML

注意点：

- 解析触发频率：建议“失焦时渲染”或“停止输入后 debounce 渲染”，避免长文本卡顿
- 错误兜底：Markdown/KaTeX 渲染失败时回退到纯文本（类似 `renderMathInText` 的策略）

### 2) UI 交互与组件复用

现有 `math-textbox` 已实现“输入框 + overlay 预览”的交互（聚焦隐藏 overlay，失焦显示 overlay）。建议扩展为可复用的“富文本预览输入框”，以覆盖所有输出场景：

- 方案 A：扩展 `MathTextboxElement` → `RichTextboxElement`
  - overlay 不再仅渲染数学，而是渲染 Markdown + Math
  - 通过 preference 控制开启（可以沿用/扩展 `enableMathRendering` 的含义与文案）
- 方案 B：新增 `markdown-textbox`（更清晰的语义）
  - `translator-plugin-panel` 的 `result-text`/extra engines 输出框按条件替换为该组件

交互要求（验收口径）：

- 点击预览区域可进入编辑态
- 不影响原有复制按钮（复制仍以原始文本为准）
- 与现有 `enableMathRendering` 行为保持一致或可平滑升级（避免突然改变默认显示）

### 3) 覆盖点清单（必须覆盖）

1. **侧栏/独立窗口：主翻译面板输出框**
   - 位置：`src/elements/panel.ts` 的 `result-text`（以及 `rawResultOrder` 反转逻辑）
   - 当前已可在 `enableMathRendering` 下使用 `math-textbox`；需要扩展到 Markdown + inline/block math
2. **Reader 选中文本弹窗：输出区域**
   - 位置：`src/modules/popup.ts`，目前使用 `textarea`
   - 建议做法：
     - 保留 `textarea` 作为编辑态
     - 增加一个预览 `div`（或 overlay）作为渲染态，并按焦点/状态切换显示
3. **extra engines 输出框**
   - 位置：`src/modules/tabpanel.ts`，当前创建 `editable-text`，并在 `updateExtraPanel(...)` 里用选择器 `.${task.service}+editable-text` 更新内容
   - 若替换成新组件，需要同步调整更新逻辑（选择器/写值方式）

### 4) 偏好项与文案

当前已有 `enableMathRendering`（UI 文案为“在翻译中渲染 LaTeX 公式”）。本任务建议：

- 将该选项升级为“渲染 Markdown + LaTeX（$...$/$$...$$）预览”
- 或新增 `enableMarkdownRendering`（更细粒度，但需要考虑与旧选项的组合与默认值）

无论采取哪种方式，都需要明确：

- 默认是否开启（建议默认关闭，避免改变现有用户预期）
- 开启后哪些区域生效（本任务要求：所有输出框都生效）

### 5) 风险与待确认

- 安全：Markdown 转 HTML 必须禁用原生 HTML 并做协议白名单，避免 XSS/钓鱼链接
- 性能：长文本/多面板同时刷新时，渲染频率与缓存策略需要设计（例如按 taskId + text hash 缓存）
- 公式歧义：`$` 在金额/代码中可能误触发；需要定义转义规则（如 `\\$`）并在文档/提示中说明

## 结果验证

### 验收标准（Checklist）

- [ ] 侧栏/独立窗口的翻译输出框：Markdown 渲染正常，`$...$`/`$$...$$` 公式可渲染
- [ ] Reader 选中文本弹窗输出：同样支持 Markdown + inline/block math
- [ ] extra engines 输出框：同样支持 Markdown + inline/block math
- [ ] 编辑态与预览态切换符合预期（失焦预览、点击预览进入编辑）
- [ ] 复制功能仍复制原始文本（不复制 HTML）
- [ ] 禁止 `javascript:` 等危险链接；渲染失败时回退到纯文本且不报错阻塞
- [x] 添加 `renderMarkdownWithMath` 的单元测试并通过（`npm test`）

### 手工用例（建议直接粘贴到译文/输出框）

````md
# 标题

- 列表 1：行内公式 $a^2+b^2=c^2$
- 列表 2：代码 `inline code`

```js
console.log("code block");
```

块级公式：

$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$

链接：[Zotero](https://www.zotero.org/)
````

### 复现/验证命令

```bash
npm ci
npm test
npm run build
# 安装 build/*.xpi 到 Zotero 进行手工验证
```

### Progress log

- 2026-01-24: Implemented Markdown + KaTeX rendering pipeline + preview overlays; verified `npm test` and `npm run build`.
