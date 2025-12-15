
import React, { useState, useEffect } from 'react';
import { authService } from '../services/AuthService';

const SessionTimer = ({ timeLeft }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Just keep current time ticking
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTimeLeft = (ms) => {
        if (ms === null) return "--:--";
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (timeLeft === null) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            textAlign: 'right',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.9rem',
            background: 'rgba(0,0,0,0.2)',
            padding: '8px 15px',
            borderRadius: '20px',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>
                Logout in: <span style={{ color: timeLeft < 60000 ? '#ff6b6b' : '#4dabf5', fontWeight: 'bold' }}>
                    {formatTimeLeft(timeLeft)}
                </span>
            </div>
        </div>
    );
};

export default SessionTimer;
