import "reflect-metadata";
import "dotenv/config";
import session from "express-session";
import express, { Application } from "express";
import { useExpressServer, useContainer } from "routing-controllers";
import { Container } from "typedi";
import path from "path";

const app: Application = express();
app.use(express.json());
app.use(
  session({
    secret: "very secret",
    resave: false,
    saveUninitialized: true,
  })
);
useContainer(Container);

const server = useExpressServer(app, {
  controllers: [path.join(__dirname + "/controllers/*.ts")],
  middlewares: [path.join(__dirname + "/middlewares/*.ts")],
});

export const instance = server.listen(3000);

console.log("Server running at http://localhost:3000");

export default app;
