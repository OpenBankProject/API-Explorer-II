// DEFAULT_OBP_API_VERSION is used in case the environment variable VITE_OBP_API_VERSION is not set
export const DEFAULT_OBP_API_VERSION = 'v5.1.0'

// Hardcoded API versions for all application endpoints
// Using v5.1.0 as the standard stable version - more stable than v6.0.0 and bugs can be fixed
// These versions should NOT change based on user's documentation version selection in the UI

/**
 * Resource documentation endpoint version
 * Endpoint: GET /obp/{version}/resource-docs/{docVersion}/obp
 */
export const RESOURCE_DOCS_API_VERSION = 'v5.1.0'

/**
 * Message documentation endpoint version
 * Endpoint: GET /obp/{version}/message-docs/{connector}
 */
export const MESSAGE_DOCS_API_VERSION = 'v5.1.0'

/**
 * API versions list endpoint version
 * Endpoint: GET /obp/{version}/api/versions
 */
export const API_VERSIONS_LIST_API_VERSION = 'v6.0.0'

/**
 * Glossary endpoint version
 * Endpoint: GET /obp/{version}/api/glossary
 */
export const GLOSSARY_API_VERSION = 'v5.1.0'
