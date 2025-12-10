import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught Error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    textAlign: 'center',
                    color: '#ff6b6b'
                }}>
                    <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️ Application Error</h2>
                        <p style={{ color: 'white', marginBottom: '1rem', opacity: 0.9 }}>
                            Something went wrong in the application specific logic.
                        </p>
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            marginBottom: '2rem',
                            textAlign: 'left',
                            overflow: 'auto',
                            maxHeight: '200px',
                            fontSize: '0.9rem',
                            color: '#ffcccc'
                        }}>
                            {this.state.error && this.state.error.toString()}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button onClick={this.handleReset} className="glass-button">
                                Try Again
                            </button>
                            <button onClick={this.handleReload} className="glass-button" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
