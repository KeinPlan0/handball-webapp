import NameList from "../Components/NameList";

export default  function Spieler() {
    return (
        <div className="content-page">
            <div className="page-heading">
                <div><span className="section-kicker">DEIN KADER</span><h1>Spieler</h1><p>Stell dein Team für die nächste Partie zusammen.</p></div>
                <span className="heading-badge">TEAM<br />MANAGEMENT</span>
            </div>
            <NameList />
        </div>
)
}
