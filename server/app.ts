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
import express, { Application } from 'express'
import { useExpressServer, useContainer } from 'routing-controllers'
import { Container } from 'typedi'
import path from 'path'

const port = 8085
const app: Application = express()

// Initialize Redis client.
console.log(`--- Redis setup -------------------------------------------------`)
process.env.VITE_OBP_REDIS_URL
  ? console.log(`VITE_OBP_REDIS_URL: ${process.env.VITE_OBP_REDIS_URL}`)
  : console.log(`VITE_OBP_REDIS_URL: undefined connects to localhost on port 6379`)

const redisPassword = process.env.VITE_OBP_REDIS_PASSWORD 
  ? process.env.VITE_OBP_REDIS_PASSWORD // Redis instance is protected with a password
  : '' // Specify an empty password (i.e., no password) when connecting to Redis
if(!redisPassword) {
  console.warn(`VITE_OBP_REDIS_PASSWORD is not provided.`)
}
console.log(`-----------------------------------------------------------------`)
const redisClient = process.env.VITE_OBP_REDIS_URL
  ? createClient({ url: process.env.VITE_OBP_REDIS_URL, password: redisPassword })
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
let redisStore = new RedisStore({
  client: redisClient,
  prefix: 'api-explorer-ii:'
})

console.info(`Environment: ${app.get('env')}`)
app.use(express.json())
let sessionObject = {
  store: redisStore,
  secret: process.env.VITE_OPB_SERVER_SESSION_PASSWORD,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 300 * 1000 // 5 minutes in milliseconds
  }
}
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sessionObject.cookie.secure = true // serve secure cookies
}
app.use(session(sessionObject))
useContainer(Container)

const routePrefix = '/api'

const server = useExpressServer(app, {
  //routePrefix: '/api/v1',
  routePrefix: routePrefix,
  controllers: [path.join(__dirname + '/controllers/*.*s')],
  middlewares: [path.join(__dirname + '/middlewares/*.*s')]
})

export const instance = server.listen(port)

console.log(
  `Backend is running. You can check a status at http://localhost:${port}${routePrefix}/status`
)

export default app
