import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing Supabase service role configuration");
  }
  return createClient(url, key);
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type DeviceRecord = {
  id: string;
  patient_id: string;
  revoked_at: string | null;
};

export async function lookupDevice(
  supabase: SupabaseClient,
  token: string,
): Promise<DeviceRecord | null> {
  const tokenHash = await hashToken(token);
  const { data, error } = await supabase
    .from("devices")
    .select("id, patient_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.revoked_at) {
    return null;
  }

  return data;
}

export function getDeviceToken(req: Request): string | null {
  const header = req.headers.get("X-Device-Token")?.trim();
  if (header) {
    return header;
  }
  return null;
}
