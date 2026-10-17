import { createInterface } from 'node:readline'

export function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--')) continue
    const [key, inline] = arg.slice(2).split('=', 2) as [string, string | undefined]
    if (inline !== undefined) out[key] = inline
    else if (argv[i + 1] && !argv[i + 1]!.startsWith('--')) out[key] = argv[++i]!
    else out[key] = 'true'
  }
  return out
}

export function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    }),
  )
}

/** Reads a line without echoing it to the terminal. */
export function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const internal = rl as unknown as { _writeToOutput: (s: string) => void }
    let asked = false
    internal._writeToOutput = (s: string) => {
      if (!asked) {
        process.stdout.write(s)
        asked = true
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}
