
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000); // Auto remove after 3s
    }, []);

    const success = (msg) => addToast(msg, 'success');
    const error = (msg) => addToast(msg, 'error');
    const info = (msg) => addToast(msg, 'info');

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ success, error, info }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {toasts.map(toast => (
                    <div key={toast.id} className={`glass-panel toast-${toast.type}`} style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)',
                        background: toast.type === 'error' ? 'rgba(255, 68, 68, 0.9)' :
                            toast.type === 'success' ? 'rgba(0, 200, 81, 0.9)' : 'rgba(51, 181, 229, 0.9)',
                        color: 'white',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        minWidth: '250px',
                        animation: 'slideIn 0.3s ease-out',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            marginLeft: '10px',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                        }}>&times;</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
