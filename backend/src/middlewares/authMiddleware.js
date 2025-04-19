// src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.sendStatus(401); 
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      return res.sendStatus(403); 
    }

    if (!userPayload || !userPayload.role) {
      console.error("JWT Payload missing role:", userPayload);
      return res
        .status(403)
        .json({ error: "Invalid token: Role information missing." });
    }

    req.user = userPayload; 
    next(); 
  });
};

module.exports = authenticateToken; 