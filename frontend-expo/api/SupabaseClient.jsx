import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra;

if (!extra?.supabaseUrl || !extra?.supabaseKey) {
  throw new Error("Missing Supabase config in Expo extra");
}

export const supabase = createClient(
  extra.supabaseUrl,
  extra.supabaseKey
);
