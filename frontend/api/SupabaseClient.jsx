// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Grab the variables from app.config.js's "extra"
const { supabaseUrl, supabaseKey } = Constants.expoConfig.extra;

export const supabase = createClient(supabaseUrl, supabaseKey);
