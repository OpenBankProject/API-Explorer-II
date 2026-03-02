/*
 * Open Bank Project - API Explorer II
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

/**
 * Well-known URI from OBP API /obp/v[version]/well-known endpoint
 */
export interface WellKnownUri {
  provider: string // e.g., "obp-oidc", "keycloak"
  url: string // e.g., "http://localhost:9000/obp-oidc/.well-known/openid-configuration"
}

/**
 * Response from OBP API well-known endpoint
 */
export interface WellKnownResponse {
  well_known_uris: WellKnownUri[]
}

/**
 * Provider configuration strategy
 */
export interface ProviderStrategy {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes?: string[]
}

/**
 * Provider status information
 */
export interface ProviderStatus {
  name: string
  available: boolean
  lastChecked: Date
  error?: string
}

/**
 * OpenID Connect Discovery Configuration
 * As defined in OpenID Connect Discovery 1.0
 * @see https://openid.net/specs/openid-connect-discovery-1_0.html
 */
export interface OIDCConfiguration {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  registration_endpoint?: string
  scopes_supported?: string[]
  response_types_supported?: string[]
  response_modes_supported?: string[]
  grant_types_supported?: string[]
  subject_types_supported?: string[]
  id_token_signing_alg_values_supported?: string[]
  token_endpoint_auth_methods_supported?: string[]
  claims_supported?: string[]
  code_challenge_methods_supported?: string[]
}

/**
 * Token response from OAuth2 token endpoint
 */
export interface TokenResponse {
  accessToken: string
  refreshToken?: string
  idToken?: string
  tokenType: string
  expiresIn?: number
  scope?: string
}

/**
 * User information from OIDC UserInfo endpoint
 */
export interface UserInfo {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  middle_name?: string
  nickname?: string
  preferred_username?: string
  profile?: string
  picture?: string
  website?: string
  email?: string
  email_verified?: boolean
  gender?: string
  birthdate?: string
  zoneinfo?: string
  locale?: string
  phone_number?: string
  phone_number_verified?: boolean
  address?: {
    formatted?: string
    street_address?: string
    locality?: string
    region?: string
    postal_code?: string
    country?: string
  }
  updated_at?: number
  [key: string]: any
}
