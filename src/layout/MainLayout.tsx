import { useEffect, useState } from 'react';
import Topbar from './Topbar';

type Props = {
    children: React.ReactNode;
};

export default function MainLayout ({children}: Props) {
    const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('spielzeit-dark-mode') === 'true');

    useEffect(() => {
        document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
        window.localStorage.setItem('spielzeit-dark-mode', String(darkMode));
    }, [darkMode]);

    return (
        <div className="app-layout">
            <Topbar darkMode={darkMode} onDarkModeChange={setDarkMode} />
            <main>{children}</main>
            <footer className="site-footer">
                <p>This independent project is not affiliated with or endorsed by SG Arheilgen (SGA). SGA is not responsible for its use or results.</p>
            </footer>
        </div>
    )
}
