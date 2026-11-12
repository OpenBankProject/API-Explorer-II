// The OBP-API version every API Explorer call uses.
//
// OBP-API deployments can switch off the versions below v5.1.0, so every path the Explorer
// (front end and server) sends to OBP-API must use v5.1.0 or newer. This test reads the sources
// and fails on any `obp/vX.Y.Z` below v5.1.0, and on any quoted version literal such as 'v4.0.0'
// (paths here are built from version constants), unless it is listed in BELOW_V510.

import { describe, expect, it } from 'vitest'

// vitest.config.js polyfills node built-ins for the browser, which turns `node:fs` into an empty
// stub, so the real module is taken from the Node runtime (Node 20.16 or newer).
const { readFileSync, readdirSync, statSync } = (process as any).getBuiltinModule('node:fs')

// The repository root, which vitest runs in.
const ROOT = process.cwd()
const join = (...parts: string[]) => parts.join('/')

// `file|fragment` -> why that line still names a version below v5.1.0. A line is allowed when it
// is in `file` (relative to the repository root) and contains `fragment`. Empty: every call has a
// v5.1.0 or newer equivalent.
const BELOW_V510: Record<string, string> = {}

// Where OBP-API paths and versions are written: the front end, the server, the container and
// script files, and the example configuration at the repository root.
const SOURCE_ROOTS = ['src', 'server', 'Dockerfiles', 'scripts']
const ROOT_FILES = [
  '.env.example',
  '.env-docker.example',
  'dockercompose.yml',
  'ai_env.example',
  'env_ai',
  'index.html',
  'vite.config.mts'
]
const EXTENSIONS = [
  'ts',
  'mts',
  'js',
  'mjs',
  'cjs',
  'vue',
  'html',
  'sh',
  'yml',
  'yaml',
  'conf',
  'go',
  'env'
]
const SKIP_DIRS = ['node_modules', 'dist', 'dist-server']
// This file, whose examples name old versions on purpose.
const THIS_FILE = 'server/test/obpApiVersion.test.ts'

function sourceFiles(dir: string, out: string[] = []): string[] {
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of names) {
    if (name.startsWith('.') || SKIP_DIRS.includes(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      sourceFiles(path, out)
    } else if (EXTENSIONS.includes(name.split('.').pop() ?? '') || name.startsWith('Dockerfile')) {
      out.push(path)
    }
  }
  return out
}

function allSourceFiles(): string[] {
  const files = SOURCE_ROOTS.flatMap((dir) => sourceFiles(join(ROOT, dir)))
  return files.concat(ROOT_FILES.map((name) => join(ROOT, name)))
}

function isBelowV510(major: string, minor: string, patch: string): boolean {
  const [a, b, c] = [Number(major), Number(minor), Number(patch)]
  return a !== 5 ? a < 5 : b !== 1 ? b < 1 : c < 0
}

// Every `obp/vX.Y.Z` and every version literal ('vX.Y.Z' in quotes, or after `=`) in `line`
// whose version is below v5.1.0, as written.
export function versionsBelowV510(line: string): string[] {
  const found: string[] = []
  for (const m of line.matchAll(/obp\/v(\d+)\.(\d+)\.(\d+)(?![\d.])/g)) {
    if (isBelowV510(m[1], m[2], m[3])) found.push(m[0])
  }
  for (const m of line.matchAll(/(?<=['"`=])v(\d+)\.(\d+)\.(\d+)(?=['"`]|\s|$)/g)) {
    if (isBelowV510(m[1], m[2], m[3])) found.push(m[0])
  }
  return found
}

function linesBelowV510(): string[] {
  const found: string[] = []
  for (const file of allSourceFiles()) {
    const rel = file.slice(ROOT.length + 1)
    if (rel === THIS_FILE) continue
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    text.split('\n').forEach((line, i) => {
      for (const version of versionsBelowV510(line)) {
        const allowed = Object.keys(BELOW_V510).some((key) => {
          const [keyFile, fragment] = key.split('|')
          return keyFile === rel && line.includes(fragment)
        })
        if (!allowed) found.push(`${rel}:${i + 1} ${version}`)
      }
    })
  }
  return found
}

describe('OBP-API version floor', () => {
  it('reads the real sources', () => {
    // An empty result below must mean "no old version", not "no files".
    expect(
      allSourceFiles().filter((f) => f.endsWith('.ts') || f.endsWith('.vue')).length
    ).toBeGreaterThan(50)
  })

  it('calls OBP-API on v5.1.0 or newer', () => {
    expect(linesBelowV510()).toEqual([])
  })

  it('lists only call sites that still exist', () => {
    // A call that moved to v5.1.0 or newer must also leave BELOW_V510.
    const stale = Object.keys(BELOW_V510).filter((key) => {
      const [file, fragment] = key.split('|')
      try {
        return !readFileSync(join(ROOT, file), 'utf8').includes(fragment)
      } catch {
        return true
      }
    })
    expect(stale).toEqual([])
  })

  it('recognises the ways a version below v5.1.0 can be written', () => {
    expect(versionsBelowV510('get(`/obp/v4.0.0/x`)')).toEqual(['obp/v4.0.0'])
    expect(versionsBelowV510("get('obp/v5.0.0/banks')")).toEqual(['obp/v5.0.0'])
    expect(versionsBelowV510('"/obp/v3.1.0/a" and "/obp/v1.2.1/b"')).toEqual([
      'obp/v3.1.0',
      'obp/v1.2.1'
    ])
    expect(versionsBelowV510("export const V4_0_0 = 'v4.0.0'")).toEqual(['v4.0.0'])
    expect(versionsBelowV510('VITE_OBP_API_VERSION=v4.0.0')).toEqual(['v4.0.0'])
    expect(versionsBelowV510('get(`/obp/v5.1.0/x`)')).toEqual([])
    expect(versionsBelowV510("export const V6_0_0 = 'v6.0.0' // /obp/v7.0.0/root")).toEqual([])
    expect(versionsBelowV510('get(`/obp/dynamic-entity/x`)')).toEqual([])
    expect(versionsBelowV510("doc('OBPv4.0.0-getBanks')")).toEqual([])
  })
})
