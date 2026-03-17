import { useRef, useState } from 'react';

import './WiggleWrapper.css';

interface WiggleWrapperProps {
    children: React.ReactNode;
    idleMs?: number; // how long after stopping to stop the wiggle
    balloonMs?: number; // how much wiggling is required to trigger a balloon
    balloonElement?: React.ReactNode; // what to show as the balloon
}

interface Balloon {
    id: number;
    element: React.ReactNode;
}

export function WiggleWrapper({
    children,
    idleMs = 200,
    balloonMs = Infinity,
    balloonElement = null,
}: WiggleWrapperProps) {

    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const stopTimer = useRef<number | null>(null);

    const rafID = useRef<number | null>(null);
    const sessionStart = useRef<number | null>(null);
    const sessionMs = useRef<number>(0);

    const balloonID = useRef<number>(0);
    const [balloons, setBalloons] = useState<Balloon[]>([]);

    const start = () => {
        const el = contentRef.current;
        if (!el) return;
        el.classList.add('wiggleActive'); // wiggle

        if (sessionStart.current === null) {
            sessionStart.current = performance.now();
            const tick = () => {
                sessionMs.current = performance.now() - sessionStart.current!;
                if (sessionMs.current > balloonMs) {
                    // spawn a balloon
                    spawnBalloon();
                    sessionStart.current = performance.now(); // reset so it doesn't spam
                }
                rafID.current = requestAnimationFrame(tick);
            };
            rafID.current = requestAnimationFrame(tick);
        }
    };

    const stop = () => {
        const el = contentRef.current;
        if (!el) return;
        el.classList.remove('wiggleActive');

        if (rafID.current !== null) {
            // end the animation frame loop, if exists
            cancelAnimationFrame(rafID.current);
            rafID.current = null;
        }

        // reset session
        if (sessionStart.current !== null) {
            // console.debug(`Wiggled for ${sessionMs.current.toFixed(0)}ms`);
            sessionStart.current = null;
            sessionMs.current = 0;
        }
    };

    const spawnBalloon = () => {
        const id = balloonID.current++;
        const balloon = { id, element: balloonElement };
        setBalloons((prev) => [...prev, balloon]);

        setTimeout(() => {
            setBalloons((prev) => prev.filter((b) => b.id !== id));
        }, 1500);
    };

    const onMouseMove = () => {
        start();

        if (stopTimer.current) {
            window.clearTimeout(stopTimer.current);
        }
        stopTimer.current = window.setTimeout(() => {
            stop(); // stop after no movement
        }, idleMs);
    };

    return (
        <div
            ref={wrapperRef}
            className='wiggleWrapper'
            onMouseMove={onMouseMove}
        >
            <div ref={contentRef} className='wiggleContent'>
                {children}
            </div>
            <div className='wiggleOverlay'>
                {balloons.map((balloon) => (
                    <div key={balloon.id} className='floatingBalloon'>
                        {balloon.element}
                    </div>
                ))}
            </div>
        </div>
    );
}
