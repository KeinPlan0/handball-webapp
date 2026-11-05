import  React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PlayerTimer from "../Components/PlayerTimer";

export default function Spiel() {
    const [playerNames, setPlayerNames] = useState<string[]>([]);

    useEffect(() => {
        const raw = localStorage.getItem("playerNames");
        try {
            setPlayerNames(raw ? JSON.parse(raw) : []);
        } catch {
            setPlayerNames([]);
        }
    }, []);

    return (
        <div className="content-page match-page">
            <div className="page-heading">
                <div><span className="section-kicker"><span className="status-dot" /> LIVE AM SPIELFELD</span><h1>Spielzeit</h1><p>Tippe auf eine Karte, um die Einsatzzeit zu starten oder anzuhalten.</p></div>
                <span className="match-length">60<span>′</span><small>SPIELMINUTEN</small></span>
            </div>
            {playerNames.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">＋</span><h2>Dein Team wartet noch</h2><p>Füge zuerst Spieler hinzu, dann kannst du ihre Einsatzzeiten tracken.</p><Link className="button button-primary" to="/spieler">Spieler hinzufügen <span aria-hidden="true">→</span></Link></div>
            ) : (
                <div className="timer-grid">{playerNames.map((_, index) => (
                    <PlayerTimer key={index} index={index} />
                ))}</div>
            )}
        </div>
    );
}

