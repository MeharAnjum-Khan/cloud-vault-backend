import supabase from "../config/supabaseClient.js";

export const searchFiles = async (req, res) => {
  try {
    const userId = req.user.id;

    // Query params
    const searchQuery = req.query.q || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("files")
      .select("*", { count: "exact" })
      .eq("owner_id", userId)
      .range(from, to)
      .order("created_at", { ascending: false });

    // Apply partial search if query exists
    if (searchQuery) {
      // ✅ CHANGED: Replaced textSearch with ilike for better partial matching
      // This enables finding "CNS" inside "TAE_CNS.pdf" and ignores case.
      // Note: Ensure your database column is named 'name' (or 'file_name').
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      files: data,
      pagination: {
        page,
        limit,
        total: count,
        hasMore: from + data.length < count
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};