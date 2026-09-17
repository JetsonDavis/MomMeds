"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, generatePairingCode } from "@/lib/utils";
import type { DevicePublic } from "@/lib/types";

type Props = {
  patientId: string;
  devices: DevicePublic[];
};

export function DevicesPanel({ patientId, devices }: Props) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  async function generateCode() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pairingCode = generatePairingCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("pairing_codes").insert({
      code: pairingCode,
      patient_id: patientId,
      expires_at: expires,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setCode(pairingCode);
    setExpiresAt(expires);
    setLoading(false);
  }

  async function revokeDevice(deviceId: string) {
    const supabase = createClient();
    await supabase
      .from("devices")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", deviceId);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">iPhone devices</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Generate a pairing code and enter it on the patient&apos;s iPhone.
          </p>
        </div>
        <button
          onClick={generateCode}
          disabled={loading}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate pairing code"}
        </button>
      </div>

      {code && expiresAt && (
        <div className="mt-4 rounded-xl bg-blue-50 p-4">
          <p className="text-sm text-blue-900">Pairing code</p>
          <p className="mt-1 text-4xl font-bold tracking-[0.3em] text-blue-950">{code}</p>
          <p className="mt-2 text-sm text-blue-800">
            Expires in {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <ul className="mt-6 space-y-3">
        {devices.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No paired devices yet.</li>
        ) : (
          devices.map((device) => (
            <li
              key={device.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] p-4"
            >
              <div>
                <p className="font-medium">{device.label ?? "iPhone"}</p>
                <p className="text-sm text-[var(--muted)]">
                  Paired {formatDateTime(device.paired_at)}
                </p>
                {device.last_seen_at && (
                  <p className="text-sm text-[var(--muted)]">
                    Last seen {formatDateTime(device.last_seen_at)}
                  </p>
                )}
                {device.revoked_at && (
                  <p className="text-sm text-red-700">
                    Revoked {formatDateTime(device.revoked_at)}
                  </p>
                )}
              </div>
              {!device.revoked_at && (
                <button
                  onClick={() => revokeDevice(device.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700"
                >
                  Revoke
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
