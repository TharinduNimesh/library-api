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

const holdingValidation = [
  check("serial_no").isNumeric().withMessage("Invalid serial no"),
  check("issue_id").isNumeric().withMessage("Invalid issue id"),
];

router.post("/new", [auth, refresh, holdingValidation], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array() });
  }

  // Check if issue exists
  const issue = await prisma.issue.findUnique({
    where: {
      id: req.body.issue_id,
    },
  });

  // reuturn error if serial no already exists
  const holdingExists = await prisma.holding.findFirst({
    where: {
      serial_no: req.body.serial_no.toString(),
    },
  });

  if (holdingExists) {
    return res.status(400).json({ message: "Serial no already exists" });
  }

  if (!issue) {
    return res.status(400).json({ message: "Issue does not exist" });
  }

  // Create new holding
  const holding = await prisma.holding.create({
    data: {
      serial_no: req.body.serial_no.toString(),
      issue_id: req.body.issue_id,
      reserved_at: new Date(),
    },
  });

  res.json({
    message: "Holding created",
    access_token: req.access_token,
    holding,
  });
});

const deleteHoldingValidation = [
  check("reason").notEmpty().withMessage("Reason Cannot Be Empty"),
];

router.delete(
  "/:id",
  [auth, refresh, deleteHoldingValidation],
  async (req, res) => {
    // validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array(),
      });
    }

    // check if holding exists
    const holding = await prisma.holding.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });

    if (!holding) {
      return res.status(400).json({
        message: "Holding does not exist",
      });
    }

    if (holding.is_removed) {
      return res.status(400).json({
        message: "Holding already removed",
      });
    }

    // prisma update holdings removed at columns to 1
    await prisma.holding.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: {
        is_removed: 1,
      },
    });

    // Add Removed Record
    await prisma.removed.create({
      data: {
        holding_id: parseInt(req.params.id),
        reason: req.body.reason,
        removed_at: new Date(),
        removed_by: req.user.id,
      },
    });

    res.json({
      message: "Holding deleted",
      access_token: req.access_token,
    });
  }
);

export default router;
