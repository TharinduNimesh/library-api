import express from "express";
import { PrismaClient } from "@prisma/client";
import { check, validationResult } from "express-validator";
import { auth } from "../middleware/auth";
import { refresh } from "../middleware/refresh";

const prisma = new PrismaClient();

const router = express.Router();

const holdingValidation = [
  check("serial_no").notEmpty().withMessage("Invalid serial no"),
  check("issue_id").notEmpty().withMessage("Invalid issue id"),
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
      id: parseInt(req.body.issue_id),
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
      issue_id: parseInt(req.body.issue_id),
      reserved_at: new Date(),
    },
  });

  res.json({
    message: "Holding created",
    access_token: req.access_token,
    holding,
  });
});

router.get("/available/:id", [auth, refresh], async (req, res) => {
  if (isNaN(req.params.id)) {
    return res.status(400).json({
      message: "Invalid issue id",
    });
  }

  const holding = await prisma.holding.findFirst({
    where: {
      serial_no: req.params.id,
      is_removed: 0,
    },
    include: {
      Issue: true,
    },
  });

  if (!holding) {
    return res.json({
      status: false,
    });
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      holding_id: holding.id,
      is_received: 0,
    },
  });

  if (reservation) {
    return res.json({
      status: false,
    });
  }

  res.json({
    status: true,
    title: holding.Issue.title,
  });
});

router.get("/:issue", [auth, refresh], async (req, res) => {
  const issue = await prisma.issue.findMany({
    where: {
      id: parseInt(req.params.issue),
    },
    include: {
      Holding: true,
    },
  });

  res.json({
    holdings: issue,
    access_token: req.access_token,
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
    const holding = await prisma.holding.findFirst({
      where: {
        serial_no: req.params.id,
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
        id: holding.id,
      },
      data: {
        is_removed: 1,
      },
    });

    // Add Removed Record
    await prisma.removed_Holding.create({
      data: {
        holding_id: holding.id,
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
