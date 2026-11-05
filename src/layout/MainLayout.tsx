import Topbar from './Topbar';

type Props = {
    children: React.ReactNode;
};

export default function MainLayout ({children}: Props) {
    return (
        <div className="app-layout">
            <Topbar />
            <main>{children}</main>
        </div>
    )
}
