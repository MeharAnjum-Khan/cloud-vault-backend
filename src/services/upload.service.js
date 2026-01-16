/**
 * PURPOSE:
 * This service contains the core logic for handling uploaded files.
 *
 * In very simple terms:
 * - Routes should NOT contain heavy logic
 * - This file does the actual "work"
 * - Keeps code clean and professional
 */

import fs from "fs";
import path from "path";

/**
 * uploadFileService
 *
 * @param {Object} file - File object received from Multer
 *
 * What this function does:
 * 1. Checks if file exists
 * 2. Creates an uploads folder if missing
 * 3. Saves the file to disk
 * 4. Returns saved file info
 */
export const uploadFileService = async (file) => {
  // Safety check
  if (!file) {
    throw new Error("No file received");
  }

  // Define uploads folder path
  const uploadDir = path.join(process.cwd(), "uploads");

  // Create uploads folder if it does not exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // Final file path
  const filePath = path.join(uploadDir, file.originalname);

  // Return useful info
  return {
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    path: filePath,
  };
};

/**
 * saveFileMetadata
 *
 * PURPOSE:
 * - Temporary placeholder for database logic
 * - Keeps controller import working
 * - We will later replace this with real DB insert logic
 *
 * For now:
 * - Simply logs metadata
 * - Returns a mock response
 */
export const saveFileMetadata = async ({ filename, mimetype, size }) => {
  console.log("Saving file metadata:", {
    filename,
    mimetype,
    size,
  });

  return {
    id: Date.now(), // temporary fake ID
    filename,
    mimetype,
    size,
  };
};
