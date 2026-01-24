# Issue-001：Zotero 7.0.32 安装本地 build XPI 提示“不兼容”（manifest strict_min_version=7.9.9）

- Status: in-progress
- Date: 2026-01-24
- Scope: 插件安装/版本兼容性（manifest 版本范围）
- Env:
  - Zotero: 7.0.32
  - Package: 本地 `npm run build` 生成的 `build/*.xpi`

## 现象/背景

在 Zotero 7.0.32 中安装本地构建的 `build/*.xpi` 时，Zotero 弹出提示“版本不兼容/不兼容”（无更多细节信息），导致插件无法安装。

## 复现步骤

1. 使用 Zotero 7.0.32
2. 在本仓库执行：

```bash
npm ci
npm run build
```

3. 在 Zotero 中尝试安装 `build/*.xpi`
4. 观察到提示“不兼容”，安装失败

（可选）解包 `build/*.xpi`，检查其中的 `manifest.json`：

```bash
unzip -p build/*.xpi manifest.json | sed -n '1,120p'
```

## 预期结果 / 实际结果

- 预期：在 Zotero 7.0.32 能正常安装（或至少给出明确的不兼容原因/版本范围说明）
- 实际：提示“不兼容”并阻止安装

## 根因分析（初步）

本仓库当前 `addon/manifest.json` 写死的兼容范围为：

```json
{
  "applications": {
    "zotero": {
      "strict_min_version": "7.9.9",
      "strict_max_version": "8.0.*"
    }
  }
}
```

因此 Zotero 7.0.32（< 7.9.9）会被直接判定为不满足 `strict_min_version`，从而出现“不兼容”提示。

补充线索：仓库根目录的 `update.json` / `update.rdf` 中出现过 `7.0.0-beta.70` ~ `7.0.*` 的范围，和当前 `addon/manifest.json` 不一致；但本问题是“本地 build 的 XPI 安装失败”，主要由 XPI 内 `manifest.json` 决定。

## 修复方案（计划）

目标：明确插件期望支持的 Zotero 版本矩阵，并使 `manifest.json` 的版本范围与之匹配。

- [x] 确认产品要求：需要支持 Zotero 7.0.x（例如 7.0.32）
- [x] 若需要支持 7.0.x：
  - [x] 调整 `addon/manifest.json` 的 `strict_min_version`（本次采用 `7.0.0`，以覆盖 Zotero 7.0.32）
  - [x] 同步更新发布用 update metadata（如 `update.json` / `update.rdf`）的版本范围，避免 manifest 与 update 信息不一致
- [ ] 若不需要支持 7.0.x：
  - [ ] 在 README/Release notes/下载页明确标注最低支持版本（例如 “Zotero >= 7.9.9”）
  - [ ] 给出用户升级 Zotero 的建议路径
- [x] 增加 CI/构建期校验：确保 `strict_min_version` 与文档/发布配置一致（避免回归）

## 验证

- [ ] 在 Zotero 7.0.32 上验证安装：`npm run build` 后安装 `build/*.xpi` 不再提示“不兼容”
- [ ] 若维护多个版本范围：在最低支持版本和当前最新版本上各做一次安装/基本功能冒烟测试

## Progress log

- 2026-01-24:
  - Updated compatibility range to `strict_min_version=7.0.0` and added `npm run check:compat`.
  - Verified: `npm run check:compat`, `npm test`, `npm run build`.
  - Verified built XPI manifest shows `strict_min_version: "7.0.0"` and `strict_max_version: "8.0.*"`.
