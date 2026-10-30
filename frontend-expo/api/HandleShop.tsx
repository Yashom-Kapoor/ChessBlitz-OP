import { supabase } from "./SupabaseClient";
import { getApiUrl } from "@/constants/urls";

export async function getShopData() {
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${getApiUrl()}/shop/me`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`GET /shop/me failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

export async function getShopPrices() {
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${getApiUrl()}/shop/prices`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`GET /shop/prices failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

export async function buyItem(item: string){
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${getApiUrl()}/shop/${item}`, {
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
