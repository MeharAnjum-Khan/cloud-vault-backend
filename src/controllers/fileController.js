// src/controllers/fileController.js

import crypto from "crypto";
import supabase from "../config/supabaseClient.js";

export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
        // ❗ CRITICAL SAFETY CHECK (PREVENTS NULL VALUES)
    if (!file || !file.buffer || !file.size || !file.mimetype) {
      return res.status(400).json({
        message: "Invalid file data received from upload middleware"
      });
    }

    // 🔍 DEBUG: confirm Multer memoryStorage is working correctly
    console.log("✅ FINAL FILE OBJECT:", {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      hasBuffer: !!file.buffer
    });

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
/* ============================== */
/* SHARE FILE (CREATE LINK)       */
/* ============================== */
export const sharefile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // 1. Verify file ownership
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("owner_id", userId)
      .single();

    if (fileError || !file) {
      return res.status(404).json({
        message: "File not found or access denied"
      });
    }

    // 2. Generate secure share token
    const token = crypto.randomUUID();

    // 3. Save share record
    const { error: shareError } = await supabase
      .from("file_shares")
      .insert([
        {
          file_id: fileId,
          creator_id: userId,
          token,
          permission: "view", // default permission
          expires_at: null
        }
      ]);

    if (shareError) {
      return res.status(500).json({
        message: "Failed to create share link",
        error: shareError.message
      });
    }

    // 4. Return share link
    return res.status(200).json({
      message: "File shared successfully",
      shareLink: `${process.env.FRONTEND_URL}/share/${token}`
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during file sharing",
      error: error.message
    });
  }
};

/* ============================== */
/* GET SHARED FILE (PUBLIC)       */
/* ============================== */
export const getsharedfile = async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Validate share token
    const { data: share, error: shareError } = await supabase
      .from("file_shares")
      .select("*")
      .eq("token", token)
      .single();

    if (shareError || !share) {
      return res.status(404).json({
        message: "Invalid share link"
      });
    }

    // 2. Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({
        message: "Share link has expired"
      });
    }

    // 3. Fetch file metadata
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", share.file_id)
      .single();

    if (fileError || !file) {
      return res.status(404).json({
        message: "File not found"
      });
    }

    // 4. Generate signed download URL
    const { data: signedUrlData, error: urlError } =
      await supabase.storage
        .from("user-files")
        .createSignedUrl(file.storage_path, 60 * 5);

    if (urlError) {
      return res.status(500).json({
        message: "Failed to generate download link",
        error: urlError.message
      });
    }

    // 5. Return file info
    return res.status(200).json({
      message: "Shared file fetched successfully",
      permission: share.permission,
      file: {
        id: file.id,
        name: file.name,
        size_bytes: file.size_bytes,
        mime_type: file.mime_type
      },
      downloadUrl: signedUrlData.signedUrl
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error while accessing shared file",
      error: error.message
    });
  }
};

