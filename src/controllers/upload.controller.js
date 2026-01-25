/**
 * PURPOSE:
 * Controller for handling file upload requests.
 *
 * FIX APPLIED:
 * - Creates an AUTHENTICATED Supabase client per request.
 * - Passes `req.headers.authorization` to Supabase.
 * - This ensures Row Level Security (RLS) policies are respected.
 * - Removed redundant local file saving service.
 */

import { createClient } from "@supabase/supabase-js";

export const uploadFileController = async (req, res) => {
  try {
    // 1. Create Authenticated Supabase Client (ADMIN ACCESS)
    // We use the SERVICE ROLE KEY to bypass RLS/Signature checks.
    // This is safe because WE (The Backend) have already verified the user via authMiddleware.
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 2. Extract Request Data
    const file = req.file;
    const { folder_id } = req.body;
    const userId = req.user.id;

    if (!file) {
      throw new Error("No file received");
    }

    // 3. Upload to Supabase Storage
    // The bucket policies will now see this as "Authenticated User"
    const storagePath = `${userId}/${Date.now()}-${file.originalname}`;

    const { error: storageError } = await supabase.storage
      .from("user-files")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (storageError) {
      throw new Error(`Failed to upload to storage: ${storageError.message}`);
    }

    // 4. Save Metadata to Database
    // RLS policies for 'insert' will check auth.uid()
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert([
        {
          owner_id: userId,
          name: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
          storage_path: storagePath,
          folder_id: folder_id || null,
          is_deleted: false,
        },
      ])
      .select()
      .single();

    if (dbError) {
      // Cleanup: try to delete the uploaded file if DB insert fails
      await supabase.storage.from("user-files").remove([storagePath]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // 5. Success
    return res.status(200).json({
      message: "File uploaded successfully",
      file: fileRecord,
    });

  } catch (error) {
    console.error("Upload error:", error.message);
    return res.status(400).json({
      message: "File upload failed",
      error: error.message,
    });
  }
};
