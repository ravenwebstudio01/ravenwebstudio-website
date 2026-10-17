// Summarises Lighthouse JSON reports into Markdown (used by CI): a score table
// plus the details of every failing audit, so problems can be fixed without
// keeping the large JSON files.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const dir = process.argv[2] ?? 'reports/lighthouse'
const rows = []
const details = []

function itemText(item) {
  if (!item || typeof item !== 'object') return String(item)
  const parts = []
  for (const key of ['reason', 'description', 'issueType', 'failureReason', 'url', 'source', 'node']) {
    const value = item[key]
    if (!value) continue
    if (typeof value === 'string') parts.push(value)
    else if (typeof value === 'object') parts.push(value.snippet ?? value.selector ?? value.url ?? value.value ?? JSON.stringify(value).slice(0, 160))
  }
  if (Array.isArray(item.subItems?.items)) {
    for (const sub of item.subItems.items.slice(0, 3)) parts.push(itemText(sub))
  }
  return parts.join(' — ').replace(/\s+/g, ' ').slice(0, 300) || JSON.stringify(item).slice(0, 200)
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const name = file.replace('.json', '')
  try {
    const lhr = JSON.parse(readFileSync(path.join(dir, file), 'utf8'))
    if (lhr.runtimeError?.code && lhr.runtimeError.code !== 'NO_ERROR') {
      rows.push(`| ${name} | runtime error: ${lhr.runtimeError.code} | | | | | | | |`)
      details.push(`### ${name}\n\n- Lighthouse runtime error: ${lhr.runtimeError.code} — ${lhr.runtimeError.message ?? ''}`)
      continue
    }
    const score = (id) => {
      const value = lhr.categories?.[id]?.score
      return value == null ? 'n/a' : Math.round(value * 100)
    }
    const metric = (id) => lhr.audits?.[id]?.displayValue ?? '–'
    const failingAudits = Object.values(lhr.audits ?? {}).filter(
      (a) => a.score !== null && a.score < 0.9 && ['binary', 'numeric', 'metricSavings'].includes(a.scoreDisplayMode) && !a.id.startsWith('largest-') && a.details?.type !== 'debugdata',
    )
    const binary = failingAudits.filter((a) => a.scoreDisplayMode === 'binary').map((a) => a.id)
    rows.push(
      `| ${name} | ${score('performance')} | ${score('accessibility')} | ${score('best-practices')} | ${score('seo')} | ${metric('largest-contentful-paint')} | ${metric('cumulative-layout-shift')} | ${metric('total-blocking-time')} | ${binary.slice(0, 8).join(', ')} |`,
    )
    const lines = []
    // Details only for pass/fail audits; opportunity "insights" are advisory.
    for (const audit of failingAudits.filter((a) => a.scoreDisplayMode === 'binary')) {
      const items = Array.isArray(audit.details?.items) ? audit.details.items.slice(0, 4).map(itemText) : []
      lines.push(`- **${audit.id}** (${audit.title})${audit.displayValue ? ` — ${audit.displayValue}` : ''}`)
      for (const text of items) lines.push(`  - ${text}`)
    }
    if (lines.length) details.push(`### ${name}\n\n${lines.join('\n')}`)
  } catch (error) {
    rows.push(`| ${name} | error: ${error.message} | | | | | | | |`)
  }
}

console.log('| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT | Failing binary audits |')
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const row of rows) console.log(row)
if (details.length) {
  console.log('\n## Details of failing pass/fail audits\n')
  console.log(details.join('\n\n'))
}
