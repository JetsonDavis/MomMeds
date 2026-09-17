import type { Event } from "@/lib/types";

type Props = {
  events: Event[];
};

export function SummaryCards({ events }: Props) {
  const feelGreat = events.filter((e) => e.type === "feel_great").length;
  const dizzy = events.filter((e) => e.type === "dizzy").length;
  const painEvents = events.filter((e) => e.type === "pain");
  const medsTaken = events.filter((e) => e.type === "med_taken").length;
  const lastPain = painEvents[0]?.pain_level ?? null;

  const cards = [
    { label: "Feel great", value: feelGreat, color: "text-green-700" },
    { label: "Dizzy / unstable", value: dizzy, color: "text-amber-700" },
    { label: "Pain reports", value: painEvents.length, color: "text-red-700" },
    { label: "Last pain level", value: lastPain ?? "—", color: "text-red-700" },
    { label: "Meds taken", value: medsTaken, color: "text-blue-700" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <p className="text-sm text-[var(--muted)]">{card.label}</p>
          <p className={`mt-2 text-3xl font-semibold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
