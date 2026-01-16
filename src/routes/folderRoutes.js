// src/routes/folderRoutes.js

import express from "express";

// Middleware to verify JWT and attach user to request
import authMiddleware from "../middleware/authMiddleware.js";

// Folder controllers
import {
  createFolder,
  getMyFolders,
  deleteFolder
} from "../controllers/folderController.js";

const router = express.Router();

/*
  Route: POST /api/folders

  Flow:
  1. authMiddleware → checks JWT & sets req.user
  2. createFolder → creates a new folder (root or inside another folder)
*/
router.post(
  "/",
  authMiddleware,
  createFolder
);

/*
  Route: GET /api/folders

  Flow:
  1. authMiddleware → checks JWT & sets req.user
  2. getMyFolders → returns all folders of logged-in user
*/
router.get(
  "/",
  authMiddleware,
  getMyFolders
);

/*
  Route: DELETE /api/folders/:folderId

  Flow:
  1. authMiddleware → checks JWT & sets req.user
  2. deleteFolder → soft deletes the folder (is_deleted = true)
*/
router.delete(
  "/:folderId",
  authMiddleware,
  deleteFolder
);

export default router;
