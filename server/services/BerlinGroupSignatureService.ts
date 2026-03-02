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

import { Service } from 'typedi'
import crypto from 'crypto'
import fs from 'fs'
import type { BerlinGroupConfig, BerlinGroupHeaders } from '../types/berlin-group.js'

/**
 * BerlinGroupSignatureService generates RSA-SHA256 digital signatures,
 * SHA-256 body digests, and TPP certificate headers required by
 * Berlin Group PSD2 APIs.
 *
 * Configuration is loaded from environment variables at construction.
 * If certificate files are not configured, the service gracefully degrades
 * and isEnabled() returns false.
 */
@Service()
export class BerlinGroupSignatureService {
  private privateKey: string | null = null
  private certificate: string | null = null
  private config: BerlinGroupConfig | null = null

  constructor() {
    this.loadConfig()
  }

  private loadConfig(): void {
    const privateKeyPath = process.env.VITE_BG_PRIVATE_KEY_PATH
    const certificatePath = process.env.VITE_BG_CERTIFICATE_PATH

    if (!privateKeyPath || !certificatePath) {
      console.log('BerlinGroupSignatureService: Certificate paths not configured, signing disabled')
      return
    }

    try {
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8')
      this.certificate = fs.readFileSync(certificatePath, 'utf8')

      this.config = {
        privateKeyPath,
        certificatePath,
        keyId: process.env.VITE_BG_KEY_ID || 'SN=unknown, CA=CN=unknown',
        apiVersion: process.env.VITE_BG_API_VERSION || 'v1.3',
        psuDeviceId: process.env.VITE_BG_PSU_DEVICE_ID || 'device-api-explorer-ii',
        psuDeviceName: process.env.VITE_BG_PSU_DEVICE_NAME || 'API-Explorer-II',
        psuIpAddress: process.env.VITE_BG_PSU_IP_ADDRESS || '127.0.0.1',
        tppRedirectUri: process.env.VITE_BG_TPP_REDIRECT_URI || '',
        tppNokRedirectUri: process.env.VITE_BG_TPP_NOK_REDIRECT_URI || ''
      }

      console.log('BerlinGroupSignatureService: Private key and certificate loaded successfully')
    } catch (error: any) {
      console.error('BerlinGroupSignatureService: Failed to load certificate files:', error.message)
      this.privateKey = null
      this.certificate = null
      this.config = null
    }
  }

  /**
   * Check if Berlin Group signing is enabled (certificates are loaded)
   */
  isEnabled(): boolean {
    return this.privateKey !== null && this.certificate !== null && this.config !== null
  }

  /**
   * Get the configured Berlin Group API version
   */
  getApiVersion(): string {
    return this.config?.apiVersion || 'v1.3'
  }

  /**
   * Detect whether a request path is a Berlin Group API path
   */
  static isBerlinGroupPath(path: string): boolean {
    return path.includes('/berlin-group/')
  }

  /**
   * Generate all required Berlin Group PSD2 headers for a request
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE)
   * @param body - Request body (empty string for GET/DELETE)
   * @param consentId - Optional Consent-ID for account data endpoints
   * @returns Object containing all required Berlin Group headers
   */
  generateHeaders(
    method: string,
    body: string,
    consentId?: string
  ): BerlinGroupHeaders {
    if (!this.privateKey || !this.certificate || !this.config) {
      throw new Error('BerlinGroupSignatureService: Cannot generate headers - not configured')
    }

    // Use empty string body for GET and DELETE requests
    const effectiveBody = method === 'GET' || method === 'DELETE' ? '' : body

    // Generate Date in RFC 7231 format
    const dateHeader = new Date().toUTCString()

    // Generate UUID v4 for X-Request-ID
    const xRequestId = crypto.randomUUID()

    // Compute SHA-256 digest of the body
    const digestValue = crypto.createHash('sha256').update(effectiveBody).digest('base64')
    const digestHeader = `SHA-256=${digestValue}`

    // Create the string to sign per PSD2 spec
    const dataToSign = `digest: ${digestHeader}\ndate: ${dateHeader}\nx-request-id: ${xRequestId}`

    // Sign with RSA-SHA256
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(dataToSign)
    sign.end()
    const signature = sign.sign(this.privateKey, 'base64')

    // Build Signature header
    const signatureHeader = `keyId="${this.config.keyId}", algorithm="rsa-sha256", headers="digest date x-request-id", signature="${signature}"`

    // Base64-encode the certificate
    const certificateBase64 = Buffer.from(this.certificate).toString('base64')

    // Build headers object
    const headers: BerlinGroupHeaders = {
      'Content-Type': 'application/json',
      Date: dateHeader,
      'X-Request-ID': xRequestId,
      Digest: digestHeader,
      Signature: signatureHeader,
      'TPP-Signature-Certificate': certificateBase64,
      'PSU-Device-ID': this.config.psuDeviceId,
      'PSU-Device-Name': this.config.psuDeviceName,
      'PSU-IP-Address': this.config.psuIpAddress
    }

    // Add redirect URIs for POST requests
    if (method === 'POST' && this.config.tppRedirectUri) {
      headers['TPP-Redirect-URI'] = this.config.tppRedirectUri
    }
    if (method === 'POST' && this.config.tppNokRedirectUri) {
      headers['TPP-Nok-Redirect-URI'] = this.config.tppNokRedirectUri
    }

    // Add Consent-ID when provided
    if (consentId) {
      headers['Consent-ID'] = consentId
    }

    console.log(`BerlinGroupSignatureService: Generated headers for ${method} request`)
    console.log(`  X-Request-ID: ${xRequestId}`)
    console.log(`  Digest: ${digestHeader}`)

    return headers
  }
}
