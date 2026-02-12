# Issues 索引与规范

本目录用于记录 bug/报错/兼容性问题等（以“可复现、可追踪、可验证”为目标）。

## 文件命名

- 路径：`docs/issue/NNN-short-slug.md`
- `NNN`：三位递增编号（001、002…），取当前目录最大编号 + 1
- `short-slug`：英文小写 + `-`，避免空格/中文，便于跨平台与检索

## 内容模板（建议）

每个 Issue 至少包含：

- 标题行：`# Issue-NNN：<一句话标题>`
- 元信息：`Status`、`Date`、可选 `Owner`、`Scope`、可选 `Commit`
- 正文建议包含：
  - `## 现象/背景`
  - `## 复现步骤`
  - `## 预期结果 / 实际结果`
  - `## 根因分析`（未知则写假设 + 证据缺口）
  - `## 修复方案（计划）`（只写计划，不在 issue 文档里实现修复）
  - `## 验证`（未来如何验证、哪些命令、哪些手工用例）

## 索引

### Open

- `docs/issue/001-zotero7-incompatible-strict-min-version.md` - Zotero 7.0.32 安装本地 build XPI 提示“不兼容”（manifest strict_min_version=7.9.9）（in-progress）
- `docs/issue/002-sidebar-flicker-and-clear-with-formula.md` - 固定侧边栏含公式时流式翻译闪烁后清空（in-progress）
- `docs/issue/003-floating-window-style-not-unified-with-sidebar.md` - 悬浮翻译窗字体与 LaTeX 样式未与固定侧边栏统一（in-progress）

### Done

- <暂无>
