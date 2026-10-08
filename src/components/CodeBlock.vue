<!--
  - Open Bank Project -  API Explorer II
  - Copyright (C) 2023-2024, TESOBE GmbH
  -
    <div v-if="copyable" class="code-block-header">
      <button 
        @click="copyToClipboard" 
        class="copy-button"
        :class="{ 'copied': copied }"
      >
        <el-icon v-if="!copied" class="icon"><DocumentCopy /></el-icon>
        <el-icon v-else class="icon"><Check /></el-icon>
        <span v-if="!copied">Copy</span>
        <span v-else>Copied!</span>
      </button>
    </div>rogram is free software: you can redistribute it and/or modify
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

<script setup lang="ts">
import { ref, onMounted, onUpdated, nextTick } from 'vue'
import { DocumentCopy, Check } from '@element-plus/icons-vue'

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

const props = withDefaults(defineProps<Props>(), {
  language: 'json',
  copyable: false
})

const codeBlockRef = ref<HTMLElement>()
const copied = ref(false)

const highlight = async () => {
  await nextTick()
  if (codeBlockRef.value && window.hljs) {
    const codeElements = codeBlockRef.value.querySelectorAll('pre code')
    codeElements.forEach((block) => {
      window.hljs.highlightElement(block as HTMLElement)
    })
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(formattedCode)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

onMounted(() => {
  highlight()
})

onUpdated(() => {
  highlight()
})

const formattedCode = typeof props.code === 'string' 
  ? props.code 
  : JSON.stringify(props.code, null, 2)
</script>

<template>
  <div ref="codeBlockRef" class="code-block">
    <div v-if="copyable" class="code-block-header">
      <button 
        @click="copyToClipboard" 
        class="copy-button"
        :class="{ 'copied': copied }"
      >
        <span v-if="!copied">
          <el-icon :size="10">
            <DocumentCopy /> 
          </el-icon>
          Copy
        </span>
        <span v-else>
          <el-icon :size="10">
            <Check /> 
          </el-icon>
          Copied!
        </span>
      </button>
    </div>
    <div class="code-container">
      <pre><code :class="language">{{ formattedCode }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.code-block {
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--obp-code-bg);
  border: 1px solid #333;
  position: relative;
}

.code-block-header {
  background: var(--obp-code-bg-raised);
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
  background: var(--obp-code-bg);
  color: #ddd;
  font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
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
  background: var(--obp-code-bg-raised);
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
  background: var(--obp-code-bg-raised);
}

.code-container pre::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.code-container pre::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* Syntax highlighting enhancements */
.code-block :deep(.hljs-string) {
  color: #98c379;
}

.code-block :deep(.hljs-number) {
  color: #d19a66;
}

.code-block :deep(.hljs-literal) {
  color: #56b6c2;
}

.code-block :deep(.hljs-attr) {
  color: #e06c75;
}

.code-block :deep(.hljs-punctuation) {
  color: #abb2bf;
}
</style>