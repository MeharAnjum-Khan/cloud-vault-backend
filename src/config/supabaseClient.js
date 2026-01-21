// This file creates a connection to Supabase
// It will be used anywhere we need DB or Storage access

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // ✅ FIX: use anon key for user-facing APIs
);

export default supabase;
