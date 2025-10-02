import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL and Key are required. Check your env variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
