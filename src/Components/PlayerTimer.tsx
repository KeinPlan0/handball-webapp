import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  index?: number;
};

export default function PlayerTimer({ index = 0 }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const prevElapsedRef = useRef<number>(0);

  const playerNames = useMemo<string[]>(() => {
    try {
      const raw = localStorage.getItem("playerNames");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const name = playerNames[index] ?? null;

  // start/stop interval when `running` changes
  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const delta = (now - (startRef.current ?? now)) + prevElapsedRef.current;
        setElapsedMs(delta);
      }, 100);
    } else {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // keep prevElapsedRef in sync
      prevElapsedRef.current = elapsedMs;
    }

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // intentionally excluding elapsedMs from deps to avoid resetting the interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggle = () => setRunning(r => !r);


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

