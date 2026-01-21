
import dotenv from 'dotenv';
dotenv.config();

import supabase from '../config/supabaseClient.js';

async function checkShares() {
    console.log("🔍 Checking file shares in database...");

    const { data: shares, error } = await supabase
        .from('file_shares')
        .select('*');

    if (error) {
        console.error("❌ Error fetching shares:", error);
        return;
    }

    console.log(`✅ Found ${shares.length} shares in total.`);

    if (shares.length > 0) {
        console.log("dumping all shares:");
        shares.forEach(s => {
            console.log("- Full share data:", s);
        });
    }
}

checkShares();
