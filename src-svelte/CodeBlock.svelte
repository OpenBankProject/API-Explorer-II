<!--
  - Open Bank Project -  API Explorer II
  - Copyright (C) 2023-2024, TESOBE GmbH
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program.  If not, see <http://www.gnu.org/licenses/>.
  -
  - Email: contact@tesobe.com
  - TESOBE GmbH
  - Osloerstrasse 16/17
  - Berlin 13359, Germany
  -
  -   This product includes software developed at
  -   TESOBE (http://www.tesobe.com/)
  -
  -->

<script lang="ts">
  // Declare global hljs
  declare global {
    interface Window {
      hljs: {
        highlightElement: (element: HTMLElement) => void
      }
    }
  }

  interface Props {
    code: any
    language?: string
    copyable?: boolean
  }

  let {
    code,
    language = 'json',
    copyable = false
  }: Props = $props()

  // Reactive state using Runes
  let codeBlockRef = $state<HTMLDivElement>()
  let copied = $state(false)

  // Derived state - automatically computed
  let formattedCode = $derived(
    typeof code === 'string' ? code : JSON.stringify(code, null, 2)
  )

  // Highlight code when component mounts or updates
  function highlight() {
    if (codeBlockRef && window.hljs) {
      const codeElements = codeBlockRef.querySelectorAll('pre code')
      codeElements.forEach((block) => {
        window.hljs.highlightElement(block as HTMLElement)
      })
    }
  }

  // Copy to clipboard function
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(formattedCode)
      copied = true
      setTimeout(() => {
        copied = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  // Effect runs when component mounts and when dependencies change
  $effect(() => {
    // Need to wait for DOM to be ready
    setTimeout(() => highlight(), 0)
  })
</script>

<div bind:this={codeBlockRef} class="code-block">
  {#if copyable}
    <div class="code-block-header">
      <button
        onclick={copyToClipboard}
        class="copy-button"
        class:copied
      >
        {#if !copied}
          <span class="icon">📋</span>
          <span>Copy</span>
        {:else}
          <span class="icon">✓</span>
          <span>Copied!</span>
        {/if}
      </button>
    </div>
  {/if}
  <div class="code-container">
    <pre><code class={language}>{formattedCode}</code></pre>
  </div>
</div>

<style>
  .code-block {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    background: #1e1e1e;
    border: 1px solid #333;
    position: relative;
  }

  .code-block-header {
    background: #2d2d2d;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: flex-end;
  }

  .copy-button {
    background: #444;
    border: 1px solid #666;
    color: #ddd;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .copy-button .icon {
    font-size: 14px;
  }

  .copy-button:hover {
    background: #555;
    border-color: #777;
  }

  .copy-button.copied {
    background: #4caf50;
    border-color: #4caf50;
    color: white;
  }

  .code-container {
    max-height: 500px;
    overflow-y: auto;
  }

  .code-container pre {
    margin: 0;
    padding: 1.5rem;
    background: #1e1e1e;
    color: #ddd;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .code-container code {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-family: inherit;
    font-size: inherit;
  }

  /* Custom scrollbar for code blocks */
  .code-container::-webkit-scrollbar {
    width: 8px;
  }

  .code-container::-webkit-scrollbar-track {
    background: #2d2d2d;
  }

  .code-container::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }

  .code-container::-webkit-scrollbar-thumb:hover {
    background: #777;
  }

  .code-container pre::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  .code-container pre::-webkit-scrollbar-track {
    background: #2d2d2d;
  }

  .code-container pre::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }

  .code-container pre::-webkit-scrollbar-thumb:hover {
    background: #777;
  }

  /* Syntax highlighting enhancements */
  .code-block :global(.hljs-string) {
    color: #98c379;
  }

  .code-block :global(.hljs-number) {
    color: #d19a66;
  }

  .code-block :global(.hljs-literal) {
    color: #56b6c2;
  }

  .code-block :global(.hljs-attr) {
    color: #e06c75;
  }

  .code-block :global(.hljs-punctuation) {
    color: #abb2bf;
  }
</style>
