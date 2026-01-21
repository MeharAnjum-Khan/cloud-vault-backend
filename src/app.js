import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js"; //import upload routes
import folderRoutes from "./routes/folderRoutes.js"; // ✅ IMPORTED
import shareRoutes from "./routes/shareRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";

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
app.use("/api/folders", folderRoutes); // ✅ MOUNTED
app.use("/api/share", shareRoutes);
app.use("/api/search", searchRoutes);

export default app;
