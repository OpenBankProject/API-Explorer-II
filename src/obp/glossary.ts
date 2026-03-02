/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
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

import { get } from '../obp'
import { updateLoadingInfoMessage } from './common-functions'
import { GLOSSARY_API_VERSION } from '../shared-constants'

// Get Glossary
export async function getOBPGlossary(): Promise<any> {
  const logMessage = `Loading glossary { version: ${GLOSSARY_API_VERSION} }`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  const glossary = await get(`obp/${GLOSSARY_API_VERSION}/api/glossary`)

  // Check if the API call failed
  if (glossary && glossary.error) {
    console.error('Failed to load glossary:', glossary.error)
    return glossary
  }

  if (glossary && glossary.glossary_items) {
    const itemCount = glossary.glossary_items.length
    console.log(`✓ Loaded ${itemCount} glossary items`)

    // Log specific items of interest
    const helpItem = glossary.glossary_items.find(
      (item: any) => item.title === 'API-Explorer-II-Help'
    )
    if (helpItem) {
      console.log('✓ Found glossary item: API-Explorer-II-Help')
    } else {
      console.warn(
        '⚠ Glossary item not found: API-Explorer-II-Help (Help page will show error message)'
      )
    }
  } else {
    console.warn('⚠ Glossary response does not contain glossary_items array')
  }

  return glossary
}

// Get a specific glossary item by title
export function getGlossaryItemByTitle(glossary: any, title: string): any | null {
  if (!glossary || !glossary.glossary_items) {
    console.warn(`Cannot retrieve glossary item "${title}": glossary data is not available`)
    return null
  }
  const item = glossary.glossary_items.find((item: any) => item.title === title)
  if (item) {
    console.log(`Retrieved glossary item: ${title}`)
  } else {
    console.warn(`Glossary item not found: ${title}`)
  }
  return item || null
}
