import {Link, useMatch, useResolvedPath} from "react-router-dom"
export default function Topbar() {
    return (
       <nav className="topbar">
           <Link to="/" className="site-title">SiteName</Link>
           <ul>
               <CustomLink to="/spieler">Spieler</CustomLink>
               <CustomLink to="/spiel">Spiel</CustomLink>
               <CustomLink to="/about">About</CustomLink>
           </ul>
       </nav>
    )
}

type CustomLinkProps = {
    to: string;
    children: React.ReactNode;
};

function CustomLink({ to, children }: CustomLinkProps) {
    const resolvedPath = useResolvedPath(to);
    const isActive = useMatch({ path: resolvedPath.pathname, end: true});
    return (
        <li className={isActive ? "active" : ""}>
            <Link to={to}>{children}</Link>
        </li>
    );
}