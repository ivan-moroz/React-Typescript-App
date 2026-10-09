import {lazy} from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navigation from './components/navigation/Navigation';
import RouteBoundary from './components/routing/RouteBoundary';
import {ModalProvider} from './components/modal/ModalProvider';
import './styles/App.scss';

const Home = lazy(() => import('./pages/Home'));
const TodoPage = lazy(() => import('./pages/TodoPage'));
const SelectPage = lazy(() => import('./pages/Select'));
const UsersPage = lazy(() => import('./pages/Users'));
const CalculatorPage = lazy(() => import('./pages/Calculator'));
const LoginPage = lazy(() => import('./pages/Login'));
const AssetsPage = lazy(() => import('./pages/Assets'));

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
                            <Route path="/table" element={<UsersPage />} />
                            <Route path="/calculator" element={<CalculatorPage />} />
                            <Route path="/assets" element={<AssetsPage />} />
                            <Route path="/login" element={<LoginPage />} />
                        </Routes>
                    </RouteBoundary>
                </div>
            </ModalProvider>
        </BrowserRouter>
    );
}
