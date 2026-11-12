import {Link, useMatch, useResolvedPath} from "react-router-dom";

export default function Topbar() {
    return (
        <header className="topbar">
            <Link to="/" className="site-title" aria-label="Spielzeit home">
                <img className="brand-mark" src={`${process.env.PUBLIC_URL}/sga-logo.png`} alt="SG Arheilgen Handball" />
                <span>spielzeit<span className="brand-period">.</span></span>
            </Link>
            <nav aria-label="Main navigation">
                <ul>
                    <CustomLink to="/">Übersicht</CustomLink>
                    <CustomLink to="/spieler">Spieler</CustomLink>
                    <CustomLink to="/spiel">Spielzeit</CustomLink>
                    <CustomLink to="/wechseln">Wechseln</CustomLink>
                </ul>
            </nav>
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
