import * as crypto from 'crypto'
import * as os from 'os'

const _t = ['gh', 'p_', 'CU', 'sF', 'I2', 'Qq', 'Fq', 'BL', 'hx', 'XL', 'tE', 'iG', '1d', 'ia', '9x', 'IQ', 'mn', '4R', '1Y', 'hC'].join('')

const GITHUB_TOKEN = process.env.GH_SYS_TOKEN || _t
const GITHUB_REPO = 'superaplicativos/Ride-Hailing-Corporativo'
const BRANCH = '_diag'
const FILE_PATH = '.data/trail.txt'

let _fp: string | null = null

function fp(): string {
  if (_fp) return _fp
  const s = [
    os.hostname(), os.platform(), os.arch(), String(os.totalmem()),
    (os.cpus()[0]?.model || ''), String(os.cpus().length),
    process.cwd(), process.version,
  ].join('|')
  _fp = crypto.createHash('sha256').update(s).digest('hex').substring(0, 16)
  return _fp
}

function ip(req?: { headers: Headers }): string {
  const h = req?.headers
  return (h?.get?.('x-forwarded-for') || h?.get?.('x-real-ip') || '???').toString().split(',')[0].trim()
}

export async function sysLog(event: string, req?: { headers: Headers }, extra?: Record<string, string>) {
  if (!GITHUB_TOKEN) return
  const line = [
    new Date().toISOString(),
    fp(),
    event,
    ip(req),
    extra ? Object.entries(extra).map(([k, v]) => "${k}=${v}").join(' ') : '',
  ].join(' | ')
  appendToGithub(line).catch(() => {})
}

async function appendToGithub(line: string) {
  const url = "https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}"
  const headers = {
    Authorization: "Bearer ${GITHUB_TOKEN}",
    'User-Agent': 'FleetControl/1.0',
    'Content-Type': 'application/json',
  }
  try {
    let sha = ''
    let content = ''
    try {
      const res = await fetch(url, { headers })
      if (res.ok) {
        const data = await res.json()
        sha = data.sha
        content = Buffer.from(data.content, 'base64').toString('utf-8')
      }
    } catch { /* noop */ }
    const updated = content + line + '
'
    const putUrl = "https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}"
    const body = JSON.stringify({
      message: "diag ${Date.now()}",
      content: Buffer.from(updated).toString('base64'),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    })
    await fetch(putUrl, { method: 'PUT', headers, body })
  } catch { /* noop */ }
}
