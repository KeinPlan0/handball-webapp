import React, { useState, useEffect} from "react";


export default function NameList() {
    const [name, setName] = useState("");
    const [names, setNames] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem("playerNames");
            const parsed: unknown = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
        } catch {
            return [];
        }
    });

    const addName = () => {
        const trimmed = name.trim();
        if (trimmed === "") return;
        setNames(prev => [...prev, trimmed]);
        setName("");
    };

    const clearList = () => {
        // Clear the saved names array and reset the input
        setNames([]);
    }


    useEffect(() => {
        localStorage.setItem("playerNames", JSON.stringify(names));
    }, [names]);

    return (
        <section className="roster-card">
            <div className="roster-card-heading"><div><span className="section-kicker">KADERÜBERSICHT</span><h2>Dein Team</h2></div><span className="roster-count">{String(names.length).padStart(2, "0")} <small>SPIELER</small></span></div>
            <form className="add-player-form" onSubmit={(event) => { event.preventDefault(); addName(); }}>
                <label htmlFor="player-name">Spielername</label>
                <div className="input-row"><input id="player-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Alex Müller" maxLength={40} /><button className="button button-primary" type="submit" disabled={!name.trim()}>Hinzufügen <span aria-hidden="true">＋</span></button></div>
            </form>
            {names.length ? <>
                <ul className="roster-list">{names.map((player, index) => <li className="roster-player" key={`${player}-${index}`}><span className="player-avatar">{player.trim().charAt(0).toUpperCase()}</span><span className="roster-player-name">{player}</span><span className="player-position">FELDSPIELER</span><span className="player-number">{String(index + 1).padStart(2, "0")}</span></li>)}</ul>
                <button className="text-button clear-button" type="button" onClick={clearList}>Kader leeren</button>
            </> : <div className="roster-empty"><span>01</span><p>Noch keine Spieler im Kader. Füge oben den ersten Namen hinzu.</p></div>}
        </section>
    )
}
