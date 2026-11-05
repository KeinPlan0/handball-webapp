import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="home-page">
            <section className="hero-panel">
                <div className="hero-copy">
                    <span className="eyebrow"><span className="status-dot" /> DEIN TEAM. DEINE ZEIT.</span>
                    <h1>Jede Minute<br /><span>zählt.</span></h1>
                    <p>Behalte die Einsatzzeiten deines Teams im Blick. Einfach starten, fair wechseln und ganz im Spiel bleiben.</p>
                    <div className="hero-actions">
                        <Link className="button button-primary" to="/spiel">Spiel starten <span aria-hidden="true">↗</span></Link>
                        <Link className="button button-quiet" to="/spieler">Team verwalten <span aria-hidden="true">→</span></Link>
                    </div>
                </div>
                <div className="court-art" aria-hidden="true">
                    <div className="court-circle" />
                    <div className="court-arc court-arc-top" />
                    <div className="court-arc court-arc-bottom" />
                    <div className="court-line court-line-one" />
                    <div className="court-line court-line-two" />
                    <span className="court-number">60<span>′</span></span>
                    <span className="court-caption">VOLLE SPIELZEIT</span>
                </div>
                <span className="hero-index">01 / MATCHDAY</span>
            </section>
            <section className="home-bottom">
                <div>
                    <span className="section-kicker">ALLES IM ÜBERBLICK</span>
                    <h2>Bereit, wenn ihr es seid.</h2>
                </div>
                <div className="feature-grid">
                    <Link to="/spieler" className="feature-card"><span className="feature-icon">01</span><span><strong>Team aufstellen</strong><small>Spieler hinzufügen und vorbereiten</small></span><span className="feature-arrow">↗</span></Link>
                    <Link to="/spiel" className="feature-card"><span className="feature-icon feature-icon-accent">02</span><span><strong>Einsatzzeiten tracken</strong><small>Timer pro Spieler, direkt am Spielfeld</small></span><span className="feature-arrow">↗</span></Link>
                </div>
            </section>
        </div>
    );
}
