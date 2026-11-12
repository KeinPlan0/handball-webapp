import {Link, useMatch, useResolvedPath} from "react-router-dom";
import { useState } from "react";

type TopbarProps = {
    darkMode: boolean;
    onDarkModeChange: (enabled: boolean) => void;
};

export default function Topbar({darkMode, onDarkModeChange}: TopbarProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <header className="topbar">
            <Link to="/" className="site-title" aria-label="Spielzeit home">
                <img className="brand-mark" src={`${process.env.PUBLIC_URL}/sga-logo.png`} alt="SG Arheilgen Handball" />
                <span>spielzeit<span className="brand-period">.</span></span>
            </Link>
            <div className="topbar-actions">
                <nav aria-label="Main navigation">
                    <ul>
                        <CustomLink to="/">Übersicht</CustomLink>
                        <CustomLink to="/spieler">Spieler</CustomLink>
                        <CustomLink to="/spiel">Spielzeit</CustomLink>
                        <CustomLink to="/wechseln">Wechseln</CustomLink>
                    </ul>
                </nav>
                <div className="settings-menu">
                    <button className="settings-tab" type="button" aria-expanded={settingsOpen} aria-controls="settings-panel" onClick={() => setSettingsOpen(open => !open)}>
                        Einstellungen <span aria-hidden="true">{settingsOpen ? '⌃' : '⚙'}</span>
                    </button>
                    {settingsOpen && (
                        <div className="settings-panel" id="settings-panel">
                            <span className="settings-panel-title">Darstellung</span>
                            <button className="theme-toggle" type="button" role="switch" aria-checked={darkMode} onClick={() => onDarkModeChange(!darkMode)}>
                                <span>{darkMode ? 'Dark-Mode' : 'Light-Mode'}</span>
                                <span className={`theme-switch ${darkMode ? 'on' : ''}`} aria-hidden="true"><span /></span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

type CustomLinkProps = {
    to: string;
    children: React.ReactNode;
};

function CustomLink({ to, children }: CustomLinkProps) {
    const resolvedPath = useResolvedPath(to);
    const isActive = useMatch({ path: resolvedPath.pathname, end: true});
    return (
        <li>
            <Link to={to} className={isActive ? "active" : ""} aria-current={isActive ? "page" : undefined}>
                {children}
            </Link>
        </li>
    );
}
