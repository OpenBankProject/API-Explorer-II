import 'reflect-metadata'
import 'dotenv/config'
import session from 'express-session'
import express, { Application } from 'express'
import { useExpressServer, useContainer } from 'routing-controllers'
import { Container } from 'typedi'
import path from 'path'

const port = 8085
const app: Application = express()
const host = process.env.VITE_OBP_EXPLORER_HOST
const httpsOrNot = host ? host.indexOf("https://") == 0 ? true : false : true

app.use(express.json())
app.use(
  session({
    secret: process.env.VITE_OPB_SERVER_SESSION_PASSWORD,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 300*1000, // 5 minutes in milliseconds
    }
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
