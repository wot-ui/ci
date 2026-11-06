# 预览二维码

```sh
# 微信：默认生成 PNG 到 .wotci/preview/weixin.png
wotci preview -p weixin

# 指定页面、参数、场景值和备注
wotci preview -p weixin \
  --page pages/index/index \
  --query "from=ci" \
  --scene 1011 \
  --desc "PR 预览"

# 终端二维码（不落盘）
wotci preview -p weixin --qr-format terminal

# 支付宝：默认输出远程二维码 URL
wotci preview -p alipay

# 支付宝下载二维码到本地
wotci preview -p alipay --qr-output dist/preview-alipay.png
```

| 参数 | 说明 |
| --- | --- |
| `--qr-format <type>` | `terminal`、`image`、`base64`，默认 `image`（微信） |
| `--qr-output <file>` | 二维码输出路径；微信缺省 `.wotci/preview/weixin.png`，支付宝传入后会下载 |
| `--page <path>` | 预览页面路径 |
| `--page-query <str>` | 支付宝页面参数 |
| `--query <str>` | 微信 `searchQuery` / 支付宝全局 `query` |
| `--scene <value>` | 场景值；微信要求整数 |
| `--desc <text>` | 微信预览备注 |
| `--robot <1-30>` | 指定 CI 机器人 |

平台差异：

- **微信**：支持 `terminal` / `image` / `base64`；`image` 返回本地文件路径，`base64` 会把内容读入结果
- **支付宝**：返回远程 `qrcodeUrl`；传 `--qr-output` 时下载到本地
- **钉钉**：SDK 未暴露预览能力，返回明确的不支持错误
