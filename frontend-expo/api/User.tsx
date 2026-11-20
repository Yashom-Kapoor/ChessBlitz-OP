import { supabase } from "./SupabaseClient";
import { getApiUrl } from "@/constants/urls";

export async function getCurrentUser() {
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${getApiUrl()}/users/me`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return res.json();
}
