/**
 * PURPOSE:
 * This service handles database operations for files using Supabase.
 *
 * In very simple terms:
 * - Supabase already has tables (PostgreSQL)
 * - This file talks to Supabase to save file metadata
 * - No schemas or models are defined here
 */

import { supabase } from "../config/supabaseClient.js";

/**
 * saveFileMetadata
 *
 * @param {Object} fileData
 * Stores uploaded file details in Supabase database
 */
export const saveFileMetadata = async (fileData) => {
  const { originalName, mimeType, size, path } = fileData;

  const { data, error } = await supabase
    .from("files") // Supabase table name
    .insert([
      {
        original_name: originalName,
        mime_type: mimeType,
        size,
        path,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
