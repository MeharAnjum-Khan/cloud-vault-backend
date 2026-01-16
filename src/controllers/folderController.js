// src/controllers/folderController.js

// Import the Supabase client that you already configured
// This allows us to interact with Supabase Database
import supabase from "../config/supabaseClient.js";

/*
  CONTROLLER: Create Folder

  Responsibility of this function:
  1. Receive folder details from request body
  2. Associate folder with logged-in user
  3. Support nested folders using parent_id
  4. Save folder metadata into the `folders` table
*/
export const createFolder = async (req, res) => {
  try {
    // Folder name and optional parent folder ID from request body
    const { name, parent_id = null } = req.body;

    // Logged-in user's ID from auth middleware
    const userId = req.user.id;

    // Safety check: folder name is required
    if (!name) {
      return res.status(400).json({
        message: "Folder name is required",
      });
    }

    /*
      Insert folder into `folders` table

      Mapping to your existing table columns:
      ---------------------------------------
      name       → folder name
      owner_id   → logged-in user
      parent_id  → null (root) or another folder's ID
    */
    const { data: folder, error } = await supabase
      .from("folders")
      .insert([
        {
          name,
          owner_id: userId,
          parent_id,
        },
      ])
      .select()
      .single();

    // If database insert fails
    if (error) {
      return res.status(500).json({
        message: "Failed to create folder",
        error: error.message,
      });
    }

    // Success response
    return res.status(201).json({
      message: "Folder created successfully",
      folder,
    });

  } catch (error) {
    // Catch any unexpected server errors
    return res.status(500).json({
      message: "Server error while creating folder",
      error: error.message,
    });
  }
};

/* ===================================== */
/* GET ALL FOLDERS OF LOGGED-IN USER      */
/* ===================================== */
export const getMyFolders = async (req, res) => {
  try {
    // Logged-in user ID
    const userId = req.user.id;

    /*
      Fetch all non-deleted folders of the user

      Why this API?
      - Required to show folder tree on frontend
      - Needed for folder-based uploads
    */
    const { data: folders, error } = await supabase
      .from("folders")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        message: "Failed to fetch folders",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Folders fetched successfully",
      folders,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error while fetching folders",
      error: error.message,
    });
  }
};

/* ===================================== */
/* DELETE FOLDER (SOFT DELETE)            */
/* ===================================== */
export const deleteFolder = async (req, res) => {
  try {
    // Folder ID from URL params
    const { folderId } = req.params;

    // Logged-in user ID
    const userId = req.user.id;

    /*
      Step 1: Verify folder ownership

      Prevents:
      - Deleting someone else's folder
      - Deleting invalid folder ID
    */
    const { data: folder, error: fetchError } = await supabase
      .from("folders")
      .select("*")
      .eq("id", folderId)
      .eq("owner_id", userId)
      .single();

    if (fetchError || !folder) {
      return res.status(404).json({
        message: "Folder not found or access denied",
      });
    }

    /*
      Step 2: Soft delete the folder

      Why soft delete?
      - Keeps folder structure safe
      - Allows recovery later (if needed)
    */
    const { error: deleteError } = await supabase
      .from("folders")
      .update({ is_deleted: true })
      .eq("id", folderId);

    if (deleteError) {
      return res.status(500).json({
        message: "Failed to delete folder",
        error: deleteError.message,
      });
    }

    return res.status(200).json({
      message: "Folder deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during folder deletion",
      error: error.message,
    });
  }
};
