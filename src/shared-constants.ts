// DEFAULT_OBP_API_VERSION is used in case the environment variable VITE_OBP_API_VERSION is not set
export const DEFAULT_OBP_API_VERSION = 'v5.1.0'

// Hardcoded API versions for all application endpoints
// Using v7.0.0 for resource-docs and api/versions — both endpoints are migrated to http4s.
// These versions should NOT change based on user's documentation version selection in the UI

/**
 * Resource documentation endpoint version
 * Endpoint: GET /obp/{version}/resource-docs/{docVersion}/obp
 * v7.0.0 getResourceDocsObpV700 accepts any valid API version string and delegates to the correct doc set.
 */
export const RESOURCE_DOCS_API_VERSION = 'v7.0.0'

/**
 * Message documentation endpoint version
 * Endpoint: GET /obp/{version}/message-docs/{connector}
 */
export const MESSAGE_DOCS_API_VERSION = 'v5.1.0'

/**
 * API versions list endpoint version
 * Endpoint: GET /obp/{version}/api/versions
 * v7.0.0 getScannedApiVersions is migrated to http4s.
 */
export const API_VERSIONS_LIST_API_VERSION = 'v7.0.0'

/**
 * Glossary endpoint version
 * Endpoint: GET /obp/{version}/api/glossary
 */
export const GLOSSARY_API_VERSION = 'v5.1.0'

/**
 * Plain version-string constants. No semantic meaning — these just represent
 * a version literal so callers can avoid hardcoding the string.
 */
export const V5_1_0 = 'v5.1.0'
export const V6_0_0 = 'v6.0.0'

/**
 * Browser → Node SSE transport probe (see /api/status/stream and the status
 * page's browser-side check). The server emits SSE_PROBE_EVENT_COUNT events
 * SSE_PROBE_SPACING_MS apart; the browser judges the transport buffered when
 * they arrive closer together than half that spacing.
 */
export const SSE_PROBE_PATH = '/api/status/stream'
export const SSE_PROBE_EVENT_COUNT = 2
export const SSE_PROBE_SPACING_MS = 700
