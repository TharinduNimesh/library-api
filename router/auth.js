import express from "express";
import { PrismaClient } from "@prisma/client";
import { check, validationResult } from "express-validator";
import jwt from "jsonwebtoken";

const router = express.Router();
const prisma = new PrismaClient();

// Login Validation Rules
const loginValidation = [
  check("email").isEmail().withMessage("Invalid Email Address"),
  check("password").notEmpty().withMessage("Password Is Required"),
];

router.post("/login", loginValidation, async (req, res) => {
  // Validate Request
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array(),
    });
  }

  // Search User From DB
  const user = await prisma.user.findFirst({
    where: {
      email: req.body.email,
    },
  });

  //   Send An Error If User Doesn't Exist
  if (!user) {
    return res.status(404).json({
      message: "There is no user with the given email address",
    });
  }

  //   Check The Status OF The User
  if (user.removed_at !== null) {
    return res.status(403).json({
      message: "Your Account Has Been suspended.",
    });
  }

  //   Check Is Password Valid Or Not
  const isCorrect = await Bun.password.verify(req.body.password, user.password);

  if (isCorrect) {
    const access_token = generateAccessToken(user);
    const refresh_token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
      },
      process.env.REFRESH_TOKEN
    );

    // Store Refresh Token In DB
    await prisma.refresh_Token.create({
      data: {
        token: refresh_token,
      },
    });

    return res.json({
      message: "Login Success",
      access_token,
      refresh_token,
    });
  }

  return res.status(403).json({
    message: "Invalid Login Credentials!",
  });
});

// Register Validation Rules
const registerValidation = [
  check("name").notEmpty().withMessage("Name Is Required"),
  check("email").isEmail().withMessage("Please Use A Valid Email Address"),
  check("password")
    .isStrongPassword()
    .withMessage("Please Use A Strong Password"),
];

router.post("/register", registerValidation, async (req, res) => {
  // Validate the request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array(),
    });
  }

  // Check if a user exists with the given email address
  const isExist = await prisma.user.findFirst({
    where: {
      email: req.body.email,
    },
  });

  if (isExist) {
    return res.status(409).json({
      message: "A User Already Exists With The Given Email Address",
    });
  }

  // Store the New User In DB
  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email,
      password: await Bun.password.hash(req.body.password),
      joined_at: new Date(),
      role_id: 1,
    },
  });

  return res.json({
    message: "User Created Successfully",
  });
});

router.get("/", [auth, refresh], (req, res) => {
  res.send(`Hello ${req.user.name}`);
});

// Auth Middleware
function auth(req, res, next) {
  // Get Header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // Check Header
  if (!token) {
    return res.sendStatus(401);
  }

  // Validate Access Token
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    // Assign User And Continue
    req.user = user;
    next();
  });
}

async function refresh(req, res, next) {
  const refresh_token = req.headers["refresh-token"];
  if (refresh_token == null) {
    return res.sendStatus(401);
  }

  // Validate Refresh Token with DB Records
  let isCorrect = await prisma.refresh_Token.findFirst({
    where: {
      token: refresh_token,
    },
  });

  if (isCorrect == null) {
    console.log("refresh token doesnot exist");
    return res.sendStatus(403);
  }

  // Validate Access Token
  jwt.verify(refresh_token, process.env.REFRESH_TOKEN, (err, user) => {
    if (err) {
      console.log("error on refresh token");
      return res.sendStatus(403);
    }

    // generate new access token and send it with request
    req.access_token = generateAccessToken(user);
    next();
  });
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
    },
    process.env.ACCESS_TOKEN,
    {
      expiresIn: "30min",
    }
  );
}

export default router;
