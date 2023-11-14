import jwt from "jsonwebtoken";

export function auth(req, res, next) {
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
