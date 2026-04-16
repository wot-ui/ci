import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

let tempRoot = ''

afterEach(async () => {
  vi.resetModules()
  vi.doUnmock('miniprogram-ci')

  if (tempRoot)
    await rm(tempRoot, { force: true, recursive: true })

  tempRoot = ''
})

describe('weixin interop', () => {
  it('supports miniprogram-ci default export interop', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'wotci-weixin-'))
    await writeFile(path.join(tempRoot, 'private.key'), 'secret')

    const upload = vi.fn(async () => ({
      subPackageInfo: [{ name: '__FULL__', size: 1024 }],
    }))
    const Project = vi.fn(function Project(this: Record<string, unknown>, options: Record<string, unknown>) {
      this.options = options
    })

    vi.doMock('miniprogram-ci', () => ({
      default: {
        Project,
        upload,
      },
    }))

    const { uploadWeixin } = await import('../src/platforms/weixin')
    const result = await uploadWeixin({
      version: '1.0.0',
      weixin: {
        appid: 'wx123',
        privateKeyPath: 'private.key',
        projectPath: 'dist/weixin',
      },
    }, { cwd: tempRoot })

    expect(Project).toHaveBeenCalledWith(expect.objectContaining({
      appid: 'wx123',
      privateKeyPath: path.join(tempRoot, 'private.key'),
      projectPath: path.join(tempRoot, 'dist/weixin'),
      type: 'miniProgram',
    }))
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({
      project: expect.any(Project),
      version: '1.0.0',
    }))
    expect(result.platform).toBe('weixin')
  })
})
