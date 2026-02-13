import  React, { useState, useEffect } from "react";
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
        <div>
            <h2>Spiel</h2>
            {playerNames.length === 0 ? (
                <p>No players found</p>
            ) : (
                playerNames.map((_, index) => (
                    <PlayerTimer key={index} index={index} />
                ))
            )}
        </div>
    );
}

