import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/index.css'
import AppGate from './AppGate.tsx';
import { isMobile } from './utils/utils.ts';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <div className='appScroll'>
            {isMobile() &&
                <div className='androidBanner' />
            }
            <AppGate />
        </div>
    </StrictMode>
);
