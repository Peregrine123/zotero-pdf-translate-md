# Features 任务索引与规范

本目录用于记录需要留痕的功能设计/改动任务（以“可复现、可验证”为目标），避免口头讨论丢失上下文。

## 文件命名

- 路径：`docs/features/NNN-short-slug.md`
- `NNN`：三位递增编号（001、002…），取当前目录最大编号 + 1
- `short-slug`：英文小写 + `-`，避免空格/中文，便于跨平台与检索

## 内容模板（三段式）

每个任务至少包含：

- 标题行：`# Task-NNN：<一句话标题>`
- 元信息（建议放在标题下方）：`Status`、`Date`、`Scope/Files`、`Repro/Verify`、`Output/Evidence`
- 正文三段：
  - `## 任务描述`：目标、范围、口径（baseline/对比/兼容性）
  - `## 过程设计`：关键方案、开关/参数、依赖与风险点、回滚策略
  - `## 结果验证`：验收标准、验证步骤、产物位置（例如 `build/*.xpi`）与截图/日志

## 索引

### 进行中

- `docs/features/001-translation-output-markdown-math.md` - 翻译输出框支持 Markdown + LaTeX（$...$/$$...$$）预览（idea）

### 已完成

- <暂无>
