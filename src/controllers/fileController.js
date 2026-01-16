// src/controllers/fileController.js

// Import the Supabase client that you already configured
// This allows us to interact with Supabase Storage and Database
import supabase from "../config/supabaseClient.js";

/*
  CONTROLLER: Upload File

  Responsibility of this function:
  1. Receive the uploaded file from the request (via multer)
  2. Upload the file to Supabase Storage
  3. Save file metadata into the `files` table
*/
export const uploadFile = async (req, res) => {
  try {
    // Multer attaches the uploaded file to req.file
    const file = req.file;

    // The authenticated user's ID comes from auth middleware (Day 2)
    const userId = req.user.id;

    // OPTIONAL: Folder ID (used for folder-based uploads)
    // If not provided, the file will be uploaded at root level
    const { folder_id } = req.body;

    // Safety check: ensure a file was actually uploaded
    if (!file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    /*
      Create a unique storage path for the file.

      Example:
      user-id/1700000000000-document.pdf

      Why this structure?
      - Keeps files grouped per user
      - Prevents filename collisions
    */
    const storagePath = `${userId}/${Date.now()}-${file.originalname}`;

    /*
      Upload file to Supabase Storage bucket: "user-files"

      - file.buffer → actual binary data of the file
      - contentType → helps Supabase understand file type
    */
    const { error: storageError } = await supabase.storage
      .from("user-files")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype
      });

    // If upload to storage fails, stop and return error
    if (storageError) {
      return res.status(500).json({
        message: "Failed to upload file to storage",
        error: storageError.message
      });
    }

    /*
      Save file metadata into the `files` table.

      Mapping to your existing table columns:
      ---------------------------------------
      owner_id     → userId
      name         → original file name
      size_bytes   → file size
      mime_type    → file type
      storage_path → path in Supabase Storage
      folder_id    → parent folder (optional)
    */
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert([
        {
          owner_id: userId,
          name: file.originalname,
          size_bytes: file.size,
          mime_type: file.mimetype,
          storage_path: storagePath,
          folder_id: folder_id || null
        }
      ])
      .select()
      .single();

    // If database insert fails, return error
    if (dbError) {
      return res.status(500).json({
        message: "Failed to save file metadata",
        error: dbError.message
      });
    }

    // If everything succeeds, return success response
    return res.status(201).json({
      message: "File uploaded successfully",
      file: fileRecord
    });

  } catch (error) {
    // Catch any unexpected server errors
    return res.status(500).json({
      message: "Server error during file upload",
      error: error.message
    });
  }
};

/* ================================================= */
/* GET FILES (ROOT OR INSIDE A SPECIFIC FOLDER)      */
/* ================================================= */
export const getMyFiles = async (req, res) => {
  try {
    // Logged-in user ID from auth middleware
    const userId = req.user.id;

    // Optional folderId (used to fetch files inside a folder)
    const { folderId } = req.query;

    /*
      Base query:
      - Fetch only logged-in user's files
      - Exclude deleted files
    */
    let query = supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", false);

    /*
      Folder logic:
      - If folderId is provided → fetch files inside that folder
      - If not provided → fetch root-level files (folder_id IS NULL)
    */
    if (folderId) {
      query = query.eq("folder_id", folderId);
    } else {
      query = query.is("folder_id", null);
    }

    // Execute query
    const { data: files, error } = await query.order("created_at", {
      ascending: false
    });

    if (error) {
      return res.status(500).json({
        message: "Failed to fetch files",
        error: error.message
      });
    }

    return res.status(200).json({
      message: "Files fetched successfully",
      files
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error while fetching files",
      error: error.message
    });
  }
};

/* ============================== */
/* DELETE FILE (SOFT DELETE)      */
/* ============================== */
export const deleteFile = async (req, res) => {
  try {
    // File ID comes from URL params
    const { fileId } = req.params;

    // Logged-in user ID from auth middleware
    const userId = req.user.id;

    /*
      Step 1: Check if file exists and belongs to the user

      This prevents:
      - Deleting someone else's file
      - Deleting non-existing files
    */
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("owner_id", userId)
      .single();

    if (fetchError || !file) {
      return res.status(404).json({
        message: "File not found or access denied"
      });
    }

    /*
      Step 2: Soft delete the file

      Instead of removing the row permanently,
      we mark it as deleted using `is_deleted = true`
    */
    const { error: deleteError } = await supabase
      .from("files")
      .update({ is_deleted: true })
      .eq("id", fileId);

    if (deleteError) {
      return res.status(500).json({
        message: "Failed to delete file",
        error: deleteError.message
      });
    }

    // Success response
    return res.status(200).json({
      message: "File deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during file deletion",
      error: error.message
    });
  }
};

/* ================================= */
/* PERMANENT DELETE FILE (HARD)      */
/* ================================= */
export const permanentDeleteFile = async (req, res) => {
  try {
    // File ID comes from URL params
    const { fileId } = req.params;

    // Logged-in user ID from auth middleware
    const userId = req.user.id;

    /*
      Step 1: Fetch the file record

      We need:
      - storage_path → to remove from Supabase Storage
      - ownership check → security
    */
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("owner_id", userId)
      .single();

    if (fetchError || !file) {
      return res.status(404).json({
        message: "File not found or access denied"
      });
    }

    /*
      Step 2: Remove the file from Supabase Storage
    */
    const { error: storageError } = await supabase.storage
      .from("user-files")
      .remove([file.storage_path]);

    if (storageError) {
      return res.status(500).json({
        message: "Failed to delete file from storage",
        error: storageError.message
      });
    }

    /*
      Step 3: Remove the file record from database (PERMANENT)
    */
    const { error: dbError } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId);

    if (dbError) {
      return res.status(500).json({
        message: "Failed to delete file record",
        error: dbError.message
      });
    }

    // Success response
    return res.status(200).json({
      message: "File permanently deleted"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during permanent file deletion",
      error: error.message
    });
  }
};
