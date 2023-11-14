import express from "express";
import { PrismaClient } from "@prisma/client";
import { check, validationResult } from "express-validator";
import { auth } from "../middleware/auth";
import { refresh } from "../middleware/refresh";

const prisma = new PrismaClient();

const router = express.Router();

router.get("/", async (req, res) => {
  res.send("All Holdings");
});

export default router;
