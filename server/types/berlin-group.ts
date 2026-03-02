/*
 * Open Bank Project - API Explorer II
 * Copyright (C) 2023-2025, TESOBE GmbH
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
 * Configuration loaded from environment variables for Berlin Group TPP signing
 */
export interface BerlinGroupConfig {
  privateKeyPath: string
  certificatePath: string
  keyId: string
  apiVersion: string
  psuDeviceId: string
  psuDeviceName: string
  psuIpAddress: string
  tppRedirectUri: string
  tppNokRedirectUri: string
}

/**
 * Headers generated for a Berlin Group PSD2 API request
 */
export interface BerlinGroupHeaders {
  Date: string
  'X-Request-ID': string
  Digest: string
  Signature: string
  'TPP-Signature-Certificate': string
  'PSU-Device-ID': string
  'PSU-Device-Name': string
  'PSU-IP-Address': string
  'Content-Type': string
  'TPP-Redirect-URI'?: string
  'TPP-Nok-Redirect-URI'?: string
  'Consent-ID'?: string
}

/**
 * Berlin Group session data passed from routes to OBPClientService
 */
export interface BerlinGroupSessionData {
  consentId?: string
}
