import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChartsView } from "@/components/ChartsView";
import type { Patient } from "@/lib/types";

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

  return (
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

      <ChartsView patientId={id} timezone={typedPatient.timezone} />
    </div>
  );
}
