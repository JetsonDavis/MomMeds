"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Medication } from "@/lib/types";

type Props = {
  patientId: string;
  medications: Medication[];
};

export function MedicationEditor({ patientId, medications }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function addMedication(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const nextOrder =
      medications.reduce((max, med) => Math.max(max, med.sort_order), -1) + 1;

    const { error: insertError } = await supabase.from("medications").insert({
      patient_id: patientId,
      name: name.trim(),
      dose: dose.trim() || null,
      instructions: instructions.trim() || null,
      sort_order: nextOrder,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setName("");
    setDose("");
    setInstructions("");
    setLoading(false);
    router.refresh();
  }

  async function toggleActive(med: Medication) {
    const supabase = createClient();
    await supabase
      .from("medications")
      .update({ active: !med.active })
      .eq("id", med.id);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-semibold">Medications</h2>

      <ul className="mt-4 space-y-3">
        {medications.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No medications yet.</li>
        ) : (
          medications.map((med) => (
            <li
              key={med.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] p-4"
            >
              <div>
                <p className="font-medium">{med.name}</p>
                {med.dose && <p className="text-sm text-[var(--muted)]">{med.dose}</p>}
                {med.instructions && (
                  <p className="mt-1 text-sm text-[var(--muted)]">{med.instructions}</p>
                )}
              </div>
              <button
                onClick={() => toggleActive(med)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  med.active
                    ? "bg-green-100 text-green-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {med.active ? "Active" : "Inactive"}
              </button>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={addMedication} className="mt-6 space-y-3 border-t border-[var(--border)] pt-6">
        <h3 className="font-medium">Add medication</h3>
        <input
          required
          placeholder="Medication name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
        <input
          placeholder="Dose (optional)"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
        <textarea
          placeholder="Instructions (optional)"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Adding..." : "Add medication"}
        </button>
      </form>
    </section>
  );
}
