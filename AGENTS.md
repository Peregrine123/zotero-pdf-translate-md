# Repository Guidelines

## 项目结构与模块组织

- `src/`: 插件 TypeScript 源码（入口：`src/index.ts`）。
- `src/modules/`: 功能模块（UI、Reader 集成、菜单、通知、翻译服务等）。
- `src/modules/services/`: 各翻译服务实现（模板：`_template.ts`）。
- `addon/`: Zotero 插件资源（manifest/bootstrap、locale、XUL/XHTML、prefs 等）。
- `typings/`: Zotero / toolkit 相关类型声明（`.d.ts`）。
- `build/`: 构建产物（自动生成）。最终安装包输出为 `build/*.xpi`。
- `docs/`: 文档与截图/GIF。

## 构建、测试与开发命令

本仓库使用 npm（已提供 lockfile）。

```bash
npm ci
npm run build
npm run start
npm run lint
```

- `npm run start`: 本地开发启动（`zotero-plugin serve`，通常依赖 `.env` 里的 Zotero 路径/配置）。
- `npm run build`: 先类型检查（`tsc --noEmit`），再用 `zotero-plugin build` 生成 XPI。
- `npm run lint`: 运行 Prettier 格式化并自动修复 ESLint 问题。
- `npm run release`: 使用 `zotero-plugin release` 生成发布构建（偏 CI/发版流程）。

## 代码风格与命名约定

- 格式化：Prettier（`tabWidth: 2`、`printWidth: 80`、`endOfLine: lf`）；提交/PR 前建议先跑 `npm run lint`。
- 代码检查：ESLint + `typescript-eslint`。多数文件禁止直接使用 `window`/`document`，请改用 `Zotero.getMainWindow()` / `Zotero.getMainWindow().document`。
- 命名：保持模块/服务 `id` 稳定，文件名沿用现有模式（如 `src/modules/services/<serviceId>.ts`）。

## 测试指南

- 当前没有自动化测试（`npm test` 会直接报错退出）。
- 最低手工验证：`npm run build` 后，将生成的 `build/*.xpi` 安装到 Zotero，并走一遍受影响的 UI/翻译流程做冒烟测试。

## 常见贡献场景（示例）

新增翻译服务：

1. 复制 `src/modules/services/_template.ts` 为 `src/modules/services/<serviceId>.ts` 并实现必填字段。
2. 在 `src/modules/services/index.ts` 注册该 service。
3. 增加对应的本地化文案：`addon/locale/<lang>/addon.ftl`（如 `service.<serviceId>`）。
4. `npm run build` 并在 Zotero 中安装 `build/*.xpi` 做手工验证。

## Commit 与 Pull Request 规范

- Commit 信息遵循 Conventional Commits（历史示例：`feat: ...`、`fix: ...`、`chore(publish): release vX.Y.Z`）。
- PR 至少包含：
  - 修改内容/动机 + 关联 Issue（可用 `Fixes #123`）。
  - 复现/验证步骤；涉及 UI 的请附截图或 GIF。
  - 新增用户可见文案时同步更新 locale（`addon/locale/<lang>/addon.ftl` 等）。

## 安全与配置提示

- 本地开发请将 `.env.example` 复制为 `.env` 并填写 `ZOTERO_PLUGIN_*` 路径；不要提交真实 token/密钥。
