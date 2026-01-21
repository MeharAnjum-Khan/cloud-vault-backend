// src/routes/fileRoutes.js

import express from "express";

// Middleware to verify JWT and attach user to request
import authMiddleware from "../middlewares/authMiddleware.js";

// Multer middleware for handling file uploads
import upload from "../middlewares/upload.middleware.js";

// File upload controller
import { uploadFile } from "../controllers/fileController.js";
import { getMyFiles } from "../controllers/fileController.js"; // updated
import { deleteFile } from "../controllers/fileController.js"; // delete method added
//import { downloadFile } from "../controllers/fileController.js"; // download method added
import { permanentDeleteFile } from "../controllers/fileController.js"; // permanent delete method added
import { renameFile, restoreFile } from "../controllers/fileController.js";
import { sharefile} from "../controllers/fileController.js";
import { getsharedfile } from "../controllers/fileController.js";


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
router.get( 
  "/",     
  authMiddleware, 
  getMyFiles 
); 

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
); 

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
); 

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
/*
  Route: POST /api/files/:fileId/share
  Only owner can create share link
*/
router.post(
  "/:fileId/share", 
  authMiddleware, 
  sharefile
);

/*
  Route: GET /api/files/share/:token
  Public access using token
*/
router.get(
  "/share/:token",
   getsharedfile);

export default router;
