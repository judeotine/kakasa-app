import { supabase } from "@/lib/supabase";

export interface PrefillProfile {
  full_name: string;
  date_of_birth: string;
  gender: string;
  location: string;
  phone: string;
}

export async function getProfileForPrefill(): Promise<PrefillProfile> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return { full_name: "", date_of_birth: "", gender: "", location: "", phone: "" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("full_name, location, gender, date_of_birth, phone")
    .eq("id", userId)
    .maybeSingle();

  return {
    full_name: data?.full_name ?? "",
    date_of_birth: data?.date_of_birth ?? "",
    gender: data?.gender ?? "",
    location: data?.location ?? "",
    phone: data?.phone ?? userData.user?.phone ?? "",
  };
}
