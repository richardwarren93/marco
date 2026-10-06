import type { createAdminClient } from "@/lib/supabase/admin";

/** How many OTHER people share a household or a table with this user. */
export async function peopleCount(admin: ReturnType<typeof createAdminClient>, uid: string): Promise<number> {
  try {
    const [hh, crews] = await Promise.all([
      admin.from("household_members").select("household_id").eq("user_id", uid),
      admin.from("crew_members").select("crew_id").eq("user_id", uid),
    ]);
    const hhIds = (hh.data ?? []).map((r: { household_id: string }) => r.household_id);
    const crewIds = (crews.data ?? []).map((r: { crew_id: string }) => r.crew_id);
    const [hm, cm] = await Promise.all([
      hhIds.length ? admin.from("household_members").select("user_id").in("household_id", hhIds).neq("user_id", uid) : Promise.resolve({ data: [] as { user_id: string }[] }),
      crewIds.length ? admin.from("crew_members").select("user_id").in("crew_id", crewIds).neq("user_id", uid) : Promise.resolve({ data: [] as { user_id: string }[] }),
    ]);
    const others = new Set([...(hm.data ?? []), ...(cm.data ?? [])].map((r: { user_id: string }) => r.user_id));
    return others.size;
  } catch {
    return 0;
  }
}
