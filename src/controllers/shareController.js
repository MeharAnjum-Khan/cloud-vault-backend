import crypto from "crypto";
import supabase from "../config/supabaseClient.js";

export const createShareLink = async (req, res) => {
  try {
    const { fileId, permission } = req.body;
    const userId = req.user.id;

    // 1. Check file ownership
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("id, owner_id")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.owner_id !== userId) {
      return res.status(403).json({ message: "You do not own this file" });
    }

    // 2. Generate token
    const token = crypto.randomBytes(24).toString("hex");

    // 3. Insert into EXISTING file_shares table
    const { error: insertError } = await supabase
      .from("file_shares")
      .insert([
        {
          file_id: fileId,
          creator_id: userId,
          permission,
          token,
        },
      ]);

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ message: "Failed to create share link" });
    }

    // 4. Return share link
    res.json({
      shareLink: `http://localhost:3000/share/${token}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
