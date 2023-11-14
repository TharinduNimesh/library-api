import express from "express";
import cors from "cors";

// Routes
import authRouter from "./router/auth";
import issueRouter from "./router/issue";
import holdingsRouter from "./router/holdings";

// Middlewares
import { auth } from "./middleware/auth";
import { refresh } from "./middleware/refresh";

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

app.listen(8080);

console.log("API running on http://localhost:8080");
