import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewPatientForm } from "@/components/NewPatientForm";
import type { Patient } from "@/lib/types";

export default async function PatientsPage() {
  const supabase = await createClient();
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const list = (patients ?? []) as Patient[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Patients</h1>
        <p className="mt-2 text-[var(--muted)]">
          Manage patients, medications, and iPhone pairing codes.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-[var(--muted)] md:col-span-2">
            No patients yet. Create one below.
          </div>
        ) : (
          list.map((patient) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 transition hover:border-[var(--primary)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{patient.display_name}</h2>
                  {patient.phone && (
                    <p className="mt-1 text-sm text-[var(--muted)]">{patient.phone}</p>
                  )}
                  <p className="mt-2 text-sm text-[var(--muted)]">{patient.timezone}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    patient.active
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {patient.active ? "Active" : "Inactive"}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>

      <NewPatientForm />
    </div>
  );
}
