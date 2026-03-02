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

import 'reflect-metadata'
import 'dotenv/config'
import session from 'express-session'
import RedisStore from 'connect-redis'
import { createClient } from 'redis'
import express from 'express'
import type { Application } from 'express'
import { Container } from 'typedi'
import path from 'path'
import { execSync } from 'child_process'
import { OAuth2ProviderManager } from './services/OAuth2ProviderManager.js'
import { BerlinGroupSignatureService } from './services/BerlinGroupSignatureService.js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Controllers removed - all routes migrated to plain Express

// Import routes (plain Express, not routing-controllers)
import oauth2Routes from './routes/oauth2.js'
import userRoutes from './routes/user.js'
import statusRoutes from './routes/status.js'
import obpRoutes from './routes/obp.js'
import opeyRoutes from './routes/opey.js'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const port = 8085
const app: Application = express()

// Commit ID variable (declared here to avoid TDZ issues)
let commitId = ''

// Initialize Redis client.
console.log(`--- Redis setup -------------------------------------------------`)
process.env.VITE_OBP_REDIS_URL
  ? console.log(`VITE_OBP_REDIS_URL: ${process.env.VITE_OBP_REDIS_URL}`)
  : console.log(`VITE_OBP_REDIS_URL: undefined connects to localhost on port 6379`)

const redisPassword = process.env.VITE_OBP_REDIS_PASSWORD
  ? process.env.VITE_OBP_REDIS_PASSWORD // Redis instance is protected with a password
  : '' // Specify an empty password (i.e., no password) when connecting to Redis
if (!redisPassword) {
  console.warn(`VITE_OBP_REDIS_PASSWORD is not provided.`)
}
const redisUsername = process.env.VITE_OBP_REDIS_USERNAME
  ? process.env.VITE_OBP_REDIS_USERNAME // Redis instance is protected with a username/password
  : '' // Specify an empty username (i.e., no username) when connecting to Redis
if (!redisUsername) {
  console.warn(`VITE_OBP_REDIS_USERNAME is not provided.`)
}
console.log(`-----------------------------------------------------------------`)
const redisClient = process.env.VITE_OBP_REDIS_URL
  ? createClient({
      url: process.env.VITE_OBP_REDIS_URL,
      username: redisUsername,
      password: redisPassword
    })
  : createClient()
redisClient.connect().catch(console.error)

const redisUrl = process.env.VITE_OBP_REDIS_URL
  ? process.env.VITE_OBP_REDIS_URL
  : 'localhost on port 6379'

// Provide feedback in case of successful connection to Redis
redisClient.on('connect', () => {
  console.log(`Connected to Redis instance: ${redisUrl}`)
})
// Provide feedback in case of unsuccessful connection to Redis
redisClient.on('error', (err) => {
  console.error(`Error connecting to Redis instance: ${redisUrl}`, err)
})

// Initialize store.
// Calculate session max age in seconds (for Redis TTL)
const sessionMaxAgeSeconds = process.env.VITE_SESSION_MAX_AGE
  ? parseInt(process.env.VITE_SESSION_MAX_AGE)
  : 60 * 60 // Default: 1 hour in seconds

// CRITICAL: Set Redis TTL to match session maxAge
// Without this, Redis uses its own default TTL which may expire sessions prematurely
let redisStore = new RedisStore({
  client: redisClient,
  prefix: 'api-explorer-ii:',
  ttl: sessionMaxAgeSeconds // TTL in seconds - MUST match cookie maxAge
})

console.info(`Environment: ${app.get('env')}`)
console.info(
  `Session maxAge configured: ${sessionMaxAgeSeconds} seconds (${sessionMaxAgeSeconds / 60} minutes)`
)
app.use(express.json())
let sessionObject = {
  store: redisStore,
  name: 'obp-api-explorer-ii.sid', // CRITICAL: Unique cookie name to prevent conflicts with other apps on localhost
  secret: process.env.VITE_OBP_SERVER_SESSION_PASSWORD,
  resave: false,
  saveUninitialized: false, // Don't save empty sessions (better for authenticated apps)
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: sessionMaxAgeSeconds * 1000 // maxAge in milliseconds
  }
}
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sessionObject.cookie.secure = true // serve secure cookies
}
app.use(session(sessionObject))

