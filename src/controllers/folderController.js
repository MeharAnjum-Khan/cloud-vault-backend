// src/controllers/folderController.js

import supabase from "../config/supabaseClient.js";

/* ---------------------------------------------------------------
   ✅ NEW HELPER FUNCTION: Fetch Breadcrumbs (Ancestors)
   This loops backwards from the current folder to the root 
   to build the path: "Home > Folder A > Folder B"
   ---------------------------------------------------------------
*/
const getBreadcrumbs = async (folderId, userId) => {
  const breadcrumbs = [];
  let currentId = folderId;

  // Loop until we hit the root (null)
  while (currentId) {
    const { data, error } = await supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("id", currentId)
      .eq("owner_id", userId)
      .single();

    if (error || !data) break;

    // Add current folder to the START of the array
    breadcrumbs.unshift({ id: data.id, name: data.name });
    
    // Move up to the parent
    currentId = data.parent_id;
  }

  // Always add "My Files" (Root) at the very beginning
  breadcrumbs.unshift({ id: null, name: "My Files" });
  return breadcrumbs;
};


/*
  CONTROLLER: Create Folder
  (No changes needed here, keeping original code)
*/
export const createFolder = async (req, res) => {
  try {
    const { name, parent_id = null } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({
        message: "Folder name is required",
      });
    }

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

    if (error) {
      return res.status(500).json({
        message: "Failed to create folder",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Folder created successfully",
      folder,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error while creating folder",
      error: error.message,
    });
  }
};

/* ===================================== */
/* GET ALL FOLDERS OF LOGGED-IN USER     */
/* ===================================== */
export const getMyFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { parentId, trash } = req.query;

    /*
      Fetch folders (Children)
    */
    let query = supabase
      .from("folders")
      .select("*")
      .eq("owner_id", userId);

    if (trash === "true") {
      query = query.eq("is_deleted", true);
    } else {
      query = query.eq("is_deleted", false);
      if (parentId) {
        query = query.eq("parent_id", parentId);
      } else {
        query = query.is("parent_id", null);
      }
    }

    // Execute the query to get sub-folders
    const { data: folders, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        message: "Failed to fetch folders",
        error: error.message,
      });
    }

    // ✅ NEW: Generate Breadcrumbs if we are inside a folder
    let breadcrumbs = [];
    if (!trash && parentId) {
      // If we are deep inside a folder, fetch the path
      breadcrumbs = await getBreadcrumbs(parentId, userId);
    } else {
      // If we are at root or trash, just show "My Files"
      breadcrumbs = [{ id: null, name: "My Files" }];
    }

    return res.status(200).json({
      message: "Folders fetched successfully",
      folders,
      breadcrumbs, // ✅ Sending breadcrumbs to frontend
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error while fetching folders",
      error: error.message,
    });
  }
};

/* ===================================== */
/* DELETE FOLDER (SOFT DELETE)           */
/* ===================================== */
export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

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

/* ===================================== */
/* RESTORE FOLDER (FROM TRASH)           */
/* ===================================== */
export const restoreFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

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

    const { error: restoreError } = await supabase
      .from("folders")
      .update({ is_deleted: false })
      .eq("id", folderId);

    if (restoreError) {
      return res.status(500).json({
        message: "Failed to restore folder",
        error: restoreError.message,
      });
    }

    return res.status(200).json({
      message: "Folder restored successfully",
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during folder restoration",
      error: error.message,
    });
  }
};

/* ===================================== */
/* RENAME FOLDER                         */
/* ===================================== */
export const renameFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { newName } = req.body;
    const userId = req.user.id;

    if (!newName) {
      return res.status(400).json({ message: "New name is required" });
    }

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

    const { error: updateError } = await supabase
      .from("folders")
      .update({ name: newName })
      .eq("id", folderId);

    if (updateError) {
      return res.status(500).json({
        message: "Failed to rename folder",
        error: updateError.message,
      });
    }

    return res.status(200).json({
      message: "Folder renamed successfully",
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error during folder rename",
      error: error.message,
    });
  }
};