// src/controllers/fileController.js

import supabase from "../config/supabaseClient.js";

export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user.id;
    const { folder_id } = req.body;

    if (!file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    const storagePath = `${userId}/${Date.now()}-${file.originalname}`;

    const { error: storageError } = await supabase.storage
      .from("user-files")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype
      });

    if (storageError) {
      return res.status(500).json({
        message: "Failed to upload file to storage",
        error: storageError.message
      });
    }

    // 🔍 DEBUG: verify EXACT values before DB insert
    console.log("🔍 Upload debug:", {
      owner_id: req.user.id,
      name: file.originalname,
      size_bytes: file.size,
      mime_type: file.mimetype,
      storage_path: storagePath,
      folder_id: folder_id || null,
      is_deleted: false
    });


    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert([
        {
          owner_id: req.user.id,
          name: file.originalname,
          size_bytes: file.size,
          mime_type: file.mimetype,
          storage_path: storagePath,
          folder_id: folder_id || null,
          is_deleted: false
        }
      ])
      .select()
      .single();

    if (dbError) {
      return res.status(500).json({
        message: "Failed to save file metadata",
        error: dbError.message
      });
    }

    return res.status(201).json({
      message: "File uploaded successfully",
      file: fileRecord
    });

  } catch (error) {
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
    const userId = req.user.id;
    const { folderId, trash } = req.query;

    let query = supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId);

    if (trash === "true") {
      query = query.eq("is_deleted", true);
    } else {
      query = query.eq("is_deleted", false);

      if (folderId) {
        query = query.eq("folder_id", folderId);
      } else {
        query = query.is("folder_id", null);
      }
    }

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
    const { fileId } = req.params;
    const userId = req.user.id;

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

/* ============================== */
/* RESTORE FILE (FROM TRASH)      */
/* ============================== */
export const restoreFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

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

    const { error: restoreError } = await supabase
      .from("files")
      .update({ is_deleted: false })
      .eq("id", fileId);

    if (restoreError) {
      return res.status(500).json({
        message: "Failed to restore file",
        error: restoreError.message
      });
    }

    return res.status(200).json({
      message: "File restored successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during file restoration",
      error: error.message
    });
  }
};

/* ============================== */
/* RENAME FILE                    */
/* ============================== */
export const renameFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newName } = req.body;
    const userId = req.user.id;

    if (!newName) {
      return res.status(400).json({ message: "New name is required" });
    }

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

    const { error: updateError } = await supabase
      .from("files")
      .update({ name: newName })
      .eq("id", fileId);

    if (updateError) {
      return res.status(500).json({
        message: "Failed to rename file",
        error: updateError.message
      });
    }

    return res.status(200).json({
      message: "File renamed successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during file rename",
      error: error.message
    });
  }
};

/* ================================= */
/* PERMANENT DELETE FILE (HARD)      */
/* ================================= */
export const permanentDeleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

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

    const { error: storageError } = await supabase.storage
      .from("user-files")
      .remove([file.storage_path]);

    if (storageError) {
      return res.status(500).json({
        message: "Failed to delete file from storage",
        error: storageError.message
      });
    }

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
