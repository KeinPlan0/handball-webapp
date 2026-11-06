import React, { useEffect, useState } from "react";

type SavedClock = {
  elapsedMs: number;
  startedAt: number | null;
  durationMinutes?: number;
};

const STORAGE_KEY = "matchClock";
const DEFAULT_DURATION_MINUTES = 20;
function readClock(): SavedClock {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SavedClock>;
      if (typeof parsed.elapsedMs === "number" && Number.isFinite(parsed.elapsedMs)) {
        return {
          elapsedMs: Math.max(0, parsed.elapsedMs),
          startedAt: typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt)
            ? parsed.startedAt
            : null,
          durationMinutes: typeof parsed.durationMinutes === "number" && Number.isFinite(parsed.durationMinutes)
            ? parsed.durationMinutes
            : DEFAULT_DURATION_MINUTES,
        };
      }
    }
  } catch {
    // Ignore unavailable or malformed saved clock data.
  }
  return { elapsedMs: 0, startedAt: null };
}

export default function MatchClock() {
    const [durationInput, setDurationInput] = useState("20");
    const [clock, setClock] = useState<SavedClock>(readClock);
  const [now, setNow] = useState(() => Date.now());
  const [durationMinutes, setDurationMinutes] = useState(() => {
    const savedDuration = readClock().durationMinutes;
    return typeof savedDuration === "number" && savedDuration >= 1 && savedDuration <= 240
      ? savedDuration
      : DEFAULT_DURATION_MINUTES;
  });
  const running = clock.startedAt !== null;
  const elapsedMs = Math.min(
    durationMinutes * 60_000,
    clock.elapsedMs + (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt)),
  );
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  useEffect(() => {
    if (!running) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [running]);

  const saveClock = (nextClock: SavedClock) => {
    setClock(nextClock);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextClock));
    } catch {
      // Keep the clock usable in this session if storage is unavailable.
    }
  };

  const setDuration = (value: number) => {
    const nextDuration = Math.min(240, Math.max(1, value));
    setDurationMinutes(nextDuration);
    saveClock({ ...clock, durationMinutes: nextDuration });
  };

  useEffect(() => {
    if (running && elapsedMs >= durationMinutes * 60_000) {
      saveClock({ elapsedMs: durationMinutes * 60_000, startedAt: null, durationMinutes });
      setNow(Date.now());
    }
  }, [durationMinutes, elapsedMs, running]);

  const toggle = () => {
    const timestamp = Date.now();
    const nextClock = running
      ? { elapsedMs: clock.elapsedMs + Math.max(0, timestamp - (clock.startedAt ?? timestamp)), startedAt: null }
      : { ...clock, startedAt: timestamp };
    setNow(timestamp);
    saveClock(nextClock);
  };

  const reset = () => {
    setNow(Date.now());
    saveClock({ elapsedMs: 0, startedAt: null, durationMinutes });
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("playerTimer:"))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // The in-page timers are still reset if storage is unavailable.
    }
    window.dispatchEvent(new Event("playerTimersReset"));
  };

  return (
    <section className={`match-clock ${running ? "match-clock-running" : ""}`} aria-label="Match clock">
      <div className="match-clock-readout">
        <span className="section-kicker">SPIELUHR</span>
        <span className="match-clock-time" aria-live="off">
          {String(minutes).padStart(2, "0")}<span>:</span>{String(seconds).padStart(2, "0")}
        </span>
        <span className="match-clock-status"><span className="status-dot" />{running ? "SPIEL LÄUFT" : "SPIEL PAUSIERT"}</span>
        <label className="match-duration">SPIELDAUER <span><input
            type="number"
            min="1"
            max="240"
            value={durationInput}
            onChange={(event) => {
                setDurationInput(event.target.value);

                const value = Number(event.target.value);
                if (!isNaN(value) && value >= 1 && value <= 240) {
                    setDuration(value);
                }
            }}
        /> min</span></label>
      </div>
      <div className="match-clock-controls">
        <button className="button button-primary" type="button" onClick={toggle}>{running ? "Pausieren" : "Spiel starten"}<span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span></button>
        <button className="text-button match-clock-reset" type="button" onClick={reset}>Spiel &amp; Spieler zurücksetzen</button>
      </div>
    </section>
  );
}
