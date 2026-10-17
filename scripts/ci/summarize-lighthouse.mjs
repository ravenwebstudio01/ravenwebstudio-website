// Summarises Lighthouse JSON reports into a Markdown table (used by CI).
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const dir = process.argv[2] ?? 'reports/lighthouse'
const rows = []
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  try {
    const lhr = JSON.parse(readFileSync(path.join(dir, file), 'utf8'))
    const score = (id) => Math.round((lhr.categories?.[id]?.score ?? 0) * 100)
    const metric = (id) => lhr.audits?.[id]?.displayValue ?? '–'
    const failing = Object.values(lhr.audits ?? {})
      .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode === 'binary')
      .map((a) => a.id)
      .slice(0, 8)
    rows.push(
      `| ${file.replace('.json', '')} | ${score('performance')} | ${score('accessibility')} | ${score('best-practices')} | ${score('seo')} | ${metric('largest-contentful-paint')} | ${metric('cumulative-layout-shift')} | ${metric('total-blocking-time')} | ${failing.join(', ')} |`,
    )
  } catch (error) {
    rows.push(`| ${file} | error: ${error.message} |`)
  }
}
console.log('| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT | Failing binary audits |')
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const row of rows) console.log(row)
