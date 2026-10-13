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


import { get } from '../obp'
import { RESOURCE_DOCS_API_VERSION } from '../shared-constants'

// Domain APIs: a space's Dynamic Entities and Dynamic Resource Docs that OBP-API publishes under a
// base path of its own, such as crcf/ogcr/v1 (see the "Domain APIs" glossary item). Each publicly
// discoverable one is offered like a version, with its docs at their published paths, so Try It calls
// them as they stand.

// What OBP-API says about a publicly discoverable Domain API.
export interface DomainApi {
  bank_id: string
  base_path: string
  version: string
  title: string
  description: string
  url: string
  openapi_url: string
}

// The pseudo version a Domain API's docs are kept under, e.g. DomainAPI~crcf~ogcr~v1. A base path
// cannot contain ~, so the key maps back to it, and it fits in one route segment.
export const DOMAIN_API_VERSION_PREFIX = 'DomainAPI~'

export function domainApiVersion(basePath: string): string {
  return `${DOMAIN_API_VERSION_PREFIX}${basePath.split('/').join('~')}`
}

export function isDomainApiVersion(version: string | undefined): boolean {
  return typeof version === 'string' && version.startsWith(DOMAIN_API_VERSION_PREFIX)
}

// How a Domain API is named in the Versions menu and above the docs.
export function domainApiLabel(api: DomainApi): string {
  return `${api.title} (/${api.base_path})`
}

// How a version is named: a Domain API by its title and base path, any other version as it is.
export function versionDisplayName(version: string, docs: any): string {
  const api: DomainApi | undefined = docs?.[version]?.domain_api
  return isDomainApiVersion(version) && api ? domainApiLabel(api) : version
}

// The menu label -> pseudo version of every Domain API in the docs.
export function domainApiMenuItems(docs: any): Record<string, string> {
  return Object.fromEntries(
    Object.entries(docs || {})
      .filter(([version, versionDocs]: [string, any]) => isDomainApiVersion(version) && versionDocs?.domain_api)
      .map(([version, versionDocs]: [string, any]) => [domainApiLabel(versionDocs.domain_api), version])
  )
}

// The docs of every publicly discoverable Domain API, by pseudo version, each with its description
// as domain_api. Empty when OBP-API has none or is too old to list them; a Domain API whose docs
// cannot be read is left out.
export async function getDomainApiResourceDocs(): Promise<Record<string, any>> {
  const listed = await get(`/obp/${RESOURCE_DOCS_API_VERSION}/domain-apis`)
  const apis: DomainApi[] = Array.isArray(listed?.domain_apis) ? listed.domain_apis : []
  const mapping: Record<string, any> = {}
  await Promise.all(
    apis.map(async (api) => {
      const docs = await get(
        `/obp/${RESOURCE_DOCS_API_VERSION}/banks/${encodeURIComponent(api.bank_id)}/domain-apis/resource-docs?base_path=${api.base_path}`
      )
      if (Array.isArray(docs?.resource_docs)) {
        mapping[domainApiVersion(api.base_path)] = { ...docs, domain_api: api }
      } else {
        console.warn(`[CACHE] WARNING: Could not load the docs of Domain API ${api.base_path}`, docs?.error)
      }
    })
  )
  return mapping
}
