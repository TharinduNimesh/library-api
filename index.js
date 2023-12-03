import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

// Routes
import authRouter from "./router/auth";
import issueRouter from "./router/issue";
import holdingsRouter from "./router/holdings";
import membersRouter from "./router/members";
import reservationRouter from "./router/reservation";
import indexRouter from "./router/index";

// Middlewares
import { auth } from "./middleware/auth";
import { refresh } from "./middleware/refresh";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/validate", [auth, refresh], (req, res) => {
  res.json({
    access_token: req.access_token,
  });
});

app.use("/auth", authRouter);
app.use("/issues", issueRouter);
app.use("/holdings", holdingsRouter);
app.use("/members", membersRouter);
app.use("/reservation", reservationRouter);
app.use("/", indexRouter);

app.get("/authors", [auth, refresh], async (req, res) => {
  const authors = await prisma.author.findMany();

  res.json({authors});
});

app.listen(8080);

console.log("API running on http://localhost:8080");
