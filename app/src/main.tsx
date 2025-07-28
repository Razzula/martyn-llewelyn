import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/index.css'
import AppGate from './AppGate.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppGate />
    </StrictMode>
);
