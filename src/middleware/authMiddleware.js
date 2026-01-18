import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 🔍 DEBUG: Log the received header
  console.log("🔍 [BACKEND AUTH] Header:", authHeader ? "Present" : "Missing", authHeader);

  // Check token presence
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ [BACKEND AUTH] Unauthorized: No Bearer token");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    console.log("✅ [BACKEND AUTH] Token verified for user:", decoded.id);
    next();
  } catch (error) {
    console.log("❌ [BACKEND AUTH] Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authMiddleware;