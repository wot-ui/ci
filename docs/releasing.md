# CLI 发布流程

本仓库发布 `@wot-ui/ci` npm 包和对应 GitHub Release。GitHub Action 已独立到 [wot-ui/ci-action](https://github.com/wot-ui/ci-action)，使用自己的版本、CI、Release 和 Marketplace 条目。

## 发布 npm 包

```sh
pnpm release
```

`bumpp` 更新版本、提交、创建精确标签并推送。`Release` 工作流依次执行：

1. 检查标签与 `package.json.version` 一致，执行 lint、类型、构建和测试。
2. 通过 OIDC trusted publishing 发布 npm 包。
3. 按明确的 tag 区间生成并发布 GitHub Release。

CLI 发布无需等待 Marketplace 操作。`changelogithub.config.json` 不再设置 `draft: true`；旧 `Marketplace Listing` 工作流已移除，不再移动旧 Action 的 `v0` 标签。

## 旧 Action 兼容

- `wot-ui/ci@v0` 保留在拆仓前的 `v0.5.3` 提交；既有精确标签不重写。
- `main` 已移除 `action.yml`、Action 专用脚本和测试。历史标签仍保存完整实现，旧调用不受影响；`wot-ui/ci@main` 不再作为 Action 入口。
- 本仓库工作流调用独立 Action，并通过本地 CLI 入口绑定本次构建的产物，继续验证尚未发布的核心版本。
- 旧入口的浮动引用默认选择 npm `latest`；需要固定 CLI 时仍须指定 `package-version` 或锁定项目本地依赖。
- 原 Marketplace 条目 `wot-ui-ci` 已下架，移除核心仓库首页的 Action 推广提示；历史标签和 Release 保留，既有标签引用仍可使用。新入口使用 `wot-ui/ci-action@v1`，Marketplace 条目为 `wot-ui-ci-action`。

独立 Action 的默认 CLI 版本由其 `package.json.wotciVersion` 明确记录；核心包更新不会自动修改 Action 默认版本。

## 独立 Action 发布

请按 [Action 发布指南](https://github.com/wot-ui/ci-action#维护与发布) 操作：测试通过后创建 Action 标签，发布 draft 并勾选 Marketplace，稳定发布后再更新其主版本标签。

## 本地检查

```sh
pnpm verify:release vX.Y.Z
pnpm lint
pnpm typecheck:all
pnpm test:run
pnpm build
```

根 README 保留 CI 工具定位和接入入口；Action 详细文档在独立仓库维护，文档站保留指向它的入口。
