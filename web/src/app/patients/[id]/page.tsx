import Link from "next/link";
import { notFound } from "next/navigation";
import { startOfDay, endOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/SummaryCards";
import { RecentEvents } from "@/components/RecentEvents";
import { MedicationEditor } from "@/components/MedicationEditor";
import { DevicesPanel } from "@/components/DevicesPanel";
import type { DevicePublic, Event, EventWithMedication, Medication, Patient } from "@/lib/types";

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
  ]);

  return (
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

      <div>
        <h2 className="mb-4 text-lg font-semibold">Today&apos;s summary</h2>
        <SummaryCards events={(todayEvents ?? []) as Event[]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentEvents
          patientId={id}
          timezone={typedPatient.timezone}
          initialEvents={(recentEvents ?? []) as EventWithMedication[]}
        />
        <MedicationEditor
          patientId={id}
          medications={(medications ?? []) as Medication[]}
        />
      </div>

      <DevicesPanel
        patientId={id}
        devices={(devices ?? []) as DevicePublic[]}
      />
    </div>
  );
}
