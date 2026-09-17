import { getDeviceToken, getServiceClient, lookupDevice } from "../_shared/auth.ts";
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
    .select("id, display_name, timezone, active")
    .eq("id", device.patient_id)
    .single();

  if (patientError || !patient) {
    console.error(patientError);
    return jsonResponse({ error: "Failed to load patient" }, 500);
  }

  if (!patient.active) {
    return jsonResponse({ error: "Patient is inactive" }, 403);
  }

  const { data: medications, error: medsError } = await supabase
    .from("medications")
    .select("id, name, dose, sort_order")
    .eq("patient_id", device.patient_id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (medsError) {
    console.error(medsError);
    return jsonResponse({ error: "Failed to load medications" }, 500);
  }

  return jsonResponse({
    patient: {
      id: patient.id,
      displayName: patient.display_name,
      timezone: patient.timezone,
    },
    medications: (medications ?? []).map((med) => ({
      id: med.id,
      name: med.name,
      dose: med.dose,
      sortOrder: med.sort_order,
    })),
  });
});
