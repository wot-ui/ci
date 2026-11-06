// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    // 路线图里的伪代码片段不是完整可解析的 TypeScript
    ignores: ['docs/**', '**/.pnpm-store/**', '**/.next/**', '**/next-env.d.ts'],
  },
  {
    files: ['apps/website/**/*.{ts,tsx}'],
    rules: {
      // Next route and React component return types are inferred from JSX.
      'ts/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['apps/website/test/**/*.test.mjs'],
    rules: {
      // The static website uses Node's built-in runner, independently of the CLI's Vitest suite.
      'test/no-import-node-test': 'off',
    },
  },
)
