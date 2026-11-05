import Topbar from './Topbar';

type Props = {
    children: React.ReactNode;
};

export default function MainLayout ({children}: Props) {
    return (
        <div className="app-layout">
            <Topbar />
            <main>{children}</main>
            <footer className="site-footer">
                <p>This independent project is not affiliated with or endorsed by SG Arheilgen (SGA). SGA is not responsible for its use or results.</p>
            </footer>
        </div>
    )
}
