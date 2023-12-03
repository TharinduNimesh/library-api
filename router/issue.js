import express from "express";
import { PrismaClient } from "@prisma/client";
import { check, validationResult } from "express-validator";
import { auth } from "../middleware/auth";
import { refresh } from "../middleware/refresh";

const prisma = new PrismaClient();

const router = express.Router();

router.get("/", [auth, refresh], async (req, res) => {
  let issues = await prisma.issue.findMany({
    include: {
      Author: true,
      Holding: {
        include: {
          Reservation: true,
        },
      },
    },
  });

  issues = issues.map((issue) => {
    return {
      id: issue.id,
      title: issue.title,
      author: issue.Author.name,
      copies: issue.Holding.length,
      available: issue.Holding.filter((holding) => {
        if (holding.is_removed) {
          return false;
        }
        let is_received = true;
        holding.Reservation.forEach((reservation) => {
          if (!reservation.is_received) {
            is_received = false;
          }
        });
        return is_received ? holding : null;
      }).length,
      holdings: issue.Holding,
    };
  });

  const removedHoldings = await prisma.removed_Holding.findMany({
    include: {
      Holding: {
        include: {
          Issue: {
            include: {
              Author: true,
            },
          },
        },
      },
      User: true,
    },
  });

  res.json({
    issues,
    removedHoldings,
  });
});

const issueValidationRules = [
  check("title").notEmpty().withMessage("Title Cannot Be Empty"),
  check("author").notEmpty().withMessage("Author Cannot Be Empty"),
];

router.post("/new", [auth, refresh, issueValidationRules], async (req, res) => {
  // Validate Request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array(),
    });
  }

  let author = req.body.author;
  // Check Author, If not exists add to the database
  if (isNaN(author)) {
    // Check if author exists 
    const isAuthorExists = await prisma.author.findFirst({
      where: {
        name: author,
      },
    });

    // If author exists, get the id else create new author 
    if (isAuthorExists) {
      author = isAuthorExists.id;
    } else {
      author = await prisma.author.create({
        data: {
          name: author,
        },
      });
      author = author.id;
    }
  }

  // Check The Issue exists or not.
  const isExist = await prisma.issue.findFirst({
    where: {
      AND: [
        {
          title: req.body.title,
        },
        {
          author_id: parseInt(author),
        },
      ],
    },
  });

  if (isExist != null) {
    return res.status(400).json({
      message: "This Issue Already Exists, Please Recheck!",
    });
  }

  // Add New Issue
  const issue = await prisma.issue.create({
    data: {
      title: req.body.title,
      author_id: parseInt(author),
    },
  });

  res.json({
    message: "New Issue Created",
    access_token: req.access_token,
    issue,
  });
});

export default router;
