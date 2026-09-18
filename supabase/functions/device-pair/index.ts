import {
  generateToken,
  getServiceClient,
  hashToken,
} from "../_shared/auth.ts";
import { buildDevicePayload, patientSelectFields } from "../_shared/device_payload.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

type PairRequest = {
  code?: string;
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) {
    return options;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: PairRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const code = body.code?.trim().replace(/\D/g, "");
  if (!code || code.length !== 6) {
    return jsonResponse({ error: "A 6-digit pairing code is required" }, 400);
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data: pairingCode, error: codeError } = await supabase
    .from("pairing_codes")
    .select("code, patient_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (codeError) {
    console.error(codeError);
    return jsonResponse({ error: "Failed to validate pairing code" }, 500);
  }

  if (!pairingCode) {
    return jsonResponse({ error: "Invalid pairing code" }, 404);
  }

  if (pairingCode.used_at) {
    return jsonResponse({ error: "Pairing code already used" }, 409);
  }

  if (pairingCode.expires_at <= now) {
    return jsonResponse({ error: "Pairing code expired" }, 410);
  }

  const deviceToken = generateToken();
  const tokenHash = await hashToken(deviceToken);

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .insert({
      patient_id: pairingCode.patient_id,
      token_hash: tokenHash,
      label: "iPhone",
      last_seen_at: now,
    })
    .select("id")
    .single();

  if (deviceError || !device) {
    console.error(deviceError);
    return jsonResponse({ error: "Failed to register device" }, 500);
  }

  const { error: markUsedError } = await supabase
    .from("pairing_codes")
    .update({ used_at: now })
    .eq("code", code)
    .is("used_at", null);

  if (markUsedError) {
    console.error(markUsedError);
    return jsonResponse({ error: "Failed to finalize pairing" }, 500);
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select(patientSelectFields)
    .eq("id", pairingCode.patient_id)
    .single();

  if (patientError || !patient) {
    console.error(patientError);
    return jsonResponse({ error: "Failed to load patient" }, 500);
  }

  try {
    const payload = await buildDevicePayload(supabase, patient, device.id);
    return jsonResponse({
      deviceToken,
      ...payload,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to load pairing payload" }, 500);
  }
});
