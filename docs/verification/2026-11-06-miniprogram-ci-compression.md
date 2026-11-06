# 微信编译包体积验证（2026-11-06）

## 原因与依赖选择

`miniprogram-ci@^2.1.31` 在 npm `latest` 仍为 2.1.31 时解析到 2.1.31。微信 SDK 的 [更新记录](https://github.com/wechat-miniprogram/miniprogram-ci-dist)说明 2.1.39 修复了「ci 编译 setting 不生效的问题」；2.1.48 当前位于 npm `beta` 标签。`pnpm-workspace.yaml` 的 catalog 因此精确固定到验证过的 2.1.48；发布时 `catalog:` 会展开为精确版本，避免消费者的 npm 安装再次落到 2.1.31。

## 离线复现

输入为同一份 Wot UI `dist/build/mp-weixin` 构建产物，`project.config.json` 中的 appid 与 `app.json` 分包路径保持原样。对三个 SDK 版本调用 `getCompiledResult`，均传入 `{ useProjectConfig: true, minifyJS: true, minifyWXML: true, minifyWXSS: true, minify: true }`。使用合成私钥和本地项目属性避免真实上传；主包字节数为编译结果中排除 `subPages/` 后的文件内容之和，JS 字节数为其中 `.js` 文件之和。

| SDK | 主包字节数 | 主包 JS 字节数 | `common/vendor.js` 字节数 |
| --- | ---: | ---: | ---: |
| 2.1.31 | 2,533,770 | 1,863,338 | 418,604 |
| 2.1.39 | 1,915,741 | 1,245,309 | 276,333 |
| 2.1.48 | 1,903,862 | 1,233,430 | 274,288 |

2.1.48 的主包比 2.1.31 小 629,908 字节，低于 2,048 KiB（2,097,152 字节）的主包限制。离线结果只能证明这份产物的本地编译体积；微信平台的真实上传仍需要有效私钥及平台验收。

SDK 2.1.48 在模块和 TS 配置加载时会向 stdout 写初始化日志，因此 CLI 入口在 `--json` 执行期间将这类日志转到 stderr，并单独把结构化结果写入 stdout。Action/CLI 的真实进程测试和独立消费者安装验证覆盖了这一点。

打包后的 npm tarball 声明 `miniprogram-ci: 2.1.48`，独立消费者实际安装到 2.1.48；`verify-capabilities` 在全新消费者目录中通过 50/50 项检查。

## 发布与后续升级

2.1.48 是 beta 标签版本。固定版本可防止意外升级，但 SDK 仍可能存在未在本地编译中覆盖的上传、预览或其他项目兼容性问题。合并后发布新的 `@wot-ui/ci` 版本，待 Wot UI 切换到新 Action/CLI 版本后移除临时 npm override。后续微信 SDK 稳定版包含此修复时，再对相同产物重复包体积验证并测试上传/预览，确认后替换精确版本。
