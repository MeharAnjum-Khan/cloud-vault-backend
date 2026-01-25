/**
 * PURPOSE:
 * This service handles database operations for files using Supabase.
 *
 * In very simple terms:
 * - Supabase already has tables (PostgreSQL)
 * - This file talks to Supabase to save file metadata
 * - No schemas or models are defined here
 */

import supabase from "../config/supabaseClient.js";

/**
 * saveFileMetadata
 *
 * @param {Object} fileData
 * Stores uploaded file details in Supabase database
 */
export const saveFileMetadata = async (fileData) => {
  const { originalName, mimeType, size, path, ownerId, folderId } = fileData;

  const { data, error } = await supabase
    .from("files")
    .insert([
      {
        name: originalName,          // ✅ correct
        mime_type: mimeType,         // ✅ correct
        size_bytes: size,            // ✅ correct
        storage_path: path,          // ✅ correct
        owner_id: ownerId || null,   // ✅ required FK
        folder_id: folderId || null, // ✅ optional FK
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