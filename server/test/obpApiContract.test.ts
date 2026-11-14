// The contract between API Explorer II and OBP-API.
//
// obp-api-contract/contract.json lists every OBP-API call the Explorer's own code makes, with the
// response fields the code reads. obp-api-contract/snapshot.json is what an OBP-API documents for
// those calls, written by obp-api-contract/snapshot.py from its resource docs. These tests need no
// server: they check that the list matches the code, and that every call reaches an endpoint
// OBP-API documents, with every field the code reads. Retake the snapshot from a new OBP-API build
// to learn whether that build breaks the Explorer.

import { describe, expect, it } from 'vitest'

// vitest.config.js polyfills node built-ins for the browser, which turns `node:fs` into an empty
// stub, so the real module is taken from the Node runtime (Node 20.16 or newer).
const { readFileSync, readdirSync, statSync } = (process as any).getBuiltinModule('node:fs')

// The repository root, which vitest runs in.
const ROOT = process.cwd()

interface Needle {
  source: string
  needle: string
}

interface Call {
  verb: string
  path: string
  source: string
  needles: string[]
  version_from?: Needle[]
  reads: string[]
  undocumented_fields?: string[]
  undocumented_endpoint?: string
}

const load = (name: string) => JSON.parse(readFileSync(`${ROOT}/obp-api-contract/${name}`, 'utf8'))
const contract = load('contract.json')
const calls: Call[] = contract.calls
const notCalls: (Needle & { reason: string })[] = contract.not_calls ?? []
const read = (file: string): string => readFileSync(`${ROOT}/${file}`, 'utf8')
const key = (call: { verb: string; path: string }) => `${call.verb} ${call.path}`

// The snapshot entry for a call, or undefined.
const documented = (call: Call, snapshot: any) =>
  snapshot.endpoints.find((e: any) => key(e) === key(call))

// The reads of `call` that `fields` does not document. A read written `a|b` is satisfied by either.
export function undocumentedReads(call: { reads: string[] }, fields: Set<string>): string[] {
  return call.reads.filter((r) => !r.split('|').some((f) => fields.has(f)))
}

// The front end and server code, without tests.
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(`${ROOT}/${dir}`) as string[]) {
    const path = `${dir}/${name}`
    if (name === 'test' || name === 'node_modules') continue
    if (statSync(`${ROOT}/${path}`).isDirectory()) {
      sourceFiles(path, out)
    } else if (/\.(ts|mts|js|vue)$/.test(name) && !/\.(test|spec|d)\.ts$/.test(name)) {
      out.push(path)
    }
  }
  return out
}

// Lines that build an OBP-API path (a string with obp/vX or obp/${...}), skipping comments:
// file relative to the repository root, line number, line.
function obpPathLines(): [string, number, string][] {
  const out: [string, number, string][] = []
  for (const file of [...sourceFiles('src'), ...sourceFiles('server')]) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        const code = line.trim()
        if (/^(\/\/|\/\*|\*|<!--)/.test(code)) return
        if (/['"`]/.test(code) && /obp\/(v\d|\$\{)/.test(code)) out.push([file, i + 1, line])
      })
  }
  return out
}

