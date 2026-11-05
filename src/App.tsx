import MainLayout from './layout/MainLayout';
import Spieler from './pages/Spieler';
import Home from './pages/Home';
import Spiel from './pages/Spiel';
import Wechseln from './pages/Wechseln';
import { Route, Routes } from "react-router-dom";
function App() {
    return (
        <MainLayout>
            <div className="container">
                <Routes>
                    <Route path="/" Component={Home} />
                    <Route path="/spieler" Component={Spieler} />
                    <Route path="/spiel" Component={Spiel} />
                    <Route path="/wechseln" Component={Wechseln} />
                </Routes>
            </div>
        </MainLayout>
    );
}


export default App;
