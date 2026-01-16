/**
 * PURPOSE:
 * Defines routes related to file uploads.
 *
 * Very simple explanation:
 * - This file decides WHICH API URL exists
 * - It connects the request to:
 *   1) Multer middleware (to read file)
 *   2) Controller (to handle logic)
 *
 * This file itself contains NO business logic.
 */

import express from "express";

/**
 * Multer middleware
 * - Reads incoming file from request
 * - Makes it available as req.file
 */
import upload from "../middleware/upload.middleware.js";

/**
 * Controller
 * - Contains the actual upload handling logic
 */
import { uploadFileController } from "../controllers/upload.controller.js";

const router = express.Router();

/**
 * ROUTE: POST /api/upload
 *
 * Flow:
 * 1️⃣ upload.single("file") → reads file from form-data
 * 2️⃣ uploadFileController → processes the file
 *
 * "file" MUST match the key used in Postman / frontend
 */
router.post(
  "/",
  upload.single("file"),
  uploadFileController
);

export default router;
