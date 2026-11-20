import { supabase } from "./SupabaseClient";
import { getApiUrl } from "@/constants/urls";

/** The user's row from the `Ratings` table: `overall` plus one column per puzzle theme. */
export type ThemeRatings = Record<string, unknown>;

export async function getMyRatings(): Promise<ThemeRatings> {
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${getApiUrl()}/ratings/me`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch ratings");
  }

  return res.json();
}

/** Reads a theme's rating, tolerating lowercase column names (backRankMate vs backrankmate). */
export function ratingFor(ratings: ThemeRatings | null, key: string): number | null {
  if (!ratings) return null;
  const lowered = key.toLowerCase();
  const column = key in ratings ? key : Object.keys(ratings).find((k) => k.toLowerCase() === lowered);
  const value = column ? ratings[column] : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}
