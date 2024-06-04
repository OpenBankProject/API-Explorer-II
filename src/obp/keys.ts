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

import type { InjectionKey } from 'vue'

export const obpResourceDocsKey = Symbol('OBP-ResourceDocs') as InjectionKey<any>
export const obpApiActiveVersionsKey = Symbol('OBP-APIActiveVersions') as InjectionKey<any>
export const obpGroupedResourceDocsKey = Symbol('OBP-GroupedResourceDocs') as InjectionKey<any>
export const obpGroupedMessageDocsKey = Symbol('OBP-GroupedMessageDocs') as InjectionKey<any> // This cause an issue
export const obpApiHostKey = Symbol('OBP-API-Host') as InjectionKey<any>
export const obpGlossaryKey = Symbol('OBP-Glossary') as InjectionKey<any>
export const obpMyCollectionsEndpointKey = Symbol('OBP-MyCollectionsEndpoint') as InjectionKey<any>