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

import { uploadFileService } from "../services/upload.service.js";

/**
 * uploadFileController
 *
 * Flow:
 * 1️⃣ Multer puts file on req.file
 * 2️⃣ We pass that file to the service
 * 3️⃣ Service saves file to disk
 * 4️⃣ We return success response
 */
export const uploadFileController = async (req, res) => {
  try {
    // File comes from multer middleware
    const file = req.file;

    // Call service to handle actual upload
    const uploadedFile = await uploadFileService(file);

    // Send success response
    return res.status(200).json({
      message: "File uploaded successfully",
      file: uploadedFile,
    });
  } catch (error) {
    console.error("Upload error:", error.message);

    return res.status(400).json({
      message: "File upload failed",
      error: error.message,
    });
  }
};
