import {lazy} from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navigation from './components/navigation/Navigation';
import './styles/index.css';
import './styles/App.css';

const Home = lazy(() => import('./pages/Home'));
const TodoPage = lazy(() => import('./pages/TodoPage'));
const SelectPage = lazy(() => import('./pages/Select'));
const TablePage = lazy(() => import('./pages/Table'));
const CalculatorPage = lazy(() => import('./pages/Calculator'));

export default function App() {
    return (
        <BrowserRouter>
            <Navigation />

            <div className='page-wrapper'>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/todo" element={<TodoPage />} />
                    <Route path="/select" element={<SelectPage />} />
                    <Route path="/table" element={<TablePage />} />
                    <Route path="/calculator" element={<CalculatorPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
