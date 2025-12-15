import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Hook to trigger an action after a specified period of inactivity and track remaining time.
 * @param {Function} onInactive - Function to call when inactive.
 * @param {boolean} isActive - Whether the timer should be running.
 * @param {number} timeoutMs - Timeout in milliseconds (default 10 minutes = 600000).
 * @returns {number} remainingTime - Remaining time in milliseconds.
 */
export const useInactivityTimer = (onInactive, isActive = true, timeoutMs = 600000) => {
    const lastActivityRef = useRef(Date.now());
    const [remainingTime, setRemainingTime] = useState(timeoutMs);
    const timerRef = useRef(null);

    const checkInactivity = useCallback(() => {
        if (!isActive) return;

        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityRef.current;
        const timeLeft = timeoutMs - timeSinceLastActivity;

        if (timeLeft <= 0) {
            console.log("Inactivity detected. Logging out...");
            setRemainingTime(0);
            onInactive();
        } else {
            setRemainingTime(timeLeft);
            // Schedule next check/tick
            timerRef.current = setTimeout(checkInactivity, 1000); // Check every second for UI update
        }
    }, [isActive, onInactive, timeoutMs]);

    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        // Don't force re-render here to avoid performance issues on every mouse move
        // The Interval/Timeout loop will catch the updated time ref naturally
    }, []);

    useEffect(() => {
        if (!isActive) {
            setRemainingTime(timeoutMs);
            return;
        }

        // Initial Start
        lastActivityRef.current = Date.now();
        checkInactivity();

        // Events
        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

        const handleEvent = () => {
            resetActivity();
        };

        events.forEach(event => {
            window.addEventListener(event, handleEvent, { passive: true });
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleEvent);
            });
        };
    }, [isActive, checkInactivity, resetActivity, timeoutMs]);

    return remainingTime;
};
