import 'reflect-metadata'
import 'dotenv/config'
import session from 'express-session'
import express, { Application } from 'express'
import { useExpressServer, useContainer } from 'routing-controllers'
import { Container } from 'typedi'
import path from 'path'

const port = 8085
const app: Application = express()
app.use(express.json())
app.use(
  session({
    secret: process.env.VITE_OPB_SERVER_SESSION_PASSWORD,
    resave: false,
    saveUninitialized: true
  })
)
useContainer(Container)

const server = useExpressServer(app, {
  //routePrefix: '/api/v1',
  routePrefix: '/api',
  controllers: [path.join(__dirname + '/controllers/*.ts')],
  middlewares: [path.join(__dirname + '/middlewares/*.ts')]
})

export const instance = server.listen(port)

console.log('Server running at http://localhost:' + port)

export default app
