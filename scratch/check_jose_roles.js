import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pspkpqwfkgpsjgerxogm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IYJEhRuMN2hHb-XULIN6rA_FLITfjP4";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function main() {
  console.log("Fetching profiles and staff roles...");

  // 1. Fetch profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*');
  
  if (pError) {
    console.error("Error fetching profiles:", pError);
    return;
  }

  // 2. Fetch staff_roles
  const { data: staffRoles, error: sError } = await supabase
    .from('staff_roles')
    .select('*');

  if (sError) {
    console.error("Error fetching staff_roles:", sError);
    return;
  }

  // 3. Fetch user_roles
  const { data: userRoles, error: uError } = await supabase
    .from('user_roles')
    .select('*');

  if (uError) {
    console.error("Error fetching user_roles:", uError);
    return;
  }

  console.log("\n--- PROFILES ---");
  console.log(JSON.stringify(profiles, null, 2));

  console.log("\n--- STAFF ROLES ---");
  console.log(JSON.stringify(staffRoles, null, 2));

  console.log("\n--- USER ROLES ---");
  console.log(JSON.stringify(userRoles, null, 2));
}

main().catch(console.error);
