import { Arrow } from './icons'
import { Code, Tabs } from './tabs'

const terminal = `# 生成配置并按项目填写凭据与产物路径
pnpm exec wotci init

# 运行项目已有的构建命令
pnpm build

# 体检后，先预演上传计划
pnpm exec wotci doctor
pnpm exec wotci upload -p weixin --dry-run

# 确认计划，再执行上传
pnpm exec wotci upload -p weixin`

const actions = `# 新 inputs 需使用包含本次改动的 Action ref
# 项目构建完成后，无需 wotci.config.ts
- uses: wot-ui/ci@v0
  with:
    platform: weixin
    project-path: dist/build/mp-weixin
    private-key: \${{ secrets.WEIXIN_PRIVATE_KEY }}
  env:
    WEIXIN_APPID: \${{ secrets.WEIXIN_APPID }}
# 上传版本默认读取 package.json`

const api = `import { uploadMany } from '@wot-ui/ci'

// 读取项目配置，检查本地产物
const plan = await uploadMany({
  platforms: ['weixin', 'alipay'],
  dryRun: true,
})

console.log(plan.ok)
console.log(plan.versionResolution)`

function TabLabel({ text }: { text: string }) {
  return (
    <>
      {text}
      <Arrow />
    </>
  )
}

export function IntegrationExamples() {
  return (
    <Tabs
      label="接入方式"
      className="integration-layout"
      items={[
        { id: 'example-terminal', label: <TabLabel text="终端命令" />, content: <Code text={terminal} label="TERMINAL" /> },
        { id: 'example-actions', label: <TabLabel text="GitHub Actions" />, content: <Code text={actions} label="WORKFLOW.YML · 步骤片段" /> },
        { id: 'example-api', label: <TabLabel text="JavaScript API" />, content: <Code text={api} label="JAVASCRIPT · ESM" /> },
      ]}
    >
      <p>
        凭据通过环境变量或 CI Secrets 注入。
        <br />
        构建完成后，由 Wot CI 接手上传。
      </p>
    </Tabs>
  )
}
