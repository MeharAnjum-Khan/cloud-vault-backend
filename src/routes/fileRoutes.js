// src/routes/fileRoutes.js

import express from "express";

// Middleware to verify JWT and attach user to request
import authMiddleware from "../middleware/authMiddleware.js";

// Multer middleware for handling file uploads
import upload from "../middleware/upload.middleware.js";

// File upload controller
import { uploadFile } from "../controllers/fileController.js";
import { getMyFiles } from "../controllers/fileController.js"; // updated
import { deleteFile } from "../controllers/fileController.js"; // delete method added
//import { downloadFile } from "../controllers/fileController.js"; // download method added
import { permanentDeleteFile } from "../controllers/fileController.js"; // permanent delete method added
import { renameFile, restoreFile } from "../controllers/fileController.js";


const router = express.Router();

/*
  Route: POST /api/files/upload

  Flow:
  1. authMiddleware → checks JWT & sets req.user
  2. upload.single("file") → reads uploaded file
  3. uploadFile → uploads to storage & saves metadata
*/
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadFile
);

/*
  Route: GET /api/files

  Flow:
  1. authMiddleware → checks JWT & sets req.user
  2. getMyFiles → returns all files of logged-in user
*/
router.get( // updated
  "/",     // updated
  authMiddleware, // updated
  getMyFiles // updated
); // updated

/*
  Route: DELETE /api/files/:fileId

  Purpose:
  - Soft deletes a file
  - Marks file as deleted using `is_deleted = true`
*/
router.delete(
  "/:fileId",
  authMiddleware,
  deleteFile
); // delete method added

/*
  Route: GET /api/files/:fileId/download

  Flow:
  1. authMiddleware → checks JWT & sets req.user
  2. downloadFile → generates signed download URL
*/
// router.get(
//   "/:fileId/download",
//   authMiddleware,
//   downloadFile
// ); // download method added

/*
  Route: DELETE /api/files/:fileId/permanent

  Purpose:
  - Permanently deletes a file
  - Removes file from Supabase Storage
  - Deletes file record from database
*/
router.delete(
  "/:fileId/permanent",
  authMiddleware,
  permanentDeleteFile
); // permanent delete method added

/*
  Route: PUT /api/files/:fileId/rename
*/
router.put(
  "/:fileId/rename",
  authMiddleware,
  renameFile
);

/*
  Route: PUT /api/files/:fileId/restore
*/
router.put(
  "/:fileId/restore",
  authMiddleware,
  restoreFile
);


export default router;