// OAuth2 Multi-Provider Setup only - no legacy fallback

// Async IIFE to initialize OAuth2 and start server
let instance: any
;(async function initializeAndStartServer() {
  // Initialize Multi-Provider OAuth2 Manager
  console.log('--- OAuth2 Multi-Provider Setup ---------------------------------')
  const providerManager = Container.get(OAuth2ProviderManager)

  try {
    const success = await providerManager.initializeProviders()

    if (success) {
      const availableProviders = providerManager.getAvailableProviders()
      console.log(`OK Initialized ${availableProviders.length} OAuth2 providers:`)
      availableProviders.forEach((name) => console.log(`  - ${name}`))

      // Start health monitoring
      providerManager.startHealthCheck(60000) // Check every 60 seconds
      console.log('OK Provider health monitoring started (every 60s)')
    } else {
      console.error('ERROR: No OAuth2 providers initialized from OBP API')
      console.error(
        'ERROR: Check that OBP API is running and returns providers from /obp/v5.1.0/well-known'
      )
      console.error('ERROR: Server will start but login will not work')
    }
  } catch (error) {
    console.error('ERROR Failed to initialize OAuth2 multi-provider:', error)
    console.error('ERROR: Server will start but login will not work')
  }
  console.log(`-----------------------------------------------------------------`)

  // Berlin Group TPP Signature Certificate Setup
  console.log('--- Berlin Group TPP Signature Certificate -----------------------')
  const bgService = Container.get(BerlinGroupSignatureService)
  if (bgService.isEnabled()) {
    console.log('OK Berlin Group TPP Signature Certificate is configured and loaded')
    console.log(`  API Version: ${bgService.getApiVersion()}`)
  } else {
    console.log('Berlin Group TPP Signature Certificate is NOT configured')
    console.log('  Set VITE_BG_PRIVATE_KEY_PATH and VITE_BG_CERTIFICATE_PATH to enable')
  }
  console.log(`-----------------------------------------------------------------`)

  const routePrefix = '/api'

  // Register all routes (plain Express)
  app.use(routePrefix, oauth2Routes)
  app.use(routePrefix, userRoutes)
  app.use(routePrefix, statusRoutes)
  app.use(routePrefix, obpRoutes)
  app.use(routePrefix, opeyRoutes)
  console.log('OAuth2 routes registered (plain Express)')
  console.log('User routes registered (plain Express)')
  console.log('Status routes registered (plain Express)')
  console.log('OBP routes registered (plain Express)')
  console.log('Opey routes registered (plain Express)')
  console.log('All routes migrated to plain Express - routing-controllers removed')

  instance = app.listen(port)

  console.log(
    `Backend is running. You can check a status at http://localhost:${port}${routePrefix}/status`
  )

  // Get commit ID
  try {
    // Try to get the commit ID
    commitId = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    console.log('Current Commit ID:', commitId)
  } catch (error: any) {
    // Log the error but do not terminate the process
    console.error('Warning: Failed to retrieve the commit ID. Proceeding without it.')
    console.error('Error details:', error.message)
    commitId = 'unknown' // Assign a fallback value
  }
  // Continue execution with or without a valid commit ID
  console.log('Execution continues with commitId:', commitId)

  // Error Handling to Shut Down the App
  instance.on('error', (err) => {
    redisClient.disconnect()
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`)
      process.exit(1)
      // Shut down the app
    } else {
      console.error('An error occurred:', err)
    }
  })
})()

// Export instance for use in other modules
export { instance, commitId }

export default app
