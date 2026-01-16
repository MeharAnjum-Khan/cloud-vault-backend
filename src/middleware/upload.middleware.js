/**
 * PURPOSE:
 * This middleware handles file upload configuration using Multer.
 *
 * CHANGE IN THIS STEP:
 * - Earlier: Files were stored in MEMORY (RAM)
 * - Now: Files are stored on DISK (inside /uploads folder)
 *
 * WHY THIS CHANGE:
 * - Memory storage does NOT save files permanently
 * - Real apps always store uploaded files on disk or cloud
 */

import multer from "multer";
import path from "path";
import fs from "fs";

/* =====================================================
   ENSURE UPLOADS FOLDER EXISTS
   ===================================================== */

// Absolute path to /uploads folder (at project root)
const uploadDir = path.join(process.cwd(), "uploads");

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* =====================================================
   STORAGE CONFIGURATION (DISK)
   ===================================================== */

const storage = multer.diskStorage({
  // Where to store the file
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  // How to name the file
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname;

    cb(null, uniqueName);
  },
});

/* =====================================================
   MULTER INSTANCE
   ===================================================== */

const upload = multer({
  storage,
  limits: {
    // Max file size: 10 MB
    fileSize: 10 * 1024 * 1024,
  },
});

export default upload;
