import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom';

import AppGate from './AppGate.tsx';
import IncentivesPage from './components/side/IncentivesPage.tsx';
import { isMobile } from './utils/utils.ts';

import './styles/index.css'
import { users } from './data/TrueLayerMock.ts';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <div className='appScroll'>
            <HashRouter>
                <Routes>
                    <Route path='/*' element={
                        <>
                            {isMobile() &&
                                <div className='androidBanner' />
                            }
                            <AppGate />
                        </>
                    } />
                    <Route path='/incentives' element={
                        <IncentivesPage
                            users={users}
                        />
                    } />
                </Routes>
            </HashRouter>
        </div>
    </StrictMode>
);
