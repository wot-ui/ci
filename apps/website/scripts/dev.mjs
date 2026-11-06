import { watch } from 'node:fs'
import path from 'node:path'
import { build, repoRoot, siteRoot } from './build.mjs'
import { startServer } from './serve.mjs'

await build()
startServer()
let timer
let building = false
let pending = false
async function rebuild() {
  if (building) {
    pending = true
    return
  }
  building = true
  try {
    await build()
    console.log('Updated. Refresh the browser to see changes.')
  }
  catch (error) { console.error(error) }
  finally {
    building = false
    if (pending) {
      pending = false
      await rebuild()
    }
  }
}
for (const target of ['README.md', 'package.json', 'docs', 'apps/website/public']) {
  watch(path.join(repoRoot, target), { recursive: true }, () => {
    clearTimeout(timer)
    timer = setTimeout(rebuild, 100)
  })
}
console.log(`Watching content and assets in ${siteRoot}. Restart after editing build scripts.`)
