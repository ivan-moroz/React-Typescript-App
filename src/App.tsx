import {lazy} from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import RouteBoundary from './components/routing/RouteBoundary';
import './components/routing/RouteLoading.scss';
import NotFoundPage from './pages/NotFound';
import LoginRoute from './pages/LoginRoute';
import {ModalProvider} from './components/modal/ModalProvider';
import './styles/App.scss';
import '../backend/features/navigation/styles/styles.scss';
import '../backend/features/messaging/styles/styles.scss';
import MessagingPanelHost from '../backend/features/messaging/MessagingPanelHost';

const Home = lazy(() => import('./pages/Home'));
const TodoPage = lazy(() => import('./pages/TodoPage'));
const CalculatorPage = lazy(() => import('./pages/Calculator'));
const PuzzlePage = lazy(() => import('./pages/Puzzle'));

export default function App() {
    return (
        <BrowserRouter>
            <ModalProvider>
                <MessagingPanelHost />
                <div className='page-wrapper'>
                    <RouteBoundary>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/todo" element={<TodoPage />} />
                            <Route path="/calculator" element={<CalculatorPage />} />
                            <Route path="/puzzle" element={<PuzzlePage />} />
                            <Route path="/login" element={<LoginRoute />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </RouteBoundary>
                </div>
            </ModalProvider>
        </BrowserRouter>
    );
}
