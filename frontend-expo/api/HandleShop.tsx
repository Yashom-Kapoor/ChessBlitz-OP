import { supabase } from "./SupabaseClient";
import { API_URL } from "@/constants/urls";

export async function getShopData() {
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${API_URL}/shop/me`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return res.json();
}

export async function getShopPrices() {
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${API_URL}/shop/prices`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return res.json();
}

export async function buyItem(item: string){
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${API_URL}/shop/${item}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(text);
    return false;
  }

  return true;

}
