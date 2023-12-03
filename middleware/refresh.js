import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function refresh(req, res, next) {
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
    return res.sendStatus(403);
  }

  // Validate Access Token
  jwt.verify(refresh_token, process.env.REFRESH_TOKEN, async (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    await prisma.refresh_Token.update({
      where: {
        id: isCorrect.id,
      },
      data: {
        used_at: new Date(),
      },
    });

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
