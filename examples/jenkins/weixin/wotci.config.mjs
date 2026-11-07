import { defineConfig } from '@wot-ui/ci'

export default defineConfig(({ env, packageJson }) => ({
  version: env.WOTCI_VERSION?.trim() || packageJson?.version,
  desc: env.WOTCI_DESC?.trim() || packageJson?.description,
  weixin: {
    appid: env.WEIXIN_APPID,
    privateKeyPath: env.WEIXIN_PRIVATE_KEY_PATH,
    projectPath: 'dist/build/mp-weixin',
    robot: 1,
    setting: {
      useProjectConfig: true,
      minifyJS: true,
      minifyWXML: true,
      minifyWXSS: true,
    },
  },
}))
