# GitHub Action

GitHub Action 已独立维护在 [wot-ui/ci-action](https://github.com/wot-ui/ci-action)。本仓库继续提供 CLI、JS API、Vite 插件与平台实现。

## 快速接入

在 workflow 完成构建后添加：

```yaml
- uses: wot-ui/ci-action@v1
  with:
    platform: weixin
    project-path: dist/build/mp-weixin
    appid: ${{ secrets.WEIXIN_APPID }}
    private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}
```

产物目录按实际项目调整，上传版本默认读取项目的 `package.json.version`。微信上传前需在公众平台生成上传私钥并配置 CI IP 白名单。

- [完整工作流、三平台接入、预览与归档](https://github.com/wot-ui/ci-action/blob/main/docs/usage.md)
- [全部 inputs 与平台扩展参数](https://github.com/wot-ui/ci-action/blob/main/docs/inputs.md)
- [迁移指南](https://github.com/wot-ui/ci-action/blob/main/docs/migration.md)

## 复用配置文件

独立 Action 保留 `config`、`command`、`platform` 等原有 inputs，已有项目配置不需要重写。多平台发布仍可使用 `command: release` 和项目的 `wotci.config.ts`，详见 [独立 Action 配置文件示例](https://github.com/wot-ui/ci-action/blob/main/docs/usage.md#复用配置文件)。

## 版本与兼容

Action 与 CLI 独立版本管理。`wot-ui/ci-action@v1.0.0` 默认使用经过测试的 CLI `0.5.3`，可通过 `package-version` 指定其他 CLI 版本；项目内已安装 CLI 时优先使用本地版本。

旧 `wot-ui/ci@v0` 保留在拆分前的 `v0.5.3` 提交，旧精确标签不重写。旧入口继续使用原来的 CLI 选择规则：有本地 CLI 时优先本地，否则显式 `package-version` 优先；精确 Action 标签映射为同版本 CLI，`@v0` 等浮动引用回退到 `latest`。因此固定旧 Action 并不自动固定 CLI，如需固定运行版本应显式设置 `package-version` 或锁定本地依赖。

新功能与后续 Action 发布在独立仓库维护。核心仓库保留原 Action 实现，用于兼容旧入口与验证尚未发布的 CLI；新的 npm 发布不再更新旧 `v0` 标签或要求 Marketplace 上架。
