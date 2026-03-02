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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DocumentCopy, Check } from '@element-plus/icons-vue'

interface Props {
  schema: any
  copyable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  copyable: false
})

const emit = defineEmits<{
  refClick: [refId: string]
}>()

const copied = ref(false)

const copyToClipboard = async () => {
  try {
    const text = JSON.stringify(props.schema, null, 2)
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

const handleRefClick = (event: Event, refId: string) => {
  event.preventDefault()
  emit('refClick', refId)
}

// Function to render JSON with clickable $ref links
const renderJsonWithRefs = (obj: any, indent: number = 0): any[] => {
  const result: any[] = []
  const indentStr = '  '.repeat(indent)

  if (obj === null || obj === undefined) {
    result.push({ type: 'value', text: String(obj) })
    return result
  }

  if (typeof obj !== 'object') {
    const valueClass = typeof obj === 'string' ? 'json-string' :
                       typeof obj === 'number' ? 'json-number' :
                       typeof obj === 'boolean' ? 'json-boolean' : 'json-value'
    const displayValue = typeof obj === 'string' ? `"${obj}"` : String(obj)
    result.push({ type: 'value', text: displayValue, class: valueClass })
    return result
  }

  const isArray = Array.isArray(obj)
  const openBracket = isArray ? '[' : '{'
  const closeBracket = isArray ? ']' : '}'

  result.push({ type: 'bracket', text: openBracket })

  const entries = isArray ? obj.map((val, idx) => [idx, val]) : Object.entries(obj)
  const totalEntries = entries.length

  entries.forEach(([key, value], index) => {
    const isLast = index === totalEntries - 1
    const newIndent = indent + 1
    const newIndentStr = '  '.repeat(newIndent)

    result.push({ type: 'newline', text: '\n' })
    result.push({ type: 'indent', text: newIndentStr })

    // Add key for objects
    if (!isArray) {
      result.push({ type: 'key', text: `"${key}"`, class: 'json-key' })
      result.push({ type: 'separator', text: ': ' })
    }

    // Check if this is a $ref
    if (key === '$ref' && typeof value === 'string') {
      // Extract definition name from $ref
      const refMatch = value.match(/#\/definitions\/(.+)$/)
      if (refMatch) {
        const defName = refMatch[1]
        result.push({ type: 'ref', text: `"${value}"`, href: `#def-${defName}`, defName })
      } else {
        result.push({ type: 'value', text: `"${value}"`, class: 'json-string' })
      }
    } else if (value && typeof value === 'object') {
      // Recursively render nested objects/arrays
      const nested = renderJsonWithRefs(value, newIndent)
      result.push(...nested)
    } else {
      // Render primitive values
      const valueClass = typeof value === 'string' ? 'json-string' :
                         typeof value === 'number' ? 'json-number' :
                         typeof value === 'boolean' ? 'json-boolean' :
                         value === null ? 'json-null' : 'json-value'
      const displayValue = typeof value === 'string' ? `"${value}"` : String(value)
      result.push({ type: 'value', text: displayValue, class: valueClass })
    }

    // Add comma if not last
    if (!isLast) {
      result.push({ type: 'comma', text: ',' })
    }
  })

  if (totalEntries > 0) {
    result.push({ type: 'newline', text: '\n' })
    result.push({ type: 'indent', text: indentStr })
  }
  result.push({ type: 'bracket', text: closeBracket })

  return result
}

const jsonElements = computed(() => {
  return renderJsonWithRefs(props.schema)
})
</script>

<template>
  <div class="json-schema-viewer">
    <div v-if="copyable" class="schema-header">
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
    <div class="schema-container">
      <pre class="schema-pre"><code class="schema-code"><template v-for="(element, index) in jsonElements" :key="index"><span
        v-if="element.type === 'ref'"
        class="json-ref"
        :title="`Jump to definition: ${element.defName}`"
      ><a :href="element.href" class="ref-link" @click="handleRefClick($event, element.href)">{{ element.text }}</a></span><span
        v-else-if="element.type === 'key' || element.type === 'value'"
        :class="element.class"
      >{{ element.text }}</span><span v-else>{{ element.text }}</span></template></code></pre>
    </div>
  </div>
</template>

<style scoped>
.json-schema-viewer {
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e1e;
  border: 1px solid #333;
  position: relative;
}

.schema-header {
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

.copy-button:hover {
  background: #555;
  border-color: #777;
}

.copy-button.copied {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.schema-container {
  max-height: 500px;
  overflow-y: auto;
}

.schema-pre {
  margin: 0;
  padding: 1.5rem;
  background: #1e1e1e;
  color: #ddd;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: auto;
}

.schema-code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-family: inherit;
  font-size: inherit;
  white-space: pre;
}

/* JSON Syntax Highlighting */
.json-key {
  color: #e06c75;
  font-weight: 500;
}

.json-string {
  color: #98c379;
}

.json-number {
  color: #d19a66;
}

.json-boolean {
  color: #56b6c2;
}

.json-null {
  color: #c678dd;
}

.json-ref {
  position: relative;
}

.ref-link {
  color: #61afef;
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ref-link:hover {
  color: #84c5ff;
  text-decoration-style: solid;
  background-color: rgba(97, 175, 239, 0.1);
}

/* Custom scrollbar */
.schema-container::-webkit-scrollbar {
  width: 8px;
}

.schema-container::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.schema-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.schema-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.schema-pre::-webkit-scrollbar {
  height: 8px;
}

.schema-pre::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.schema-pre::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.schema-pre::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>
