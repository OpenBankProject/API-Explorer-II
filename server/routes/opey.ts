/*
 * Open Bank Project -  API Explorer II
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

import { Router } from 'express'
import type { Request, Response } from 'express'
import { Readable } from 'node:stream'
import { ReadableStream as WebReadableStream } from 'stream/web'
import { Container } from 'typedi'
import OBPClientService from '../services/OBPClientService.js'
import OpeyClientService from '../services/OpeyClientService.js'
import OBPConsentsService from '../services/OBPConsentsService.js'
import { UserInput } from '../schema/OpeySchema.js'

const router = Router()

// Get services from container
const obpClientService = Container.get(OBPClientService)
const opeyClientService = Container.get(OpeyClientService)
const obpConsentsService = Container.get(OBPConsentsService)

/**
 * Helper function to convert web stream to Node.js stream
 */
function safeFromWeb(webStream: WebReadableStream<any>): Readable {
  if (typeof Readable.fromWeb === 'function') {
    return Readable.fromWeb(webStream)
  } else {
    console.warn('Readable.fromWeb is not available, using a polyfill')

    // Create a Node.js Readable stream
    const nodeReadable = new Readable({
      read() {}
    })

    // Pump data from webreadable to node readable stream
    const reader = webStream.getReader()

    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            nodeReadable.push(null) // end stream
            break
          }

          nodeReadable.push(value)
        }
      } catch (error) {
        console.error('Error reading from web stream:', error)
        nodeReadable.destroy(error instanceof Error ? error : new Error(String(error)))
      }
    })()

    return nodeReadable
  }
}

/**
 * GET /opey
 * Check Opey chatbot status
 */
router.get('/opey', async (req: Request, res: Response) => {
  try {
    const opeyStatus = await opeyClientService.getOpeyStatus()
    console.log('Opey status: ', opeyStatus)
    res.status(200).json({ status: 'Opey is running' })
  } catch (error) {
    console.error('Error in /opey endpoint: ', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * POST /opey/stream
 * Stream chatbot responses
 * Body: { message, thread_id, is_tool_call_approval }
 */
router.post('/opey/stream', async (req: Request, res: Response) => {
  try {
    const session = req.session as any

    if (!session) {
      console.error('Session not found')
      return res.status(401).json({ error: 'Session Time Out' })
    }

    // Check if the consent is in the session
    const opeyConfig = session.opeyConfig
    if (!opeyConfig) {
      console.error('Opey config not found in session')
      return res.status(500).json({ error: 'Internal Server Error' })
    }

    // Read user input from request body
    let user_input: UserInput
    try {
      console.log('Request body: ', req.body)
      user_input = {
        message: req.body.message,
        thread_id: req.body.thread_id,
        is_tool_call_approval: req.body.is_tool_call_approval
      }
    } catch (error) {
      console.error('Error in stream endpoint, could not parse into UserInput: ', error)
      return res.status(500).json({ error: 'Internal Server Error' })
    }

    // Transform to decode and log the stream
    const frontendTransformer = new TransformStream({
      transform(chunk, controller) {
        // Decode the chunk to a string
        const decodedChunk = new TextDecoder().decode(chunk)

        console.log('Sending chunk', decodedChunk)
        controller.enqueue(decodedChunk)
      },
      flush(controller) {
        console.log('[flush]')
        // Close ReadableStream when done
        controller.terminate()
      }
    })

    let stream: ReadableStream | null = null

    try {
      // Read web stream from OpeyClientService
      console.log('Calling OpeyClientService.stream')
      stream = await opeyClientService.stream(user_input, opeyConfig)
    } catch (error) {
      console.error('Error reading stream: ', error)
      return res.status(500).json({ error: 'Internal Server Error' })
    }

    if (!stream) {
      console.error('Stream is not received or not readable')
      return res.status(500).json({ error: 'Internal Server Error' })
    }

    // Transform our stream
    const frontendStream: ReadableStream = stream.pipeThrough(frontendTransformer)

    const nodeStream = safeFromWeb(frontendStream as WebReadableStream<any>)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    nodeStream.pipe(res)

    // Handle stream completion
    nodeStream.on('end', () => {
      console.log('Stream ended successfully')
    })

    nodeStream.on('error', (error) => {
      console.error('Stream error:', error)
    })

    // Add a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn('Stream timeout reached')
      nodeStream.destroy()
    }, 30000)

    // Clear the timeout when stream ends
    nodeStream.on('end', () => clearTimeout(timeout))
    nodeStream.on('error', () => clearTimeout(timeout))
  } catch (error) {
    console.error('Error in /opey/stream:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' })
    }
  }
})

/**
 * POST /opey/invoke
 * Invoke chatbot without streaming
 * Body: { message, thread_id, is_tool_call_approval }
 */
router.post('/opey/invoke', async (req: Request, res: Response) => {
  try {
    const session = req.session as any

    // Check if the consent is in the session
    const opeyConfig = session.opeyConfig
    if (!opeyConfig) {
      console.error('Opey config not found in session')
      return res.status(500).json({ error: 'Internal Server Error' })
    }

    let user_input: UserInput
    try {
      user_input = {
        message: req.body.message,
        thread_id: req.body.thread_id,
        is_tool_call_approval: req.body.is_tool_call_approval
      }
    } catch (error) {
      console.error('Error in invoke endpoint, could not parse into UserInput: ', error)
      return res.status(500).json({ error: 'Internal Server Error' })
    }

    const opey_response = await opeyClientService.invoke(user_input, opeyConfig)
    res.status(200).json(opey_response)
  } catch (error) {
    console.error('Error in /opey/invoke:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * POST /opey/consent
 * Retrieve or create a consent for Opey to access OBP on user's behalf
 */
router.post('/opey/consent', async (req: Request, res: Response) => {
  try {
    const session = req.session as any

    // Create consent as logged in user
    const opeyConfig = await opeyClientService.getOpeyConfig()
    session.opeyConfig = opeyConfig

    // Check if user already has a consent for opey
    const consentId = await obpConsentsService.getExistingOpeyConsentId(session)

    if (consentId) {
      console.log('Existing consent ID: ', consentId)
      // If we have a consent id, we can get the consent from OBP
      const consent = await obpConsentsService.getConsentByConsentId(session, consentId)

      return res.status(200).json({ consent_id: consent.consent_id, jwt: consent.jwt })
    } else {
      console.log('No existing consent ID found')
    }

    await obpConsentsService.createConsent(session)

    console.log('Consent at controller: ', session.opeyConfig)

    const authConfig = session.opeyConfig?.authConfig

    res.status(200).json({
      consent_id: authConfig?.obpConsent.consent_id,
      jwt: authConfig?.obpConsent.jwt
    })
  } catch (error) {
    console.error('Error in /opey/consent endpoint: ', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
