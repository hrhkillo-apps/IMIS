import React, { useState } from 'react';
import { authService } from '../services/AuthService';

const AdminLogin = ({ onLogin }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(false);

        if (!input.trim()) {
            setError(true);
            return;
        }

        setLoading(true);

        try {
            // Remove all spaces
            const cleanInput = input.replace(/\s/g, '');
            const isValid = await authService.verifyCode(cleanInput);

            if (isValid) {
                setSuccess(true);
                setTimeout(() => {
                    onLogin();
                }, 800);
            } else {
                setError(true);
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('Verification Error');
            setLoading(false);
        }
    };

    return (
        <div className="login-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0f0f0f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(10px)'
        }}>
            <div className="glass-panel login-container" style={{ padding: '3rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                    {success ? '✅ Access Granted' : 'Restricted Access'}
                </h2>

                {!success && (
                    <>
                        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Enter Admin Code to continue</p>

                        <form onSubmit={handleSubmit}>
                            <input
                                type="password"
                                value={input}
                                onChange={(e) => { setInput(e.target.value); setError(false); }}
                                placeholder="ACCESS CODE"
                                className={`glass-input ${error ? 'shake-animation' : ''}`}
                                style={{
                                    width: '100%',
                                    marginBottom: '1rem',
                                    fontSize: '1.2rem',
                                    textAlign: 'center'
                                }}
                                autoFocus
                            />
                            {error && <p style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{typeof error === 'string' ? error : 'Invalid Access Code'}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="glass-button"
                                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                            >
                                {loading ? 'Verifying...' : 'Unlock System'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;
