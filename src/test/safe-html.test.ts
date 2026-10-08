// @vitest-environment jsdom
// jsdom parses HTML like a browser; happy-dom runs <script> while parsing, which DOMPurify relies on not happening.
import { describe, expect, it } from 'vitest'
import { safeHtml } from '@/obp/safe-html'

describe('safeHtml', () => {
  it('removes scripts, event handlers and javascript: links', () => {
    const html = safeHtml(
      '<p>Hi<img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a></p>'
    )
    expect(html).not.toMatch(/onerror|<script|javascript:/)
    expect(html).toContain('<p>Hi')
  })

  it('keeps the formatting OBP-API descriptions use', () => {
    const html =
      '<p>Text <a href="https://example.com">link</a></p><details><summary>More</summary><pre><code>{"a":1}</code></pre></details><ul><li>one</li></ul>'
    expect(safeHtml(html)).toBe(html)
  })

  it('returns an empty string for no HTML', () => {
    expect(safeHtml(undefined)).toBe('')
    expect(safeHtml(null)).toBe('')
  })
})
