import Sidebar from './Sidebar';
import Topbar from './Topbar';

type Props = {
    children: React.ReactNode;
};

export default function MainLayout ({children}: Props) {
    return (
        <div className="app-layout">
            <Topbar />
            <Sidebar />
            <div className="main-content">
                <main>{children}</main>
            </div>
        </div>
    )
}