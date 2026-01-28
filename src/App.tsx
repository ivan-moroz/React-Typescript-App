import {lazy} from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navigation from './components/navigation/Navigation';
import './styles/index.css';
import './styles/App.css';

const Home = lazy(() => import('./pages/Home'));
const TodoPage = lazy(() => import('./pages/TodoPage'));
const SelectPage = lazy(() => import('./pages/Select'));

export default function App() {
    return (
        <BrowserRouter>
            <Navigation />

            <div className='page-wrapper'>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/todo" element={<TodoPage />} />
                    <Route path="/select" element={<SelectPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
