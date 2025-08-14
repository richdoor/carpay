import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseURL = import.meta.env.VITE_SUPABASE_URL;

const supabase = createClient(supabaseURL, supabaseAnonKey);
