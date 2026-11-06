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

CLI 发布无需等待 Marketplace 操作。

## 与独立 Action 的关系

本仓库工作流调用 `wot-ui/ci-action@v2.0.0`，通过本地 CLI 入口绑定本次构建的产物，验证尚未发布的核心版本。

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
