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

/* ✅ ADDED: Supabase client import for DB operations */
import supabase from "../config/supabaseClient.js";

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
export const saveFileMetadata = async ({
  filename,
  mimetype,
  size,
  path,
  owner_id,
  folder_id = null,
}) => {
  // 🔍 DEBUG: verify EXACT values being inserted
  console.log("🔍 Upload debug (REAL INSERT):", {
    owner_id,
    name: filename,
    size_bytes: size,
    mime_type: mimetype,
    storage_path: path,
    folder_id,
    is_deleted: false,
  });

  const { data, error } = await supabase
    .from("files")
    .insert([
      {
        owner_id: owner_id,
        name: filename,
        mime_type: mimetype,
        size_bytes: size,
        storage_path: path,
        folder_id: folder_id,
        is_deleted: false,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};