/**
 * PURPOSE:
 * Controller for handling file upload requests.
 *
 * In very simple terms:
 * - Receives file from route (req.file)
 * - Calls service to save the file
 * - Sends a clean response back to client
 *
 * IMPORTANT:
 * - No heavy logic here
 * - Controller only coordinates things
 */

import {
  uploadFileService,
  saveFileMetadata, // ✅ ADDED: import metadata saver
} from "../services/upload.service.js";

/**
 * uploadFileController
 *
 * Flow:
 * 1️ Multer puts file on req.file
 * 2️ We pass that file to the service
 * 3️ Service saves file to disk
 * 4️ We return success response
 */
export const uploadFileController = async (req, res) => {
  try {
    // File comes from multer middleware
    const file = req.file;

    // Call service to handle actual upload
    const uploadedFile = await uploadFileService(file);

    /* =====================================================
       ✅ ADDED: Save file metadata to database
       ===================================================== */
         const fileRecord = await saveFileMetadata({
            owner_id: req.user.id,                 // ✅ FIXED
            filename: uploadedFile.fileName,
            mime_type: uploadedFile.mimeType,
            size_bytes: uploadedFile.fileSize,            // ✅ KEY NAME MATCH
            storage_path: uploadedFile.path,                // ✅ KEY NAME MATCH
 });

    // Send success response
    return res.status(200).json({
      message: "File uploaded successfully",
      file: uploadedFile,
      dbRecord: fileRecord, // ✅ ADDED: DB confirmation
    });
  } catch (error) {
    console.error("Upload error:", error.message);

    return res.status(400).json({
      message: "File upload failed",
      error: error.message,
    });
  }
};
