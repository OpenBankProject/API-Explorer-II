import type { InjectionKey } from 'vue'

export const obpResourceDocsKey = Symbol('OBP-ResourceDocs') as InjectionKey<any>
export const obpApiActiveVersionsKey = Symbol('OBP-APIActiveVersions') as InjectionKey<any>
export const obpGroupedResourceDocsKey = Symbol('OBP-GroupedResourceDocs') as InjectionKey<any>
export const obpGroupedMessageDocsKey = Symbol('OBP-GroupedMessageDocs') as InjectionKey<any> // This cause an issue
export const obpApiHostKey = Symbol('OBP-API-Host') as InjectionKey<any>
export const obpGlossaryKey = Symbol('OBP-Glossary') as InjectionKey<any>
export const obpMyCollectionsEndpointKey = Symbol('OBP-MyCollectionsEndpoint') as InjectionKey<any>