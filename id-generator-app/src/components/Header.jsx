import React from 'react';

const Header = () => (
    <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            IMIS Data & ID Manager
        </h1>
        <p style={{ opacity: 0.8 }}>Upload any Excel file with the required format to generate missing IDs.</p>
    </header>
);

export default Header;
