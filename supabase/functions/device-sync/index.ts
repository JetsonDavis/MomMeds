import { getDeviceToken, getServiceClient, lookupDevice } from "../_shared/auth.ts";
import { buildDevicePayload, patientSelectFields } from "../_shared/device_payload.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) {
    return options;
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const token = getDeviceToken(req);
  if (!token) {
    return jsonResponse({ error: "Missing device token" }, 401);
  }

  const supabase = getServiceClient();
  const device = await lookupDevice(supabase, token);
  if (!device) {
    return jsonResponse({ error: "Invalid or revoked device" }, 401);
  }

  const now = new Date().toISOString();
  await supabase
    .from("devices")
    .update({ last_seen_at: now })
    .eq("id", device.id);

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select(patientSelectFields)
    .eq("id", device.patient_id)
    .single();

  if (patientError || !patient) {
    console.error(patientError);
    return jsonResponse({ error: "Failed to load patient" }, 500);
  }

  if (!patient.active) {
    return jsonResponse({ error: "Patient is inactive" }, 403);
  }

  try {
    const payload = await buildDevicePayload(supabase, patient, device.id);
    return jsonResponse(payload);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to load device sync payload" }, 500);
  }
});
