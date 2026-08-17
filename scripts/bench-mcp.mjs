// Read-only MCP server over the benchmark board.
//
// Transport: MCP stdio — newline-delimited JSON-RPC 2.0 on stdin/stdout, one
// message per line, UTF-8, no framing headers. Protocol version 2024-11-05
// (later versions are echoed when asked for; see lib/lab/llm-benchmark/mcp.ts).
//
// Run: npx tsx scripts/bench-mcp.mjs
// Registered for agent sessions in the repo's `.mcp.json` as the `bench` server.
//
// This file is deliberately THIN: framing and process wiring only. Every tool,
// schema and handler is in `lib/lab/llm-benchmark/mcp.ts` (pure, unit-tested
// without stdio) and the filesystem lookups are in `mcp-fs.ts`.
//
// Two rules it must not break:
//   1. NOTHING but JSON-RPC ever reaches stdout — a stray log line corrupts the
//      stream. Diagnostics go to stderr, which the client ignores.
//   2. It never writes anything, anywhere. The board is evidence; an agent gets
//      to read it.
import { createInterface } from 'node:readline'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBenchMcpDeps } from '../lib/lab/llm-benchmark/mcp-fs.ts'
import { handleLine } from '../lib/lab/llm-benchmark/mcp.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// The board is read from the REPO, not from wherever the client happened to
// spawn us — an agent session's cwd is its own business.
process.chdir(root)

const deps = createBenchMcpDeps(root)

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })

rl.on('line', (line) => {
  let response
  try {
    response = handleLine(line, deps)
  } catch (err) {
    // A handler that throws past its own guard must not kill the session.
    process.stderr.write(`[bench-mcp] handler error: ${err?.stack ?? err}\n`)
    response = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: `internal error: ${err?.message ?? String(err)}` },
    }
  }
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`)
})

rl.on('close', () => process.exit(0))
