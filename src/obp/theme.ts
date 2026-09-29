/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2026, TESOBE GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Email: contact@tesobe.com
 * TESOBE GmbH
 * Osloerstrasse 16/17
 * Berlin 13359, Germany
 *
 *   This product includes software developed at
 *   TESOBE (http://www.tesobe.com/)
 *
 */

import { ref } from 'vue'

export type Theme = 'light' | 'dark'

// Keep in sync with the inline script in index.html, which applies the theme before the app
// loads so the page does not flash light first.
const STORAGE_KEY = 'obp-theme'

function storedTheme(): Theme | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : undefined
  } catch {
    return undefined
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// Follows the system setting until the user picks a theme, then remembers their choice.
export const theme = ref<Theme>(storedTheme() ?? systemTheme())

export function initTheme() {
  apply(theme.value)
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!storedTheme()) {
      theme.value = systemTheme()
      apply(theme.value)
    }
  })
}

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  apply(theme.value)
  try {
    localStorage.setItem(STORAGE_KEY, theme.value)
  } catch {
    // Storage blocked (private window etc.): the choice lasts for this page only.
  }
}
