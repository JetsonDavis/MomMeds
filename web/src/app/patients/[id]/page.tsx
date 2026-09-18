import Link from "next/link";
import { notFound } from "next/navigation";
import { startOfDay, endOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PatientLiveProvider } from "@/components/PatientLiveProvider";
import { PatientRecentEvents } from "@/components/PatientRecentEvents";
import { PatientTodaySummary } from "@/components/PatientTodaySummary";
import { MedicationEditor } from "@/components/MedicationEditor";
import { DevicesPanel } from "@/components/DevicesPanel";
import { NotificationPanel } from "@/components/NotificationPanel";
import type {
  CaregiverMessage,
  DevicePublic,
  Event,
  EventWithMedication,
  Medication,
  Patient,
} from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (patientError) {
    throw new Error(patientError.message);
  }

  if (!patient) {
    notFound();
  }

  const typedPatient = patient as Patient;
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const [
    { data: todayEvents },
    { data: recentEvents },
    { data: medications },
    { data: devices },
    { data: caregiverMessages },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("patient_id", id)
      .gte("recorded_at", todayStart)
      .lte("recorded_at", todayEnd)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("events")
      .select("*, medications(name)")
      .eq("patient_id", id)
      .order("recorded_at", { ascending: false })
      .limit(20),
    supabase
      .from("medications")
      .select("*")
      .eq("patient_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("devices_public")
      .select("*")
      .eq("patient_id", id)
      .order("paired_at", { ascending: false }),
    supabase
      .from("caregiver_messages")
      .select("*")
      .eq("patient_id", id)
      .order("sent_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <PatientLiveProvider
      patientId={id}
      timezone={typedPatient.timezone}
      initialTodayEvents={(todayEvents ?? []) as Event[]}
      initialRecentEvents={(recentEvents ?? []) as EventWithMedication[]}
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/patients" className="text-sm text-[var(--primary)]">
              ← All patients
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{typedPatient.display_name}</h1>
            <p className="mt-1 text-[var(--muted)]">
              {typedPatient.phone ?? "No phone on file"} · {typedPatient.timezone}
            </p>
          </div>
          <Link
            href={`/patients/${id}/charts`}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
          >
            View charts
          </Link>
        </div>

        <PatientTodaySummary />

        <div className="grid gap-6 lg:grid-cols-2">
          <PatientRecentEvents timezone={typedPatient.timezone} />
          <MedicationEditor
            patientId={id}
            medications={(medications ?? []) as Medication[]}
          />
        </div>

        <NotificationPanel
          patient={typedPatient}
          timezone={typedPatient.timezone}
          initialMessages={(caregiverMessages ?? []) as CaregiverMessage[]}
        />

        <DevicesPanel
          patientId={id}
          devices={(devices ?? []) as DevicePublic[]}
        />
      </div>
    </PatientLiveProvider>
  );
}
