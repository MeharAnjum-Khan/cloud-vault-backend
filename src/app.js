import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import uploadRoutes from "./routes/upload.routes.js"; //import upload routes

const app = express();

app.use(express.json());     //parse json bodies


/* =====================================================
   ADDED: Explicit CORS configuration for frontend
   =====================================================
   Why this is needed:
   - Real browsers enforce CORS strictly
   - This explicitly allows requests from Next.js frontend
   - Prevents "Failed to fetch" errors
   - Does NOT remove the existing cors() call above
   ===================================================== */
app.use(
  cors({
    origin: "http://localhost:3000", // Next.js frontend URL
    credentials: true,               // allow cookies / auth headers if needed
  })
);


// 🔹 health check / test route
app.get("/", (req, res) => {
  res.json({
    status: "Backend is running 🚀",
    service: "CloudVault API"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/upload", uploadRoutes); //upload routes

export default app;
