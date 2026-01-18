
import dotenv from 'dotenv';
dotenv.config();

import supabase from '../config/supabaseClient.js';

async function checkFiles() {
    console.log("🔍 Checking files in database...");

    const { data: files, error } = await supabase
        .from('files')
        .select('*');

    if (error) {
        console.error("❌ Error fetching files:", error);
        return;
    }

    console.log(`✅ Found ${files.length} files in total.`);

    if (files.length > 0) {
        console.log("dumping first 5 files:");
        files.slice(0, 5).forEach(f => {
            console.log(`- ID: ${f.id}, Name: ${f.name}, Owner: ${f.owner_id}, Deleted: ${f.is_deleted}`);
        });
    }
}

checkFiles();
