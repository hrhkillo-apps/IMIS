```javascript
import React, { useState } from 'react';
import { checkCode } from '../utils/auth';

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
            const isValid = await checkCode(input);
            if (isValid) {
                setSuccess(true);
                // Delay to show success state
                setTimeout(() => {
                    onLogin();
                }, 800);
            } else {
                setError(true);
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError(true);
            setLoading(false);
        }
    };

    return (
        <div style={{
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
            <style>
                {`
@keyframes shake {
    0 % { transform: translateX(0); }
    25 % { transform: translateX(-10px); }
    50 % { transform: translateX(10px); }
    75 % { transform: translateX(-10px); }
    100 % { transform: translateX(0); }
}
          .shake - animation {
    animation: shake 0.3s ease -in -out;
    border - color: #ff4444!important;
}
`}
            </style>
            <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
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
                                className={error ? 'shake-animation' : ''}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '1.2rem',
                                    textAlign: 'center',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                autoFocus
                            />
                            {error && <p style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.9rem' }}>Invalid Access Code</p>}

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
```
