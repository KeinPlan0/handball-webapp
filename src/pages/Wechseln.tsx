import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Format = "4+1" | "2x3";
type Switch = { minute: number; outgoing: string[]; incoming: string[]; activeIndices: number[] };
type RotationPlan = { initialActive: number[]; schedule: Switch[] };

const PLAYER_NAMES_KEY = "playerNames";
const DEFAULT_DURATION_MINUTES = 60;
const ROTATION_SEED_KEY = "substitutionRotationSeed";

function readRotationSeed(): number {
    try {
        const saved = Number(localStorage.getItem(ROTATION_SEED_KEY));
        if (Number.isFinite(saved) && saved >= 0 && saved < 1) return saved;
    } catch {
        // Create a session seed if storage is unavailable.
    }
    const seed = Math.random();
    try {
        localStorage.setItem(ROTATION_SEED_KEY, String(seed));
    } catch {
        // The current page still keeps the generated seed in state.
    }
    return seed;
}

function formatTime(minutes: number): string {
    const totalSeconds = Math.round(minutes * 60);
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function readNames(): string[] {
    try {
        const stored = localStorage.getItem(PLAYER_NAMES_KEY);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === "string") : [];
    } catch {
        return [];
    }
}

function readDuration(): number {
    try {
        const saved = localStorage.getItem("matchClock");
        const duration = saved ? JSON.parse(saved).durationMinutes : DEFAULT_DURATION_MINUTES;
        return Number.isFinite(duration) && duration >= 1 && duration <= 240 ? duration : DEFAULT_DURATION_MINUTES;
    } catch {
        return DEFAULT_DURATION_MINUTES;
    }
}

function createSchedule(players: string[], activeCount: number, duration: number, seed: number): RotationPlan {
    if (players.length <= activeCount) {
        return { initialActive: players.map((_, index) => index), schedule: [] };
    }

    const playerCount = players.length;
    const rotationOrder = playerCount % 2 === 1
        ? Array.from({ length: playerCount }, (_, index) => (index * 2) % playerCount)
        : [
            ...Array.from({ length: playerCount / 2 }, (_, index) => index * 2),
            ...Array.from({ length: playerCount / 2 }, (_, index) => playerCount - 1 - index * 2),
        ];
    const randomOffset = Math.floor(seed * playerCount);
    const startOrder = rotationOrder.map((start) => (start + randomOffset) % playerCount);
    const lineupAt = (start: number) => Array.from({ length: activeCount }, (_, offset) => (start + offset) % playerCount);
    let active = lineupAt(startOrder[0]);
    const schedule: Switch[] = [];

    for (let lineupIndex = 1; lineupIndex < startOrder.length; lineupIndex += 1) {
        const minute = (duration * lineupIndex) / playerCount;
        const currentActive = active;
        const best = lineupAt(startOrder[lineupIndex]);
        const outgoingIndices = currentActive.filter((index) => !best.includes(index));
        const incomingIndices = best.filter((index) => !currentActive.includes(index));
        if (outgoingIndices.length > 0) {
            schedule.push({
                minute,
                outgoing: outgoingIndices.map((index) => players[index]),
                incoming: incomingIndices.map((index) => players[index]),
                activeIndices: best,
            });
        }
        active = best;
    }
    return { initialActive: lineupAt(startOrder[0]), schedule };
}

function calculatePlaytime(playerCount: number, initialActive: number[], duration: number, schedule: Switch[]): number[] {
    const playtime = Array.from({ length: playerCount }, () => 0);
    let active = initialActive;
    let previousMinute = 0;

    for (const change of schedule) {
        const segment = change.minute - previousMinute;
        for (const index of active) playtime[index] += segment;
        active = change.activeIndices;
        previousMinute = change.minute;
    }
    for (const index of active) playtime[index] += duration - previousMinute;
    return playtime;
}

