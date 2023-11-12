// Dependencies
import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";

// Routes
import auth from './routes/auth';

// Config
const prisma = new PrismaClient();
const port = 3000;

const app = new Elysia();

app.use(auth)

app.listen(port);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
