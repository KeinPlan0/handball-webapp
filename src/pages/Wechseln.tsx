import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Format = "4+1" | "2x3";
type Switch = {
    minute: number;
    outgoing: string[];
    incoming: string[];
    activeIndices: number[];
    goalkeeperIndex?: number;
    outgoingGoalkeeperIndex?: number;
};
type RotationPlan = { initialActive: number[]; initialGoalkeeperIndex?: number; schedule: Switch[] };

const PLAYER_NAMES_KEY = "playerNames";
const DEFAULT_DURATION_MINUTES = 60;
const ROTATION_SEED_KEY = "substitutionRotationSeed";
const GOALKEEPER_NAMES_KEY = "goalkeeperPlayers";

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

function readGoalkeeperNames(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(GOALKEEPER_NAMES_KEY) || "[]");
        return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === "string") : [];
    } catch {
        return [];
    }
}

function createPlayerKeys(names: string[]): string[] {
    const occurrences = new Map<string, number>();
    return names.map((name) => {
        const occurrence = occurrences.get(name) || 0;
        occurrences.set(name, occurrence + 1);
        return JSON.stringify([name, occurrence]);
    });
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

function createKeeperSchedule(players: string[], keeperIndices: number[], activeCount: number, duration: number, seed: number, phaseFairnessToleranceSeconds: number | number[] = 0, rotationPatternOffset = 0): RotationPlan {
    const playerCount = players.length;
    if (keeperIndices.length === 0) return createSchedule(players, activeCount, duration, seed);

    const totalSeconds = duration * 60;
    const benchCount = Math.max(0, playerCount - activeCount);
    const keeperOffset = Math.floor(seed * keeperIndices.length);
    const keeperOrder = keeperIndices.map((_, index) => keeperIndices[(index + keeperOffset) % keeperIndices.length]);
    const keeperDutySeconds = totalSeconds / keeperOrder.length;
    const fieldSlots = Math.max(0, activeCount - 1);

    if (playerCount < activeCount || benchCount === 0 || fieldSlots === 0) {
        const initialGoalkeeper = keeperOrder[0];
        const schedule: Switch[] = [];
        for (let block = 1; block < keeperOrder.length; block += 1) {
            schedule.push({
                minute: (keeperDutySeconds * block) / 60,
                outgoing: [],
                incoming: [],
                activeIndices: players.map((_, index) => index),
                outgoingGoalkeeperIndex: keeperOrder[block - 1],
                goalkeeperIndex: keeperOrder[block],
            });
        }
        return { initialActive: players.map((_, index) => index), initialGoalkeeperIndex: initialGoalkeeper, schedule };
    }

    const keeperSet = new Set(keeperIndices);
    let low = 0;
    let high = totalSeconds;
    for (let iteration = 0; iteration < 64; iteration += 1) {
        const target = (low + high) / 2;
        const requestedFieldSeconds = players.reduce((sum, _, index) => {
            const duty = keeperSet.has(index) ? keeperDutySeconds : 0;
            return sum + Math.max(0, target - duty);
        }, 0);
        if (requestedFieldSeconds < fieldSlots * totalSeconds) low = target;
        else high = target;
    }
    const fairTotalSeconds = (low + high) / 2;
    const fieldOnlyIndices = players.map((_, index) => index).filter((index) => !keeperSet.has(index));
    const otherKeepers = (goalkeeper: number) => keeperIndices.filter((index) => index !== goalkeeper);
    const nameRank = players.map((_, index) => (index + playerCount - Math.floor(seed * playerCount)) % playerCount);
    const rankByFairSeed = (indices: number[]) => [...indices].sort((a, b) => nameRank[a] - nameRank[b]);

    const makePhaseSequence = (keeperSlotsAverage: number, blockLength: number, startingKeeperSlots: number): Array<{ keeperSlots: number; length: number }> => {
        const minKeeperSlots = Math.max(0, benchCount - fieldOnlyIndices.length);
        const maxKeeperSlots = Math.min(benchCount, Math.max(0, keeperIndices.length - 1));
        const average = Math.min(maxKeeperSlots, Math.max(minKeeperSlots, keeperSlotsAverage));
        const floorSlots = Math.floor(average + 1e-9);
        const ceilSlots = Math.ceil(average - 1e-9);
        if (floorSlots === ceilSlots) return [{ keeperSlots: floorSlots, length: blockLength }];

        const floorLength = blockLength * (ceilSlots - average);
        const ceilLength = blockLength - floorLength;
        const startWithFloor = startingKeeperSlots === floorSlots;
        const firstSlots = startWithFloor ? floorSlots : ceilSlots;
        const firstLength = (startWithFloor ? floorLength : ceilLength) / 2;
        const middleSlots = startWithFloor ? ceilSlots : floorSlots;
        const middleLength = startWithFloor ? ceilLength : floorLength;
        return [
            { keeperSlots: firstSlots, length: firstLength },
            { keeperSlots: middleSlots, length: middleLength },
            { keeperSlots: firstSlots, length: firstLength },
        ].filter((phase) => phase.length > 1e-7);
    };

    const subsetPreserving = (group: number[], count: number, current: number[]) => {
        const kept = current.filter((index) => group.includes(index)).slice(0, count);
        for (const index of rankByFairSeed(group)) {
            if (kept.length >= count) break;
            if (!kept.includes(index)) kept.push(index);
        }
        return kept;
    };

    const lineupForRotation = (group: number[], slots: number, selected: number[], start: number) => {
        if (slots === 0 || group.length === 0) return [];
        if (slots >= group.length) return [...group];
        const order = [...selected, ...rankByFairSeed(group).filter((index) => !selected.includes(index))];
        return Array.from({ length: slots }, (_, offset) => order[(start + offset) % order.length]);
    };

    const rotationStarts = (groupLength: number, rotationCount: number, reverse: boolean) => {
        const allStarts: number[] = [];
        if (groupLength % 2 === 0) {
            if (reverse) {
                for (let start = 0; start > -groupLength; start -= 2) allStarts.push((start + groupLength) % groupLength);
                allStarts.push(1);
                for (let start = groupLength - 1; start > 1; start -= 2) allStarts.push(start);
            } else {
                for (let start = 0; start < groupLength; start += 2) allStarts.push(start);
                for (let start = groupLength - 1; start > 0; start -= 2) allStarts.push(start);
            }
        } else {
            const step = reverse ? groupLength - 2 : 2;
            for (let index = 0; index < groupLength; index += 1) allStarts.push((index * step) % groupLength);
        }
        return allStarts.slice(0, rotationCount);
    };
    const chooseRotationCount = (groupLength: number, slots: number, phaseLength: number, reverse: boolean, phaseTolerance: number) => {
        // Start with as few rotation waves as possible. Longer shifts matter
        // more in practice than perfectly even playtime within each phase.
        const minimumCount = 1;
        for (let count = minimumCount; count <= groupLength; count += 1) {
            const starts = rotationStarts(groupLength, count, reverse);
            const appearances = Array.from({ length: groupLength }, (_, playerOffset) => starts.reduce((total, start) => {
                for (let slot = 0; slot < slots; slot += 1) {
                    if ((start + slot) % groupLength === playerOffset) return total + 1;
                }
                return total;
            }, 0));
            const idealSeconds = (slots * phaseLength) / groupLength;
            const deviation = Math.max(...appearances.map((appearancesForPlayer) => Math.abs((appearancesForPlayer * phaseLength / count) - idealSeconds)));
            if (deviation <= phaseTolerance + 1e-7) return count;
        }
        return groupLength;
    };

    const schedule: Switch[] = [];
    const firstGoalkeeper = keeperOrder[0];
    let goalkeeper = firstGoalkeeper;
    let bench = new Set<number>();
    let active = new Set<number>();
    let initialActive: number[] = [];
    let nextKeeperSlots = 0;

    const setActiveFromBench = (newBench: Set<number>) => new Set(players.map((_, index) => index).filter((index) => !newBench.has(index)));
    const recordState = (second: number, nextGoalkeeper: number, nextBench: Set<number>) => {
        const nextActive = setActiveFromBench(nextBench);
        const outgoingIndices = Array.from(active).filter((index) => !nextActive.has(index)).sort((a, b) => a - b);
        const incomingIndices = Array.from(nextActive).filter((index) => !active.has(index)).sort((a, b) => a - b);
        if (outgoingIndices.length > 2 || incomingIndices.length > 2) {
            throw new Error("Goalkeeper rotation exceeded the two-player switch limit.");
        }
        const goalkeeperChanged = goalkeeper !== nextGoalkeeper;
        if (outgoingIndices.length > 0 || incomingIndices.length > 0 || goalkeeperChanged) {
            schedule.push({
                minute: second / 60,
                outgoing: outgoingIndices.map((index) => players[index]),
                incoming: incomingIndices.map((index) => players[index]),
                activeIndices: Array.from(nextActive).sort((a, b) => a - b),
                ...(goalkeeperChanged ? { outgoingGoalkeeperIndex: goalkeeper, goalkeeperIndex: nextGoalkeeper } : { goalkeeperIndex: nextGoalkeeper }),
            });
        }
        goalkeeper = nextGoalkeeper;
        bench = new Set(nextBench);
        active = nextActive;
    };

    for (let block = 0; block < keeperOrder.length; block += 1) {
        const currentGoalkeeper = keeperOrder[block];
        const blockStart = block * keeperDutySeconds;
        const blockEnd = (block + 1) * keeperDutySeconds;
        const blockLength = blockEnd - blockStart;
        const keeperGroup = otherKeepers(currentGoalkeeper);
        const eligibleKeepers = keeperGroup.length;
        const keeperGoalFieldTotal = Math.max(0, fairTotalSeconds - keeperDutySeconds);
        const keeperFieldPerBlock = eligibleKeepers > 0 ? keeperGoalFieldTotal / eligibleKeepers : 0;
        const keeperBenchPerBlock = blockLength - keeperFieldPerBlock;
        const keeperSlotsAverage = blockLength > 0 ? (eligibleKeepers * keeperBenchPerBlock) / blockLength : 0;
        const phases = makePhaseSequence(keeperSlotsAverage, blockLength, nextKeeperSlots);

        if (block === 0) {
            const firstKeeperSlots = phases[0]?.keeperSlots ?? 0;
            const firstFieldOnlySlots = benchCount - firstKeeperSlots;
            const firstBench = [
                ...rankByFairSeed(keeperGroup).slice(0, firstKeeperSlots),
                ...rankByFairSeed(fieldOnlyIndices).slice(0, firstFieldOnlySlots),
            ];
            bench = new Set(firstBench);
            active = setActiveFromBench(bench);
            initialActive = Array.from(active).sort((a, b) => a - b);
            goalkeeper = currentGoalkeeper;
        } else {
            const oldGoalkeeper = keeperOrder[block - 1];
            const nextBench = new Set(bench);
            if (nextBench.has(currentGoalkeeper)) {
                nextBench.delete(currentGoalkeeper);
                if (keeperGroup.includes(oldGoalkeeper)) nextBench.add(oldGoalkeeper);
                else {
                    const replacement = rankByFairSeed(keeperGroup).find((index) => !nextBench.has(index));
                    if (replacement !== undefined) nextBench.add(replacement);
                }
            }
            recordState(blockStart, currentGoalkeeper, nextBench);
        }

        let phaseStart = blockStart;
        for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex += 1) {
            const phase = phases[phaseIndex];
            const keeperSlots = phase.keeperSlots;
            const fieldOnlySlots = benchCount - keeperSlots;
            const currentBench = Array.from(bench);
            const keeperSelected = subsetPreserving(keeperGroup, keeperSlots, currentBench);
            const fieldOnlySelected = subsetPreserving(fieldOnlyIndices, fieldOnlySlots, currentBench);
            const phaseBench = new Set([...keeperSelected, ...fieldOnlySelected]);
            recordState(phaseStart, currentGoalkeeper, phaseBench);

            const eventPhaseStart = phaseStart;
            const phaseEvents = new Map<number, { keeperSelection?: number[]; fieldOnlySelection?: number[] }>();
            const collectRotationEvents = (group: number[], slots: number, selected: number[], key: "keeperSelection" | "fieldOnlySelection") => {
                if (slots <= 0 || slots >= group.length) return;
                const reverse = (block + phaseIndex + (key === "keeperSelection" ? 1 : 0) + rotationPatternOffset) % 2 === 1;
                const blockTolerance = Array.isArray(phaseFairnessToleranceSeconds) ? (phaseFairnessToleranceSeconds[block] ?? 0) : phaseFairnessToleranceSeconds;
                const rotationCount = chooseRotationCount(group.length, slots, phase.length, reverse, blockTolerance);
                const starts = rotationStarts(group.length, rotationCount, reverse);
                for (let step = 1; step < rotationCount; step += 1) {
                    const second = eventPhaseStart + (phase.length * step) / rotationCount;
                    const eventKey = Math.round(second * 1000);
                    const event = phaseEvents.get(eventKey) || {};
                    event[key] = lineupForRotation(group, slots, selected, starts[step]);
                    phaseEvents.set(eventKey, event);
                }
            };
            collectRotationEvents(keeperGroup, keeperSlots, keeperSelected, "keeperSelection");
            collectRotationEvents(fieldOnlyIndices, fieldOnlySlots, fieldOnlySelected, "fieldOnlySelection");

            for (const [eventKey, event] of Array.from(phaseEvents.entries()).sort(([a], [b]) => a - b)) {
                let nextBench = new Set(bench);
                const second = eventKey / 1000;
                if (event.keeperSelection) {
                    for (const index of keeperGroup) nextBench.delete(index);
                    for (const index of event.keeperSelection) nextBench.add(index);
                }
                if (event.fieldOnlySelection) {
                    for (const index of fieldOnlyIndices) nextBench.delete(index);
                    for (const index of event.fieldOnlySelection) nextBench.add(index);
                }
                const outgoingCount = Array.from(active).filter((index) => nextBench.has(index)).length;
                if (outgoingCount <= 2) {
                    // Combine role-group rotations when they still fit the two-pair limit.
                    recordState(second, currentGoalkeeper, nextBench);
                } else {
                    if (event.keeperSelection) {
                        const keeperBench = new Set(bench);
                        for (const index of keeperGroup) keeperBench.delete(index);
                        for (const index of event.keeperSelection) keeperBench.add(index);
                        recordState(second, currentGoalkeeper, keeperBench);
                    }
                    if (event.fieldOnlySelection) {
                        const fieldBench = new Set(bench);
                        for (const index of fieldOnlyIndices) fieldBench.delete(index);
                        for (const index of event.fieldOnlySelection) fieldBench.add(index);
                        recordState(second + (event.keeperSelection ? 1 : 0), currentGoalkeeper, fieldBench);
                    }
                }
            }

            phaseStart += phase.length;
            nextKeeperSlots = keeperSlots;
        }
    }

    return { initialActive, initialGoalkeeperIndex: firstGoalkeeper, schedule };
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

function calculateContinuityScore(initialActive: number[], duration: number, schedule: Switch[]): number {
    const playerIndices = Array.from(new Set([...initialActive, ...schedule.flatMap((change) => change.activeIndices)]));
    let score = 0;
    let minimumLongestStint = Number.POSITIVE_INFINITY;
    for (const playerIndex of playerIndices) {
        let stintStart: number | undefined = initialActive.includes(playerIndex) ? 0 : undefined;
        let longestStint = 0;
        for (const change of schedule) {
            const remainsActive = change.activeIndices.includes(playerIndex);
            if (stintStart !== undefined && !remainsActive) {
                const stintLength = Math.max(0, change.minute - stintStart);
                score += stintLength * stintLength;
                longestStint = Math.max(longestStint, stintLength);
                stintStart = undefined;
            } else if (stintStart === undefined && remainsActive) {
                stintStart = change.minute;
            }
        }
        if (stintStart !== undefined) {
            const finalStintLength = Math.max(0, duration - stintStart);
            score += finalStintLength * finalStintLength;
            longestStint = Math.max(longestStint, finalStintLength);
        }
        minimumLongestStint = Math.min(minimumLongestStint, longestStint);
    }
    // First give every child the longest practical uninterrupted block, then
    // prefer plans with more long blocks overall.
    const minimumStintWeight = (playerIndices.length * duration * duration) + 1;
    return (minimumLongestStint * minimumStintWeight) + score;
}

function optimizeContinuityTiming(plan: RotationPlan, playerCount: number, duration: number, maximumPlaytimeRangeSeconds: number): RotationPlan {
    let currentPlan = plan;
    const minimumGapMinutes = 0.5;
    const stepMinutes = 0.25;

    for (let pass = 0; pass < 2; pass += 1) {
        let improved = false;
        for (let eventIndex = 0; eventIndex < currentPlan.schedule.length; eventIndex += 1) {
            const currentEvent = currentPlan.schedule[eventIndex];
            // Goalkeeper duty boundaries are fixed so keeper minutes remain equal.
            if (currentEvent.outgoingGoalkeeperIndex !== undefined) continue;

            const previousTime = eventIndex === 0 ? 0 : currentPlan.schedule[eventIndex - 1].minute;
            const nextTime = eventIndex === currentPlan.schedule.length - 1 ? duration : currentPlan.schedule[eventIndex + 1].minute;
            const earliest = previousTime + minimumGapMinutes;
            const latest = nextTime - minimumGapMinutes;
            if (earliest > latest) continue;

            const candidateTimes = new Set<number>([
                Math.max(earliest, Math.min(latest, currentEvent.minute)),
                earliest,
                latest,
            ]);
            for (let offset = -8; offset <= 8; offset += 1) {
                const candidateTime = currentEvent.minute + (offset * stepMinutes);
                if (candidateTime >= earliest && candidateTime <= latest) candidateTimes.add(candidateTime);
            }

            let bestEventTime = currentEvent.minute;
            let bestScore = calculateContinuityScore(currentPlan.initialActive, duration, currentPlan.schedule);
            let bestSpread = Number.POSITIVE_INFINITY;
            for (const candidateTime of Array.from(candidateTimes)) {
                if (Math.abs(candidateTime - currentEvent.minute) < 1e-7) continue;
                const candidateSchedule = currentPlan.schedule.map((event, index) => index === eventIndex ? { ...event, minute: candidateTime } : event);
                const candidateMinutes = calculatePlaytime(playerCount, currentPlan.initialActive, duration, candidateSchedule);
                const spread = (Math.max(...candidateMinutes) - Math.min(...candidateMinutes)) * 60;
                if (spread > maximumPlaytimeRangeSeconds + 1e-7) continue;
                const score = calculateContinuityScore(currentPlan.initialActive, duration, candidateSchedule);
                if (score > bestScore + 1e-7 || (Math.abs(score - bestScore) <= 1e-7 && spread < bestSpread)) {
                    bestEventTime = candidateTime;
                    bestScore = score;
                    bestSpread = spread;
                }
            }

            if (bestEventTime !== currentEvent.minute) {
                currentPlan = {
                    ...currentPlan,
                    schedule: currentPlan.schedule.map((event, index) => index === eventIndex ? { ...event, minute: bestEventTime } : event),
                };
                improved = true;
            }
        }
        if (!improved) break;
    }

    return currentPlan;
}

function calculateGoalkeeperTime(playerCount: number, initialGoalkeeper: number | undefined, duration: number, schedule: Switch[]): number[] {
    const time = Array.from({ length: playerCount }, () => 0);
    if (initialGoalkeeper === undefined) return time;
    let goalkeeper = initialGoalkeeper;
    let previousMinute = 0;
    for (const change of schedule) {
        time[goalkeeper] += Math.max(0, change.minute - previousMinute);
        if (change.goalkeeperIndex !== undefined) goalkeeper = change.goalkeeperIndex;
        previousMinute = change.minute;
    }
    time[goalkeeper] += Math.max(0, duration - previousMinute);
    return time;
}

function createFairKeeperSchedule(players: string[], keeperIndices: number[], activeCount: number, duration: number, seed: number): RotationPlan {
    if (players.length < activeCount) {
        return createKeeperSchedule(players, keeperIndices, activeCount, duration, seed);
    }

    if (keeperIndices.length === 0) {
        const plan = createSchedule(players, activeCount, duration, seed);
        return optimizeContinuityTiming(plan, players.length, duration, 180);
    }

    const totalSeconds = duration * 60;
    const keeperSet = new Set(keeperIndices);
    const keeperDutySeconds = totalSeconds / keeperIndices.length;
    const fieldSlots = Math.max(0, activeCount - 1);
    let low = 0;
    let high = totalSeconds;
    for (let iteration = 0; iteration < 64; iteration += 1) {
        const target = (low + high) / 2;
        const fieldSeconds = players.reduce((sum, _, index) => sum + Math.max(0, target - (keeperSet.has(index) ? keeperDutySeconds : 0)), 0);
        if (fieldSeconds < fieldSlots * totalSeconds) low = target;
        else high = target;
    }
    const fairTotalSeconds = (low + high) / 2;
    const fairTargets = players.map((_, index) => keeperSet.has(index) ? Math.max(fairTotalSeconds, keeperDutySeconds) : fairTotalSeconds);
    const minimumFairRange = Math.max(...fairTargets) - Math.min(...fairTargets);
    const maximumPlaytimeRange = Math.max(180, minimumFairRange);
    let bestPlan: RotationPlan | undefined;
    let bestContinuity = Number.NEGATIVE_INFINITY;
    let bestDeviation = Number.POSITIVE_INFINITY;
    let bestSpread = Number.POSITIVE_INFINITY;

    const phaseTolerances = [180, 165, 150, 135, 120, 105, 90, 75, 60, 45, 30, 20, 15, 0];
    const toleranceProfiles = phaseTolerances.map((tolerance) => keeperIndices.map(() => tolerance));
    if (keeperIndices.length <= 4 && duration <= 30) {
        const blockTolerances = [0, 20, 45, 90, 180];
        let mixedProfiles: number[][] = [[]];
        for (let block = 0; block < keeperIndices.length; block += 1) {
            mixedProfiles = mixedProfiles.flatMap((profile) => blockTolerances.map((tolerance) => [...profile, tolerance]));
        }
        toleranceProfiles.push(...mixedProfiles);
    }
    for (const rotationPatternOffset of [0, 1]) {
        for (const phaseTolerance of toleranceProfiles) {
            let candidate: RotationPlan;
            try {
                candidate = createKeeperSchedule(players, keeperIndices, activeCount, duration, seed, phaseTolerance, rotationPatternOffset);
            } catch {
                continue;
            }
            candidate = optimizeContinuityTiming(candidate, players.length, duration, maximumPlaytimeRange);
            const minutes = calculatePlaytime(players.length, candidate.initialActive, duration, candidate.schedule);
            const deviation = Math.max(...minutes.map((playtime, index) => {
                const target = keeperSet.has(index) ? Math.max(fairTotalSeconds, keeperDutySeconds) : fairTotalSeconds;
                return Math.abs(playtime * 60 - target);
            }));
            const spread = (Math.max(...minutes) - Math.min(...minutes)) * 60;
            const continuity = calculateContinuityScore(candidate.initialActive, duration, candidate.schedule);
            const fewerStops = bestPlan === undefined || candidate.schedule.length < bestPlan.schedule.length;
            const sameStops = bestPlan !== undefined && candidate.schedule.length === bestPlan.schedule.length;
            const betterContinuity = continuity > bestContinuity + 1e-7;
            const sameContinuity = Math.abs(continuity - bestContinuity) <= 1e-7;
            const betterFairness = deviation < bestDeviation || (deviation === bestDeviation && spread < bestSpread);
            if (spread <= maximumPlaytimeRange && (fewerStops || (sameStops && (betterContinuity || (sameContinuity && betterFairness))))) {
                bestPlan = candidate;
                bestContinuity = continuity;
                bestDeviation = deviation;
                bestSpread = spread;
            }
        }
    }

    return bestPlan || createKeeperSchedule(players, keeperIndices, activeCount, duration, seed);
}

export default function Wechseln() {
    const [players, setPlayers] = useState<string[]>(readNames);
    const [goalkeeperKeys, setGoalkeeperKeys] = useState<string[]>(readGoalkeeperNames);
    const [format, setFormat] = useState<Format>("4+1");
    const [duration, setDuration] = useState(readDuration);
    const [durationInput, setDurationInput] = useState(() =>
        String(readDuration())
    );
    const [rotationSeed, setRotationSeed] = useState(readRotationSeed);
    const activeCount = format === "4+1" ? 5 : 7;

    useEffect(() => {
        const refreshPlayers = () => {
            const latestPlayers = readNames();
            const validKeys = new Set(createPlayerKeys(latestPlayers));
            setPlayers(latestPlayers);
            setGoalkeeperKeys((current) => {
                const next = current.filter((key) => validKeys.has(key));
                if (next.length !== current.length) {
                    try {
                        localStorage.setItem(GOALKEEPER_NAMES_KEY, JSON.stringify(next));
                    } catch {
                        // The current selection remains usable for this page session.
                    }
                }
                return next;
            });
        };
        const handleStorage = (event: StorageEvent) => {
            if (event.key === GOALKEEPER_NAMES_KEY || event.key === null) setGoalkeeperKeys(readGoalkeeperNames());
            if (event.key === PLAYER_NAMES_KEY || event.key === null) refreshPlayers();
        };
        window.addEventListener("storage", handleStorage);
        window.addEventListener("playerNamesUpdated", refreshPlayers);
        refreshPlayers();
        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("playerNamesUpdated", refreshPlayers);
        };
    }, []);

    const playerKeys = useMemo(() => createPlayerKeys(players), [players]);
    const selectedKeeperIndices = useMemo(() => playerKeys.flatMap((key, index) => goalkeeperKeys.includes(key) ? [index] : []), [playerKeys, goalkeeperKeys]);
    const selectedKeeperSet = useMemo(() => new Set(selectedKeeperIndices), [selectedKeeperIndices]);
    const plan = useMemo(() => createFairKeeperSchedule(players, selectedKeeperIndices, activeCount, duration, rotationSeed), [players, selectedKeeperIndices, activeCount, duration, rotationSeed]);
    const schedule = plan.schedule;
    const playtime = useMemo(() => calculatePlaytime(players.length, plan.initialActive, duration, schedule), [players.length, plan.initialActive, duration, schedule]);
    const goalkeeperTime = useMemo(() => calculateGoalkeeperTime(players.length, plan.initialGoalkeeperIndex, duration, schedule), [players.length, plan.initialGoalkeeperIndex, duration, schedule]);
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

    const toggleGoalkeeper = (playerKey: string) => {
        setGoalkeeperKeys((current) => {
            const next = current.includes(playerKey) ? current.filter((key) => key !== playerKey) : [...current, playerKey];
            try {
                localStorage.setItem(GOALKEEPER_NAMES_KEY, JSON.stringify(next));
            } catch {
                // Keep the new selection for this page session if storage is unavailable.
            }
            return next;
        });
    };

    return (
        <div className="content-page switch-page">
            <div className="page-heading">
                <div><h1>Wechseln</h1><p>Ein klarer Wechselplan, damit alle möglichst gleich viel spielen.</p></div>
            </div>

            <section className="goalkeeper-picker" aria-labelledby="goalkeeper-picker-title">
                <div className="goalkeeper-picker-copy">
                    <span className="section-kicker">TORWART-ROTATION</span>
                    <h2 id="goalkeeper-picker-title">Wer übernimmt das Tor?</h2>
                    <p>Wähle alle Spieler aus, die im Tor spielen können. Ohne Auswahl bleibt der bisherige Plan aktiv.</p>
                </div>
                {players.length > 0 ? (
                    <div className="goalkeeper-player-list">
                        {players.map((player, index) => {
                            const key = playerKeys[index];
                            const selected = goalkeeperKeys.includes(key);
                            return <button className={`goalkeeper-player${selected ? " selected" : ""}`} type="button" key={key} aria-pressed={selected} onClick={() => toggleGoalkeeper(key)}>
                                <span className="player-avatar">{player.trim().charAt(0).toUpperCase()}</span>
                                <span>{player}</span>
                                <span className="goalkeeper-mark">{selected ? "TORWART" : "＋"}</span>
                            </button>;
                        })}
                    </div>
                ) : <p className="goalkeeper-empty">Füge zuerst Spieler im Kader hinzu.</p>}
            </section>

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
                    <div className="setting-input"><input
                        aria-label="Spieldauer in Minuten"
                        type="number"
                        min="1"
                        max="240"
                        value={durationInput}
                        onChange={(event) => {
                            const input = event.target.value;

                            setDurationInput(input);

                            const value = Number(input);

                            if (!isNaN(value) && value >= 1 && value <= 240) {
                                setDuration(value);
                            }
                        }}
                        onBlur={() => {
                            if (!durationInput || Number(durationInput) < 1) {
                                setDurationInput(String(durationInput));
                            }
                        }}
                    /><span>Minuten</span></div>
                    <div className="active-count"><span>Gleichzeitig aktiv</span><strong>{activeCount}</strong></div>
                    <button className="button shuffle-button" type="button" onClick={rerollStartingLineup}><span aria-hidden="true">⤨</span> Startaufstellung neu auswürfeln</button>
                    <p className="planner-note">Der Plan bevorzugt wenige Wechsel und lange Spielphasen. Die längste und kürzeste Einsatzzeit unterscheiden sich höchstens um 3 Minuten, soweit es die Torwartpflicht erlaubt. Pro Stopp können bis zu zwei Spielerpaare wechseln; die Torwartminuten bleiben gleichmäßig verteilt.</p>
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
                        <div className="schedule-start"><span className="schedule-start-time">00:00</span><span><strong>Startaufstellung</strong><small>{plan.initialActive.map((index) => players[index]).join(" · ")}</small>{plan.initialGoalkeeperIndex !== undefined && <small className="schedule-goalkeeper-label">Torwart: {players[plan.initialGoalkeeperIndex]}</small>}</span></div>
                        <ol className="schedule-list">{schedule.map((change, index) => (
                            <li className="schedule-item" key={`${change.minute}-${index}`}>
                                <span className="schedule-time">{formatTime(change.minute)}<small>MIN</small></span>
                                <span className="schedule-connector" />
                                <div className="schedule-details">
                                    {(change.outgoing.length > 0 || change.incoming.length > 0) && <div className="schedule-change"><span className="schedule-action"><span className="out-arrow">↓</span> RAUS</span><div className="schedule-names">{change.outgoing.map((name, nameIndex) => <span className="out-name" key={`${name}-${nameIndex}`}>{name}</span>)}</div><span className="schedule-action"><span className="in-arrow">↑</span> REIN</span><div className="schedule-names">{change.incoming.map((name, nameIndex) => <span className="in-name" key={`${name}-${nameIndex}`}>{name}</span>)}</div></div>}
                                    {change.outgoingGoalkeeperIndex !== undefined && change.goalkeeperIndex !== undefined && <div className="schedule-goalkeeper-change"><span>TORWART</span>{players[change.outgoingGoalkeeperIndex]} <span aria-hidden="true">→</span> {players[change.goalkeeperIndex]}</div>}
                                </div>
                                <span className="change-count">{change.outgoingGoalkeeperIndex !== undefined ? `TOR${change.outgoing.length > 0 ? ` · ${change.incoming.length}↔${change.outgoing.length}` : ""}` : `${change.incoming.length}↔${change.outgoing.length}`}</span>
                            </li>
                        ))}</ol>
                        </>
                    )}
                    <div className="schedule-footnote">{selectedKeeperIndices.length > 0 ? "Die Torwartzeit wird gleich verteilt. Die längste und kürzeste Gesamtspielzeit unterscheiden sich höchstens um 3 Minuten, soweit es die Torwartpflicht erlaubt." : "Die Rotation ist so berechnet, dass alle am Ende möglichst gleich viele Minuten spielen. Zeiten können dadurch auch innerhalb einer Minute liegen."}</div>
                    {hasEnoughPlayers && <section className="playtime-summary" aria-label="Geplante Einsatzzeit je Spieler">
                        <div className="playtime-heading"><div><span className="section-kicker">FAIRE VERTEILUNG</span><h3>Geplante Einsatzzeit</h3></div><span>von {duration} Min.</span></div>
                        <ul>{players.map((player, index) => <li key={playerKeys[index]}><span className="playtime-player"><span className="player-avatar">{player.trim().charAt(0).toUpperCase()}</span><span className="playtime-player-details"><strong>{player}</strong>{selectedKeeperSet.has(index) && <small>Torwartzeit {formatTime(goalkeeperTime[index])}</small>}</span></span><span className="playtime-bar"><span style={{ width: `${Math.min(100, (playtime[index] / duration) * 100)}%` }} /></span><strong>{formatTime(playtime[index])} <small>Min.</small></strong></li>)}</ul>
                    </section>}
                </section>
            </div>
        </div>
    );
}
