import { getDeviceToken, getServiceClient, lookupDevice } from "../_shared/auth.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const VALID_TYPES = new Set(["feel_great", "dizzy", "pain", "med_taken"]);

type IncomingEvent = {
  clientEventId?: string;
  type?: string;
  painLevel?: number;
  medicationId?: string;
  recordedAt?: string;
};

type EventsRequest = {
  events?: IncomingEvent[];
};

function validateEvent(event: IncomingEvent): string | null {
  if (!event.clientEventId) {
    return "clientEventId is required";
  }
  if (!event.type || !VALID_TYPES.has(event.type)) {
    return "Invalid event type";
  }
  if (!event.recordedAt) {
    return "recordedAt is required";
  }
  if (Number.isNaN(Date.parse(event.recordedAt))) {
    return "recordedAt must be a valid ISO timestamp";
  }
  if (event.type === "pain") {
    if (
      typeof event.painLevel !== "number" ||
      event.painLevel < 1 ||
      event.painLevel > 10
    ) {
      return "painLevel must be between 1 and 10 for pain events";
    }
  }
  if (event.type === "med_taken" && !event.medicationId) {
    return "medicationId is required for med_taken events";
  }
  return null;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) {
    return options;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const token = getDeviceToken(req);
  if (!token) {
    return jsonResponse({ error: "Missing device token" }, 401);
  }

  let body: EventsRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const events = body.events ?? [];
  if (events.length === 0) {
    return jsonResponse({ error: "At least one event is required" }, 400);
  }

  for (const event of events) {
    const validationError = validateEvent(event);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }
  }

  const supabase = getServiceClient();
  const device = await lookupDevice(supabase, token);
  if (!device) {
    return jsonResponse({ error: "Invalid or revoked device" }, 401);
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, active")
    .eq("id", device.patient_id)
    .single();

  if (patientError || !patient?.active) {
    return jsonResponse({ error: "Patient is inactive" }, 403);
  }

  const rows = events.map((event) => ({
    patient_id: device.patient_id,
    device_id: device.id,
    type: event.type,
    pain_level: event.type === "pain" ? event.painLevel : null,
    medication_id: event.type === "med_taken" ? event.medicationId : null,
    recorded_at: event.recordedAt,
    client_event_id: event.clientEventId,
  }));

  const { data, error } = await supabase
    .from("events")
    .upsert(rows, { onConflict: "client_event_id", ignoreDuplicates: true })
    .select("client_event_id");

  if (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to store events" }, 500);
  }

  const acceptedIds = (data ?? []).map((row) => row.client_event_id);
  const allIds = events.map((event) => event.clientEventId!);

  return jsonResponse({
    acceptedClientEventIds: acceptedIds.length > 0 ? acceptedIds : allIds,
  });
});
