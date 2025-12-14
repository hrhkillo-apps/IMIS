import React from 'react';

const Footer = () => {
    return (
        <footer style={{
            marginTop: 'auto',
            padding: '2rem 0 1rem 0',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.85rem',
            letterSpacing: '0.5px'
        }}>
            <p style={{ margin: 0 }}>
                Powered by <span style={{
                    color: '#4fc3f7',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>HRHKILLO</span>
            </p>
        </footer>
    );
};

export default Footer;
