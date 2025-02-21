import app, { instance } from '../server/app';
import request from 'supertest';
import http from 'node:http';
import { UserInput } from '../server/schema/OpeySchema';
import {v4 as uuidv4} from 'uuid';
import { agent } from "superagent";
import fetch from 'node-fetch';


const BEFORE_ALL_TIMEOUT = 30000; // 30 sec
const SERVER_URL = process.env.VITE_OBP_API_EXPLORER_HOST

describe('GET /api/opey', () => {
    let response: Response;
    
    it('Should return 200', async () => {
        const response = await request(app)
            .get("/api/opey")
            .set('Content-Type', 'application/json')

        expect(response.status).toBe(200);
    });
});

describe('GET /api/opey/invoke', () => {
    let response;

    let userInput: UserInput = {
        message: "Hello Opey",
        thread_id: uuidv4(),
        is_tool_call_approval: false
    }

    beforeAll(async () => {
        // Make the invoke request
        response = await request(app)
            .post("/api/opey/invoke")
            .send(userInput)
            .set('Content-Type', 'application/json')
    })

    it('Should return 200', async () => {
        expect(response.status).toBe(200);
    });

    it('Should return a message if not a tool call approval', async () => {
        if (!response.body.tool_approval_request) {
            expect(response.body.content).toBeTruthy();
        }
    })
})

describe('POST /api/opey/stream', () => {

    let data: Array<string> = [];
    let res;

    let userInput: UserInput = {
        message: "Hello Opey",
        thread_id: uuidv4(),
        is_tool_call_approval: false
    }


    beforeAll(async () => {
        app.listen(5173)
    });

    afterAll(async () => {
        instance.close()
    });

    it
    
    it('Should stream response', async () => {

        try {
            const response = await fetch(`${SERVER_URL}/api/opey/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'connection': 'keep-alive'
                },
                body: JSON.stringify(userInput),
            });

            console.log(`Response in test: ${response.body}`)
            const stream = response.body

            stream.on('data', (chunk) => {
                console.log(`chunk: ${chunk}`)
                // check if chunk is not empty
                expect(chunk).toBeTruthy()
            })
            stream.on('end', () => {
                console.log('Stream ended')
            })
            stream.on('error', (error) => {
                console.error(`Error in stream: ${error}`)
            })

            res = response;

            await expect(res.status).toBe(200)

        } catch (error) {
            console.error(`Error fetching stream from test: ${error}`)
        }

        

    
        
    })
});