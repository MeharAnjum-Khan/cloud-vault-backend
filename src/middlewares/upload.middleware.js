/**
 * PURPOSE:
 * This middleware handles file upload configuration using Multer.
 *
 * CHANGE IN THIS STEP:
 * - Earlier: Files were stored in MEMORY (RAM)
 * - Now: Files are stored in MEMORY (REQUIRED FOR SUPABASE)
 *
 * WHY THIS CHANGE:
 * - Supabase Storage requires `file.buffer`
 * - `file.buffer` is ONLY available with memoryStorage()
 */

import multer from "multer";

/* =====================================================
   STORAGE CONFIGURATION
   ===================================================== */

/*
  🔴 IMPORTANT FIX (DO NOT REMOVE)

  Supabase Storage requires `file.buffer`
  `file.buffer` is ONLY available when using memoryStorage()
*/

// ✅ CORRECT: memoryStorage is REQUIRED for Supabase
const storage = multer.memoryStorage();

/* =====================================================
   MULTER INSTANCE
   ===================================================== */

const upload = multer({
  storage,
  limits: {
    // Max file size: 10 MB
    fileSize: 10 * 1024 * 1024,
  },
});

export default upload;