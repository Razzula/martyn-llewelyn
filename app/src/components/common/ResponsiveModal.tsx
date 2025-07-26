import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import './ResponsiveModal.css';

type Props = {
    open: boolean;
    title?: string;
    children: React.ReactNode;
    onClose: () => void;
};

export function ResponsiveModal({ open, title, children, onClose }: Props) {
    const [isMobile, setIsMobile] = useState(false);

    // detect screen width on mount + resize
    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth <= 600);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    if (!open) return null;

    return ReactDOM.createPortal(
        <div className='modalOverlay' onClick={onClose}>
            <div
                className={isMobile ? 'bottomSheet' : 'centreModal'}
                onClick={(e) => e.stopPropagation()}
            >
                {title && <h2>{title}</h2>}
                {children}
            </div>
        </div>,
        document.body
    );
}
