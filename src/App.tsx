import MainLayout from './layout/MainLayout';
import About from './pages/About';
import Spieler from './pages/Spieler';
import Home from './pages/Home';
import Spiel from './pages/Spiel';
import { Route, Routes } from "react-router-dom";
function App() {
    return (
        <>
            <MainLayout>
                <div className="container">
                    <Routes>
                        <Route path="/" Component={Home} />
                        <Route path="/about" Component={About} />
                        <Route path="/spieler" Component={Spieler} />
                        <Route path="/spiel" Component={Spiel} />
                    </Routes>
                </div>
            </MainLayout>

        </>
    );
}


export default App;
