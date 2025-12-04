// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import { EXPO_SUPABASE_KEY, EXPO_SUPABASE_URL } from '@env';

export const supabase = createClient(EXPO_SUPABASE_URL, EXPO_SUPABASE_KEY);
