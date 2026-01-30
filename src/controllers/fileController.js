// src/controllers/fileController.js

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js"; // ✅ ADDED
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

    // 1. Create Admin Supabase Client (Bypass RLS for Backend Logic)
    // This is safe because we already verified the user via authMiddleware
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const storagePath = `${userId}/${Date.now()}-${file.originalname}`;

    // 2. Upload to Supabase Storage
    const { error: storageError } = await adminSupabase.storage
      .from("user-files")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (storageError) {
      console.error("Supabase Storage Error:", storageError);
      return res.status(500).json({
        message: "Failed to upload file to storage",
        error: storageError.message || storageError
      });
    }

    // 3. Save Metadata to Database
    const { data: fileRecord, error: dbError } = await adminSupabase
      .from("files")
      .insert([
        {
          owner_id: userId,
          name: file.originalname,
          size_bytes: file.size,
          mime_type: file.mimetype,
          storage_path: storagePath,
          folder_id: folder_id || null,
          is_deleted: false
        }
      ])
      .select("*, size:size_bytes")
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

    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("files")
      .select("*, size:size_bytes", { count: "exact" })
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

    const { data: files, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({
        message: "Failed to fetch files",
        error: error.message
      });
    }

    return res.status(200).json({
      message: "Files fetched successfully",
      files,
      pagination: {
        page,
        limit,
        total: count,
        hasMore: from + (files?.length || 0) < count
      }
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

/* ============================== */
/* DOWNLOAD FILE (GET SIGNED URL) */
/* ============================== */
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Fetch file metadata and verify ownership
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

    // Generate signed download URL (valid for 5 minutes)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 60 * 5);

    if (urlError) {
      return res.status(500).json({
        message: "Failed to generate download link",
        error: urlError.message
      });
    }

    return res.status(200).json({
      message: "Download URL generated successfully",
      downloadUrl: signedUrlData.signedUrl
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during file download",
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
    const { permission } = req.body; // ✅ CAPTURE PERMISSION
    const userId = req.user.id;

    // 1. Verify file ownership (Standard Client is fine for reading if policy allows, but let's be safe)
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

    // 3. Create Admin Client to Bypass RLS on Insert
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 4. Save share record
    const { error: shareError } = await adminSupabase
      .from("file_shares")
      .insert([
        {
          file_id: fileId,
          creator_id: userId,
          token,
          permission: permission || "view", // ✅ USE PERMISSION
          expires_at: null
        }
      ]);

    if (shareError) {
      return res.status(500).json({
        message: "Failed to create share link",
        error: shareError.message
      });
    }

    // 5. Return share link
    // Note: FRONTEND_URL might be undefined, frontend handles replacement fallback
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

    // 1. Create Admin Supabase Client (Bypass RLS for public link access)
    // REQUIRED because "Anon" users usually can't select from file_shares/files
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 2. Validate share token
    const { data: share, error: shareError } = await adminSupabase
      .from("file_shares")
      .select("*")
      .eq("token", token)
      .single();

    if (shareError || !share) {
      return res.status(404).json({
        message: "Invalid share link"
      });
    }

    // 3. Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({
        message: "Share link has expired"
      });
    }

    // 4. Fetch file metadata
    const { data: file, error: fileError } = await adminSupabase
      .from("files")
      .select("*")
      .eq("id", share.file_id)
      .single();

    if (fileError || !file) {
      return res.status(404).json({
        message: "File not found"
      });
    }

    // 5. Generate signed download URL
    const { data: signedUrlData, error: urlError } =
      await adminSupabase.storage
        .from("user-files")
        .createSignedUrl(file.storage_path, 60 * 5); // 5 minutes expiry

    if (urlError) {
      return res.status(500).json({
        message: "Failed to generate download link",
        error: urlError.message
      });
    }

    // 6. Return file info
    return res.status(200).json({
      message: "Shared file fetched successfully",
      permission: share.permission,
      file: {
        id: file.id,
        name: file.name,
        size: file.size_bytes,
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

/* ================================================= */
/* GET FILES SHARED BY ME (DASHBOARD PAGE)           */
/* ================================================= */
export const getMySharedFiles = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch shares created by this user
    // We select the share info AND the related file info
    const { data: shares, error } = await supabase
      .from("file_shares")
      .select(`
        *,
        files:file_id (
          id,
          name,
          size_bytes,
          mime_type,
          created_at
        )
      `)
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        message: "Failed to fetch shared files",
        error: error.message
      });
    }

    // 2. Format response to match FileList structure
    // We map the result so it looks like a normal file object to the frontend
    const formattedFiles = shares.map(share => ({
      id: share.files.id,
      name: share.files.name,
      size_bytes: share.files.size_bytes,
      mime_type: share.files.mime_type,
      created_at: share.files.created_at,
      share_token: share.token, // Extra info: share link token
      is_shared: true
    }));

    return res.status(200).json({
      message: "Shared files fetched",
      files: formattedFiles
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error fetching shared files",
      error: error.message
    });
  }
};

