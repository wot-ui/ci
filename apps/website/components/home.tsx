import Link from 'next/link'
import { IntegrationExamples } from './integration'
import { InstallCommand } from './tabs'

export function HomePage() {
  return (
    <main id="main">
      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot">
            </span>
            THE MINI PROGRAM DELIVERY TOOLKIT
          </div>
          <h1>
            把小程序发布，
            <br />
            交给
            <span className="hero-emphasis">
              流水线。
            </span>
          </h1>
          <p className="hero-description">
            从本地构建到多平台上传，让每一次发布
            <br className="desktop-break" />
            都有配置可循、有结果可查。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/docs/getting-started/">
              开始接入
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6">
                </path>
              </svg>
            </Link>
            <Link className="text-link" href="/docs/integration/">
              接入 GitHub Actions
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 17 17 7M7 7h10v10">
                </path>
              </svg>
            </Link>
          </div>
          <InstallCommand />
          <p className="hero-meta">
            <span>
              Node.js ≥ 20
            </span>
            <i>
            </i>
            <span>
              CLI / JS API
            </span>
            <i>
            </i>
            <span>
              开源 · MIT
            </span>
          </p>
        </div>
        <div className="pipeline-illustration" aria-label="发布工作流示意，并非实时执行状态">
          <div className="pipeline-caption">
            <span>
              <i className="status-dot">
              </i>
              RELEASE WORKFLOW
            </span>
            <span className="example-label">
              流程示意
            </span>
          </div>
          <div className="pipeline-body">
            <div className="pipeline-file">
              <span className="file-symbol">
                {'{ }'}
              </span>
              <div>
                <strong>
                  wotci.config.ts
                </strong>
                <small>
                  一份配置，连接你的发布流程
                </small>
              </div>
              <span className="file-tag">
                TS
              </span>
            </div>
            <div className="pipeline-track">
              <div className="track-step">
                <span className="step-node">
                  01
                </span>
                <div>
                  <strong>
                    检查配置
                  </strong>
                  <code>
                    wotci doctor
                  </code>
                </div>
                <span className="step-note">
                  发现问题
                </span>
              </div>
              <div className="track-step">
                <span className="step-node">
                  02
                </span>
                <div>
                  <strong>
                    构建产物
                  </strong>
                  <code>
                    your build command
                  </code>
                </div>
                <span className="step-note">
                  复用现有构建
                </span>
              </div>
              <div className="track-step">
                <span className="step-node green-node">
                  03
                </span>
                <div>
                  <strong>
                    上传与交付
                  </strong>
                  <code>
                    wotci upload --all
                  </code>
                </div>
                <span className="step-note">
                  按目标执行
                </span>
              </div>
            </div>
            <div className="destination-row">
              <span>
                <i className="platform-dot weixin">
                </i>
                微信
              </span>
              <span>
                <i className="platform-dot alipay">
                </i>
                支付宝
              </span>
              <span>
                <i className="platform-dot dingtalk">
                </i>
                钉钉
              </span>
            </div>
          </div>
          <div className="pipeline-output">
            <span>
              OUTPUT
            </span>
            <div>
              JSON 结果
              <i>
                /
              </i>
              Step Summary
              <i>
                /
              </i>
              发布历史
              <sup>
                *
              </sup>
            </div>
          </div>
          <p className="pipeline-footnote">
            * 历史记录由 release 编排生成。上传不等于提审或上架。
          </p>
        </div>
      </section>
      <section className="entry-strip shell" aria-label="文档快捷入口">
        <span className="strip-label">
          接上你已有的工具链
        </span>
        <Link href="/docs/commands/">
          终端命令
          <span>
            CLI
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6">
            </path>
          </svg>
        </Link>
        <Link href="/docs/integration/">
          自动化流水线
          <span>
            ACTIONS
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6">
            </path>
          </svg>
        </Link>
        <Link href="/docs/api/">
          代码集成
          <span>
            JS / TS
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6">
            </path>
          </svg>
        </Link>
      </section>
      <section className="section shell workflow-section">
        <div className="section-intro">
          <div>
            <span className="eyebrow">
              01 / BUILT FOR REPEATABILITY
            </span>
            <h2>
              少一点手动操作，
              <br />
              多一点发布确定性。
            </h2>
          </div>
          <p>
            上传只是其中一步。
            <br />
            配置、验证与结果，都应成为流程的一部分。
          </p>
        </div>
        <div className="feature-grid">
          <article>
            <div className="feature-number">
              01
              <span>
                CONFIGURE
              </span>
            </div>
            <h3>
              配置跟着项目走
            </h3>
            <p>
              JS / TS 配置、环境变量与配置工厂。复用同一套入口，为不同平台提供各自的参数。
            </p>
            <Link href="/docs/configuration/">
              查看配置方式
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6">
                </path>
              </svg>
            </Link>
          </article>
          <article>
            <div className="feature-number">
              02
              <span>
                VALIDATE
              </span>
            </div>
            <h3>
              先检查，再执行
            </h3>
            <p>
              用 doctor 发现配置问题，用 dry-run 检查本地上传计划。真实平台验证单独记录。
            </p>
            <Link href="/docs/diagnostics/">
              了解诊断工具
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6">
                </path>
              </svg>
            </Link>
          </article>
          <article>
            <div className="feature-number">
              03
              <span>
                TRACE
              </span>
            </div>
            <h3>
              让结果有据可查
            </h3>
            <p>
              JSON 接入后续步骤，Markdown 写入构建摘要。版本来源、查询状态与回退原因随结果保留。
            </p>
            <Link href="/docs/upload/">
              读取执行结果
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6">
                </path>
              </svg>
            </Link>
          </article>
        </div>
      </section>
      <section className="platform-section">
        <div className="shell platform-layout">
          <div>
            <span className="eyebrow">
              02 / PLATFORM CAPABILITIES
            </span>
            <h2>
              统一入口，
              <br />
              尊重平台差异。
            </h2>
            <p>
              用相同的命令组织发布，
              <br />
              用明确的边界选择能力。
            </p>
            <Link className="text-link" href="/docs/support/">
              完整支持与验证矩阵
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6">
                </path>
              </svg>
            </Link>
          </div>
          <div className="platform-table">
            <div className="platform-table-head">
              <span>
                能力 / 平台
              </span>
              <strong>
                微信
              </strong>
              <strong>
                支付宝
              </strong>
              <strong>
                钉钉
              </strong>
            </div>
            <div>
              <span>
                代码上传
              </span>
              <span className="available">
                支持
              </span>
              <span className="available">
                支持
              </span>
              <span className="available">
                支持
              </span>
            </div>
            <div>
              <span>
                预览二维码
              </span>
              <span className="available">
                支持
              </span>
              <span className="available">
                支持
              </span>
              <span className="unavailable">
                不支持
              </span>
            </div>
            <div>
              <span>
                最新版本查询
              </span>
              <span className="limited">
                仅插件
              </span>
              <span className="available">
                支持
              </span>
              <span className="unavailable">
                不支持
              </span>
            </div>
            <p>
              此处说明已实现能力；真实平台验收状态请查看支持矩阵。
            </p>
          </div>
        </div>
      </section>
      <section className="section shell integration-section">
        <div className="section-intro">
          <div>
            <span className="eyebrow">
              03 / FITS YOUR WORKFLOW
            </span>
            <h2>
              接入现有流程。
              <br />
              不用重做你的流水线。
            </h2>
          </div>
          <Link className="text-link" href="/docs/integration/">
            阅读集成指南
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6">
              </path>
            </svg>
          </Link>
        </div>
        <IntegrationExamples />
      </section>
      <section className="start-section shell">
        <div>
          <span className="eyebrow">
            READY WHEN YOU ARE
          </span>
          <h2>
            从第一次可重复的发布开始。
          </h2>
          <p>
            准备配置，检查产物，然后把上传交给 Wot CI。
          </p>
        </div>
        <Link className="button primary" href="/docs/getting-started/">
          打开快速开始
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6">
            </path>
          </svg>
        </Link>
      </section>
    </main>
  )
}