export default function Wechseln() {
    const [players, setPlayers] = useState<string[]>(readNames);
    const [format, setFormat] = useState<Format>("4+1");
    const [duration, setDuration] = useState(readDuration);
    const [rotationSeed, setRotationSeed] = useState(readRotationSeed);
    const activeCount = format === "4+1" ? 5 : 7;

    useEffect(() => {
        const refreshPlayers = () => setPlayers(readNames());
        window.addEventListener("storage", refreshPlayers);
        window.addEventListener("playerNamesUpdated", refreshPlayers);
        return () => {
            window.removeEventListener("storage", refreshPlayers);
            window.removeEventListener("playerNamesUpdated", refreshPlayers);
        };
    }, []);

    const plan = useMemo(() => createSchedule(players, activeCount, duration, rotationSeed), [players, activeCount, duration, rotationSeed]);
    const schedule = plan.schedule;
    const playtime = useMemo(() => calculatePlaytime(players.length, plan.initialActive, duration, schedule), [players.length, plan.initialActive, duration, schedule]);
    const hasEnoughPlayers = players.length >= activeCount;
    const formatLabel = format === "4+1" ? "4+1" : "2×3 gegen 3";
    const formatDetail = format === "4+1"
        ? "Vier Feldspieler und eine Torhüterin oder ein Torhüter sind gleichzeitig auf dem Feld."
        : "Sechs Feldspieler sind aufgeteilt in drei Angreifer und drei Abwehrspieler, dazu kommt ein Torwart.";

    const rerollStartingLineup = () => {
        const nextSeed = Math.random();
        setRotationSeed(nextSeed);
        try {
            localStorage.setItem(ROTATION_SEED_KEY, String(nextSeed));
        } catch {
            // The new lineup remains selected for this page session.
        }
    };

    return (
        <div className="content-page switch-page">
            <div className="page-heading">
                <div><span className="section-kicker">FAIR VERTEILTE EINSATZZEIT</span><h1>Wechseln</h1><p>Ein klarer Wechselplan, damit alle möglichst gleich viel spielen.</p></div>
                <span className="heading-badge">MAX. 2<br />WECHSEL PRO STOPP</span>
            </div>

            <div className="switch-layout">
                <aside className="switch-settings">
                    <span className="section-kicker">SPIELEINSTELLUNGEN</span>
                    <label className="setting-label" htmlFor="match-format">Spielform</label>
                    <select id="match-format" value={format} onChange={(event) => setFormat(event.target.value as Format)}>
                        <option value="4+1">4+1</option>
                        <option value="2x3">2×3 gegen 3</option>
                    </select>
                    <p className="format-detail">{formatDetail}</p>
                    <label className="setting-label" htmlFor="match-duration">Spieldauer</label>
                    <div className="setting-input"><input id="match-duration" type="number" min="1" max="240" value={duration} onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value >= 1 && value <= 240) {
                            setDuration(value);
                            try {
                                const savedClock = localStorage.getItem("matchClock");
                                const clock = savedClock ? JSON.parse(savedClock) : { elapsedMs: 0, startedAt: null };
                                localStorage.setItem("matchClock", JSON.stringify({ ...clock, durationMinutes: value }));
                            } catch {
                                // Keep the planner usable if storage is unavailable.
                            }
                        }
                    }} /><span>Minuten</span></div>
                    <div className="active-count"><span>Gleichzeitig aktiv</span><strong>{activeCount}</strong></div>
                    <button className="button shuffle-button" type="button" onClick={rerollStartingLineup}><span aria-hidden="true">⤨</span> Startaufstellung neu auswürfeln</button>
                    <p className="planner-note">Die Wechselzeiten richten sich automatisch nach Kadergröße und Spieldauer. Pro Stopp wechseln höchstens zwei Spieler rein und raus.</p>
                </aside>

                <section className="schedule-card" aria-label="Wechselplan">
                    <div className="schedule-heading"><div><span className="section-kicker">DEIN WECHSELPLAN</span><h2>{formatLabel} · {duration} Minuten</h2></div><span className="schedule-total">{schedule.length} <small>WECHSEL</small></span></div>
                    {players.length === 0 ? (
                        <div className="schedule-empty"><span className="empty-icon">＋</span><h3>Füge zuerst dein Team hinzu</h3><p>Der Wechselplan wird aus deinen Spielern erstellt.</p><Link className="button button-primary" to="/spieler">Zum Kader <span aria-hidden="true">→</span></Link></div>
                    ) : !hasEnoughPlayers ? (
                        <div className="schedule-empty"><h3>Noch nicht genug Spieler</h3><p>Für {formatLabel} brauchst du mindestens {activeCount} Spieler. Aktuell sind {players.length} im Kader.</p></div>
                    ) : schedule.length === 0 ? (
                        <div className="schedule-empty"><h3>Keine Wechsel nötig</h3><p>Mit {players.length} Spielern sind alle im gewählten Format gleichzeitig aktiv.</p></div>
                    ) : (
                        <>
                        <div className="schedule-start"><span className="schedule-start-time">00:00</span><span><strong>Startaufstellung</strong><small>{plan.initialActive.map((index) => players[index]).join(" · ")}</small></span></div>
                        <ol className="schedule-list">{schedule.map((change, index) => (
                            <li className="schedule-item" key={`${change.minute}-${index}`}>
                                <span className="schedule-time">{formatTime(change.minute)}<small>MIN</small></span>
                                <span className="schedule-connector" />
                                <div className="schedule-change"><span className="schedule-action"><span className="out-arrow">↓</span> RAUS</span><div className="schedule-names">{change.outgoing.map((name, nameIndex) => <span className="out-name" key={`${name}-${nameIndex}`}>{name}</span>)}</div><span className="schedule-action"><span className="in-arrow">↑</span> REIN</span><div className="schedule-names">{change.incoming.map((name, nameIndex) => <span className="in-name" key={`${name}-${nameIndex}`}>{name}</span>)}</div></div>
                                <span className="change-count">{change.incoming.length}↔{change.outgoing.length}</span>
                            </li>
                        ))}</ol>
                        </>
                    )}
                    <div className="schedule-footnote">Die Rotation ist so berechnet, dass alle am Ende gleich viele Minuten spielen. Zeiten können dadurch auch innerhalb einer Minute liegen. Bei 2×3 gegen 3 zusätzlich Angriff, Abwehr und Bank rotieren.</div>
                    {hasEnoughPlayers && <section className="playtime-summary" aria-label="Geplante Einsatzzeit je Spieler">
                        <div className="playtime-heading"><div><span className="section-kicker">FAIRE VERTEILUNG</span><h3>Geplante Einsatzzeit</h3></div><span>von {duration} Min.</span></div>
                        <ul>{players.map((player, index) => <li key={`${player}-${index}`}><span className="playtime-player"><span className="player-avatar">{player.trim().charAt(0).toUpperCase()}</span>{player}</span><span className="playtime-bar"><span style={{ width: `${Math.min(100, (playtime[index] / duration) * 100)}%` }} /></span><strong>{playtime[index]} Min.</strong></li>)}</ul>
                    </section>}
                </section>
            </div>

            <section className="format-notes">
                <span className="section-kicker">DIE BEIDEN SPIELFORMEN</span>
                <div className="format-note-grid">
                    <article><strong>4+1</strong><p>Vier Feldspieler plus Torwart spielen auf dem Querfeld. Diese Form wird unter anderem im Minihandball verwendet.</p></article>
                    <article><strong>2×3 gegen 3</strong><p>Pro Team spielen sechs Feldspieler, je drei in Angriffs- und Abwehrhälfte, plus Torwart. Die Mittellinie darf im Spiel nicht überquert werden; Wechsel und Rollenrotation folgen den Regeln des jeweiligen Verbands.</p></article>
                </div>
                <p className="format-sources">Grundlagen: <a href="https://www.dhb-trainercenter.de/fileadmin/user_upload/pageflip/durchfuehrungsbestimmungen/10/" target="_blank" rel="noreferrer">DHB Durchführungsbestimmungen</a> · <a href="https://handball-bes.de/wp-content/uploads/2025/07/250727-DfB-HK-BES-Saison-25_26-mit-Anlagen-Version-1-finalisiert.pdf" target="_blank" rel="noreferrer">Handballkreis BES 2025/26</a></p>
            </section>
        </div>
    );
}
