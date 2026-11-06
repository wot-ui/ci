#!/usr/bin/env node

import process from 'node:process'
import { redirectStdoutToStderr } from './utils/stdout'

// miniprogram-ci prints during module and config initialization. In JSON mode,
// keep SDK logs on stderr throughout the run while writing the result to the
// original stdout stream.
async function main(): Promise<void> {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout)
  const execute = async (json: boolean): Promise<number> => {
    const { runCli } = await import('./cli')
    return runCli(undefined, json ? { stdout: message => originalStdoutWrite(message) } : {})
  }
  const exitCode = process.argv.includes('--json')
    ? await redirectStdoutToStderr(() => execute(true))
    : await execute(false)
  process.exitCode = exitCode

  // 上传 SDK 可能残留 forked 子进程或句柄，等待输出刷盘后显式退出
  await Promise.all([flush(process.stdout), flush(process.stderr)])
  process.exit(exitCode)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })

function flush(stream: NodeJS.WriteStream): Promise<void> {
  return new Promise((resolve) => {
    if (stream.destroyed) {
      resolve()
      return
    }

    const done = (): void => resolve()
    stream.once('error', done)

    try {
      stream.write('', done)
    }
    catch {
      done()
    }
  })
}
