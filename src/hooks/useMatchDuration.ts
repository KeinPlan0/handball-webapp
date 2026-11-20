import { useEffect, useState } from "react";

const DURATION_KEY = "matchDurationMinutes";
const CLOCK_KEY = "matchClock";
export const DEFAULT_MATCH_DURATION_MINUTES = 60;

function isValidDuration(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 240;
}

function readDuration(): number {
    try {
        const stored = localStorage.getItem(DURATION_KEY);
        if (stored !== null) {
            const parsed = Number(stored);
            return isValidDuration(parsed) ? parsed : DEFAULT_MATCH_DURATION_MINUTES;
        }

        // Migrate the prior shared clock preference without losing the user's value.
        const clock = localStorage.getItem(CLOCK_KEY);
        const legacyDuration = clock ? (JSON.parse(clock) as { durationMinutes?: unknown }).durationMinutes : undefined;
        if (isValidDuration(legacyDuration)) {
            localStorage.setItem(DURATION_KEY, String(legacyDuration));
            return legacyDuration;
        }
    } catch (err) {
        // Use the default if storage contains invalid data or is unavailable.
        console.error("Failed to read match duration:", err);
    }
    return DEFAULT_MATCH_DURATION_MINUTES;
}

export function saveMatchDuration(value: number): number {
    const duration = Math.min(240, Math.max(1, Math.round(value)));
    try {
        localStorage.setItem(DURATION_KEY, String(duration));
    } catch (err) {
        // Keep the selected value usable in the current session.
        console.error("Failed to save match duration:", err);
    }
    window.dispatchEvent(new Event("matchDurationUpdated"));
    return duration;
}

export default function useMatchDuration(): [number, (value: number) => void] {
    const [duration, setDuration] = useState(readDuration);

    useEffect(() => {
        const refresh = () => setDuration(readDuration());
        const handleStorage = (event: StorageEvent) => {
            if (event.key === DURATION_KEY || event.key === CLOCK_KEY || event.key === null) refresh();
        };
        window.addEventListener("matchDurationUpdated", refresh);
        window.addEventListener("storage", handleStorage);
        return () => {
            window.removeEventListener("matchDurationUpdated", refresh);
            window.removeEventListener("storage", handleStorage);
        };
    }, []);

    return [duration, (value) => setDuration(saveMatchDuration(value))];
}
