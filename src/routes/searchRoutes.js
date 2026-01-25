import express from "express";
import { searchFiles } from "../controllers/searchController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/search?q=report&page=1&limit=10
router.get("/", authMiddleware, searchFiles);

export default router;