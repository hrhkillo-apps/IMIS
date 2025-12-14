import React from 'react';
import { PREDEFINED_LINKS } from '../constants';

const ExternalLinks = ({ onAadharClick, onBackup, onRestore, onTallyClick, onImisClick, onMatchClick, onCommitmentsClick }) => (
    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Quick Links</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {PREDEFINED_LINKS.map((link, index) => {
                if (link.label === 'New Added Data Finder') {
                    return (
                        <button
                            key={index}
                            onClick={onTallyClick}
                            className="glass-button"
                            style={{ textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            🔗 {link.label}
                        </button>
                    );
                }
                if (link.label === 'Match CFMS with SAC') {
                    return (
                        <button
                            key={index}
                            onClick={onMatchClick}
                            className="glass-button"
                            style={{ textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            🔗 {link.label}
                        </button>
                    );
                }
                if (link.label === 'Show the commitments') {
                    return (
                        <button
                            key={index}
                            onClick={onCommitmentsClick}
                            className="glass-button"
                            style={{ textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            🔗 {link.label}
                        </button>
                    );
                }

                if (link.label === 'IMIS id Generator') {
                    return (
                        <button
                            key={index}
                            onClick={onImisClick}
                            className="glass-button"
                            style={{ textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            🔗 {link.label}
                        </button>
                    );
                }
                return (
                    <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-button"
                        style={{ textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        🔗 {link.label}
                    </a>
                );
            })}
            <button
                onClick={onAadharClick}
                className="glass-button"
                style={{
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    background: 'rgba(255, 100, 100, 0.2)',
                    border: '1px solid rgba(255, 100, 100, 0.4)'
                }}
            >
                🆔 Aadhar Generator
            </button>

            {/* ID History Section Removed */}

        </div>
    </div>
);

export default ExternalLinks;
