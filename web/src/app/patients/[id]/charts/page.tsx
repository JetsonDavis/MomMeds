import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChartsLiveView } from "@/components/ChartsLiveView";
import { PatientLiveProvider } from "@/components/PatientLiveProvider";
import type { Event, EventWithMedication, Patient } from "@/lib/types";
import { endOfDay, startOfDay } from "date-fns";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientChartsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!patient) {
    notFound();
  }

  const typedPatient = patient as Patient;
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const [{ data: todayEvents }, { data: recentEvents }] = await Promise.all([
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
  ]);

  return (
    <PatientLiveProvider
      patientId={id}
      timezone={typedPatient.timezone}
      initialTodayEvents={(todayEvents ?? []) as Event[]}
      initialRecentEvents={(recentEvents ?? []) as EventWithMedication[]}
    >
      <div className="space-y-6">
        <div>
          <Link href={`/patients/${id}`} className="text-sm text-[var(--primary)]">
            ← Back to {typedPatient.display_name}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">Charts</h1>
          <p className="mt-1 text-[var(--muted)]">
            Hourly and daily reports for {typedPatient.display_name}
          </p>
        </div>

        <ChartsLiveView patientId={id} timezone={typedPatient.timezone} />
      </div>
    </PatientLiveProvider>
  );
}
