import { createClient } from "@/lib/supabase/server";

export type WordmarkColor = "blue" | "red" | "orange" | "green" | "pink" | "violet";
export type WordmarkSegment = { text: string; color: WordmarkColor };

export type SystemSettings = {
  id: number;
  system_name: string;
  logo_color_url: string | null;
  logo_white_url: string | null;
  logo_transparent_url: string | null;
  wordmark_segments: WordmarkSegment[];
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("id, system_name, logo_color_url, logo_white_url, logo_transparent_url, wordmark_segments")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return {
      id: 0,
      system_name: "Conectarte",
      logo_color_url: null,
      logo_white_url: null,
      logo_transparent_url: null,
      wordmark_segments: [
        { text: "Conect", color: "blue" },
        { text: "ar", color: "red" },
        { text: "t", color: "orange" },
        { text: "e", color: "green" },
      ],
    };
  }

  return data as SystemSettings;
}

