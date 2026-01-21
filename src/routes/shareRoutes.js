import express from "express";
import { createShareLink } from "../controllers/shareController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createShareLink);

export default router;
