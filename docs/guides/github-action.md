# GitHub Action

GitHub Action 已独立维护在 [wot-ui/ci-action](https://github.com/wot-ui/ci-action)。本仓库继续提供 CLI、JS API、Vite 插件与平台实现。

## 快速接入

在 workflow 完成构建后添加：

```yaml
- uses: wot-ui/ci-action@v2
  with:
    platform: weixin
    project-path: dist/build/mp-weixin
    appid: ${{ secrets.WEIXIN_APPID }}
    private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}
```

产物目录按实际项目调整，上传版本默认读取项目的 `package.json.version`。微信上传前需在公众平台生成上传私钥并配置 CI IP 白名单。

- [完整工作流、三平台接入、预览与归档](https://github.com/wot-ui/ci-action#使用示例)
- [全部 inputs 与平台扩展参数](https://github.com/wot-ui/ci-action#参数参考)

## 复用配置文件

v2 支持 `upload`、`preview`、`doctor`，已有项目配置可通过 `config` 复用。多平台上传可指定 `platform: weixin,alipay`，详见 [配置文件示例](https://github.com/wot-ui/ci-action#已有配置和多平台)。`release` 等发布编排命令使用独立 CLI 步骤。

## 版本规则

Action 与 CLI 独立版本管理。`wot-ui/ci-action@v2.0.0` 默认使用经过测试的 CLI `0.5.3`；项目内已安装 CLI 时优先使用本地版本。

核心工作流通过独立 Action 验证本次构建的 CLI；npm 包与 Action 独立发布。
