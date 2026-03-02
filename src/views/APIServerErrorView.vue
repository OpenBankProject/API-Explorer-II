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
import { ref, onMounted } from 'vue'
const version = ref(__APP_VERSION__)
const errorDetails = ref<{ message: string; stack?: string } | null>(null)
const hasError = ref(false)

onMounted(() => {
  const storedError = sessionStorage.getItem('setupError')
  if (storedError) {
    try {
      errorDetails.value = JSON.parse(storedError)
      hasError.value = true
    } catch (e) {
      console.error('Failed to parse stored error:', e)
    }
  }
})

const copyError = async () => {
  if (!errorDetails.value) return
  const errorText = `API Explorer II Setup Error\n\nMessage:\n${errorDetails.value.message}\n\nStack:\n${errorDetails.value.stack || 'No stack trace available'}`
  try {
    await navigator.clipboard.writeText(errorText)
    alert('Error copied to clipboard')
  } catch (err) {
    console.error('Failed to copy error:', err)
  }
}
</script>

<template>
  <div class="error-container">
    <main>500 | The API server is not responding.</main>
    <span class="version">Version: {{ version }}</span>

    <div v-if="hasError" class="error-details">
      <div class="error-header">
        <h2>Error Details</h2>
        <button @click="copyError" class="copy-btn">📋 Copy Error</button>
      </div>
      <div class="error-content">
        <div class="error-section">
          <strong>Message:</strong>
          <pre>{{ errorDetails?.message }}</pre>
        </div>
        <div v-if="errorDetails?.stack" class="error-section">
          <strong>Stack Trace:</strong>
          <pre>{{ errorDetails?.stack }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

main {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #39455f;
  font-family: 'roboto';
  font-size: 30px;
}

.version {
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  color: #666;
}

.error-details {
  margin-top: 40px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

.error-header h2 {
  margin: 0;
  color: #39455f;
  font-family: 'roboto';
  font-size: 24px;
}

.copy-btn {
  background: #e0e0e0;
  border: 1px solid #ccc;
  color: #333;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: background 0.2s;
}

.copy-btn:hover {
  background: #d0d0d0;
}

.error-content {
  font-family: monospace;
}

.error-section {
  margin-bottom: 20px;
}

.error-section strong {
  display: block;
  margin-bottom: 8px;
  color: #39455f;
  font-size: 16px;
}

.error-section pre {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #333;
  margin: 0;
  line-height: 1.5;
}
</style>
