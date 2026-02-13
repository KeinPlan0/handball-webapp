import React, { useState, useEffect} from "react";


export default function NameList() {
    const [name, setName] = useState("");
    const [names, setNames] = useState<string[]>(() => {
        const stored = localStorage.getItem("playerNames");
        return stored ? JSON.parse(stored) : [];
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            addName();
        }
    };

    return (
        <div style={{padding: "1rem", maxWidth: "400px"}}>
            <h2>Add Names</h2>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a name"
                style={{padding: "0.5rem", width: "70%", marginRight: "0.5rem"}}
            />
            <button onClick={addName} style={{ padding: "0.5rem 1rem" }}>
                Add
            </button>
            <button onClick={clearList} style={{ padding: "0.5rem 1rem" }}>
                Clear List
            </button>

            <ul style={{ marginTop: "1rem" }}>
                {names.map((n, index) => (
                    <li key={index}>{n}</li>
                ))}
            </ul>

        </div>
    )
}