describe('OBP-API contract', () => {
  it('finds every call of the contract in its source file', () => {
    // Every needle of an entry occurs in the entry's source file, and so does each version constant
    // the path is built from, with the version the path names.
    const gone: string[] = []
    for (const call of calls) {
      const text = read(call.source)
      for (const needle of call.needles) {
        if (!text.includes(needle)) gone.push(`${key(call)} (${call.source}): ${needle}`)
      }
      const version = call.path.split('/')[2]
      for (const { source, needle } of call.version_from ?? []) {
        if (!read(source).includes(needle)) gone.push(`${key(call)} (${source}): ${needle}`)
        const named = needle.match(/v\d+\.\d+\.\d+/)?.[0]
        if (named && named !== version) gone.push(`${key(call)}: ${source} says ${named}`)
      }
    }
    for (const { source, needle } of notCalls) {
      if (!read(source).includes(needle)) gone.push(`not_calls (${source}): ${needle}`)
    }
    expect(gone).toEqual([])
  })

  it('lists every OBP-API call in the source', () => {
    // Coverage: a line that builds an OBP-API path must contain a needle of a call listed for that
    // file, or of a not_calls entry, so a new call cannot reach OBP-API without its fields recorded.
    const unlisted = obpPathLines()
      .filter(([file, , line]) => {
        const needles = [
          ...calls.filter((c) => c.source === file).flatMap((c) => c.needles),
          ...notCalls.filter((n) => n.source === file).map((n) => n.needle)
        ]
        return !needles.some((n) => line.includes(n.trim()))
      })
      .map(([file, n, line]) => `${file}:${n} ${line.trim()}`)
    expect(obpPathLines().length).toBeGreaterThan(calls.length)
    expect(unlisted).toEqual([])
  })

  it('has a snapshot taken for this contract', () => {
    // snapshot.json holds exactly the calls of contract.json; otherwise rerun snapshot.py.
    const snapshot = load('snapshot.json')
    expect(snapshot.endpoints.map(key).sort()).toEqual(calls.map(key).sort())
  })

  it('reaches an endpoint OBP-API documents for every call', () => {
    // Each call's version and path name a documented endpoint, unless the entry records why not
    // (undocumented_endpoint). A recorded gap that OBP-API has since documented fails too.
    const snapshot = load('snapshot.json')
    const problems: string[] = []
    for (const call of calls) {
      const entry = documented(call, snapshot) ?? { missing: true }
      if (entry.missing && !call.undocumented_endpoint)
        problems.push(`${key(call)}: no documented endpoint`)
      if (!entry.missing && call.undocumented_endpoint) {
        problems.push(
          `${key(call)}: now documented as ${entry.operation_id}; drop undocumented_endpoint`
        )
      }
      if (entry.ambiguous)
        problems.push(`${key(call)}: matches several endpoints ${entry.ambiguous.join(', ')}`)
    }
    expect(problems).toEqual([])
  })

  it('reads only fields OBP-API documents', () => {
    // Each field the code reads is in the documented response of its endpoint, unless the entry lists
    // it in undocumented_fields; a listed field that OBP-API now documents fails, so the list shrinks.
    const snapshot = load('snapshot.json')
    const problems: string[] = []
    for (const call of calls) {
      const entry = documented(call, snapshot)
      if (!entry || entry.missing) continue
      const fields = new Set<string>(entry.fields)
      const known = new Set(call.undocumented_fields ?? [])
      for (const r of undocumentedReads(call, fields)) {
        if (!known.has(r))
          problems.push(`${key(call)} (${entry.operation_id}): reads ${r}, not documented`)
      }
      for (const field of known) {
        if (fields.has(field))
          problems.push(
            `${key(call)}: ${field} is now documented; drop it from undocumented_fields`
          )
        if (!call.reads.includes(field))
          problems.push(`${key(call)}: ${field} is in undocumented_fields but not in reads`)
      }
    }
    expect(problems).toEqual([])
  })

  it('reports a renamed or removed field', () => {
    // The check itself: with bank_id gone from the documented fields, the banks read is reported, and
    // a read with an alternative (`a|b`) passes on either field.
    const banks = { reads: ['banks[].bank_id', 'banks[].full_name'] }
    const renamed = new Set(['banks', 'banks[]', 'banks[].id', 'banks[].full_name'])
    expect(undocumentedReads(banks, renamed)).toEqual(['banks[].bank_id'])
    const either = { reads: ['bank_id|id'] }
    expect(undocumentedReads(either, new Set(['id']))).toEqual([])
    expect(undocumentedReads(either, new Set())).toEqual(['bank_id|id'])
  })
})
