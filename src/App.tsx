import {lazy} from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navigation from './components/navigation/Navigation';
import RouteBoundary from './components/routing/RouteBoundary';
import NotFoundPage from './pages/NotFound';
import {ModalProvider} from './components/modal/ModalProvider';
import './styles/App.scss';

const Home = lazy(() => import('./pages/Home'));
const TodoPage = lazy(() => import('./pages/TodoPage'));
const SelectPage = lazy(() => import('./pages/Select'));
const CalculatorPage = lazy(() => import('./pages/Calculator'));
const LoginPage = lazy(() => import('./pages/Login'));
const PuzzlePage = lazy(() => import('./pages/Puzzle'));

export default function App() {
    return (
        <BrowserRouter>
            <ModalProvider>
                <Navigation />

                <div className='page-wrapper'>
                    <RouteBoundary>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/todo" element={<TodoPage />} />
                            <Route path="/select" element={<SelectPage />} />
                            <Route path="/calculator" element={<CalculatorPage />} />
                            <Route path="/puzzle" element={<PuzzlePage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </RouteBoundary>
                </div>
            </ModalProvider>
        </BrowserRouter>
    );
}
