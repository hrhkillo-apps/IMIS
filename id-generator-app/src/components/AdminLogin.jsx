import React, { useState, useEffect } from 'react';
import { authService } from '../services/AuthService';

const AdminLogin = ({ onLogin }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('PHONE'); // PHONE | OTP
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initialize Recaptcha when component mounts
        // We need a DOM element for it.
        try {
            authService.initRecaptcha('recaptcha-container');
        } catch (err) {
            console.error("Recaptcha Init Error", err);
        }
    }, []);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Remove any non-digits
        const cleanNumber = phoneNumber.replace(/\D/g, '');

        if (cleanNumber.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            setLoading(false);
            return;
        }

        try {
            // Automatically prepend +91
            const formattedNumber = '+91' + cleanNumber;

            const success = await authService.sendOtp(formattedNumber);
            if (success) {
                setStep('OTP');
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to send OTP. Check console.');
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            setLoading(false);
            return;
        }

        try {
            const success = await authService.verifyOtp(otp);
            if (success) {
                onLogin();
            } else {
                setError('Invalid OTP');
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('Verification Failed');
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
                    {step === 'PHONE' ? 'Admin Login' : 'Verify OTP'}
                </h2>

                <div id="recaptcha-container"></div>

                {step === 'PHONE' && (
                    <form onSubmit={handleSendOtp}>
                        <p style={{ marginBottom: '1.5rem', opacity: 0.7 }}>Enter Mobile Number</p>

                        <div className="input-group" style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <span style={{
                                padding: '0 1rem',
                                fontSize: '1.2rem',
                                color: '#888',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}>+91</span>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => {
                                    // Only allow numbers
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 10) setPhoneNumber(val);
                                }}
                                placeholder="98765 43210"
                                className="glass-input-clean"
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    background: 'transparent',
                                    padding: '1rem',
                                    fontSize: '1.2rem',
                                    color: 'white',
                                    outline: 'none'
                                }}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="glass-button"
                            style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                        >
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 'OTP' && (
                    <form onSubmit={handleVerifyOtp}>
                        <p style={{ marginBottom: '1.5rem', opacity: 0.7 }}>Enter the 6-digit code sent to your phone</p>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            className="glass-input"
                            style={{
                                width: '100%',
                                marginBottom: '1rem',
                                fontSize: '1.2rem',
                                textAlign: 'center',
                                letterSpacing: '0.5rem'
                            }}
                            maxLength={6}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="glass-button"
                            style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                        >
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep('PHONE'); setLoading(false); setError(''); }}
                            style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}
                        >
                            Change Number
                        </button>
                    </form>
                )}

                {error && <p style={{ color: '#ff4444', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</p>}

                <div style={{ marginTop: '2rem', fontSize: '0.7rem', opacity: 0.4 }}>
                    This site is protected by reCAPTCHA and the Google
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline', margin: '0 4px' }}>Privacy Policy</a> and
                    <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline', margin: '0 4px' }}>Terms of Service</a> apply.
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
