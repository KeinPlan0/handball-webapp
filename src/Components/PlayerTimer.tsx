import React, { useEffect, useMemo, useState } from "react";

type Props = {
  index?: number;
};

type SavedTimer = {
  elapsedMs: number;
  startedAt: number | null;
};

function readTimer(key: string): SavedTimer {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SavedTimer>;
      if (typeof parsed.elapsedMs === "number" && Number.isFinite(parsed.elapsedMs)) {
        return {
          elapsedMs: Math.max(0, parsed.elapsedMs),
          startedAt: typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt)
            ? parsed.startedAt
            : null,
        };
      }
    }
  } catch {
    // Ignore unavailable or malformed saved timer data.
  }
  return { elapsedMs: 0, startedAt: null };
}

export default function PlayerTimer({ index = 0 }: Props) {
  const playerNames = useMemo<string[]>(() => {
    try {
      const raw = localStorage.getItem("playerNames");
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }, []);

  const name = playerNames[index] ?? null;
  const storageKey = `playerTimer:${index}:${name ?? "unknown"}`;
  const [timer, setTimer] = useState<SavedTimer>(() => readTimer(storageKey));
  const [now, setNow] = useState(() => Date.now());
  const running = timer.startedAt !== null;
  const elapsedMs = timer.elapsedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt));

  useEffect(() => {
    if (!running) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(intervalId);
  }, [running]);

  useEffect(() => {
    const resetTimer = () => {
      const resetValue = { elapsedMs: 0, startedAt: null };
      setTimer(resetValue);
      setNow(Date.now());
    };
    window.addEventListener("playerTimersReset", resetTimer);
    return () => window.removeEventListener("playerTimersReset", resetTimer);
  }, []);

  const toggle = () => {
    const timestamp = Date.now();
    const nextTimer = running
      ? { elapsedMs: timer.elapsedMs + Math.max(0, timestamp - (timer.startedAt ?? timestamp)), startedAt: null }
      : { ...timer, startedAt: timestamp };

    setTimer(nextTimer);
    setNow(timestamp);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextTimer));
    } catch {
      // The timer remains usable for this session if storage is unavailable.
    }
  };

  return (
    <button
      type="button"
      className={`player-timer ${running ? "running" : ""}`}
      onClick={toggle}
      aria-pressed={running}
      aria-label={name ? `Timer for ${name}` : "Player timer"}
    >
      <span className="timer-avatar">{name?.trim().charAt(0).toUpperCase() || "?"}</span>
      <span className="player-name">{name ?? "No player"}</span>
      <span className="timer">{formatMs(elapsedMs)}</span>
      <span className="timer-state"><span className="status-dot" />{running ? "IM EINSATZ" : "BEREIT"}</span>
      <span className="timer-hint">{running ? "Tippen zum Pausieren" : "Tippen zum Starten"}</span>
    </button>
  );
}

function formatMs(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}
