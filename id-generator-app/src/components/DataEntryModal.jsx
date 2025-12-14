import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';

const DataEntryModal = ({ isOpen, onClose, initialData, onSave }) => {
    const toast = useToast();
    const [formData, setFormData] = useState({
        vendorName: '',
        beneficiaryName: '',
        cfmsId: '',
        aadharNumber: '',
        panCard: '',
        ifscCode: '',
        accountNumber: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                vendorName: '',
                beneficiaryName: '',
                cfmsId: '',
                aadharNumber: '',
                panCard: '',
                ifscCode: '',
                accountNumber: ''
            });
        }
    }, [initialData, isOpen]);



    const handleChange = (e) => {
        const { name, value } = e.target;

        // Strict Input Masks
        if (name === 'accountNumber') {
            if (/^\d*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name === 'aadharNumber') {
            // Only allow numbers, max 12
            if (/^\d{0,12}$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (['ifscCode', 'vendorName', 'beneficiaryName', 'cfmsId', 'panCard'].includes(name)) {
            // Force Uppercase immediately
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [bankDetails, setBankDetails] = useState(null);
    const [isLoadingBank, setIsLoadingBank] = useState(false);

    useEffect(() => {
        // Debounce IFSC check or check on length
        const ifsc = formData.ifscCode; // Already upper via handleChange
        if (ifsc.length === 11) {
            fetchBankDetails(ifsc);
        } else {
            setBankDetails(null);
        }
    }, [formData.ifscCode]);

    const fetchBankDetails = async (ifsc) => {
        setIsLoadingBank(true);
        try {
            const response = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
            if (response.ok) {
                const data = await response.json();
                setBankDetails(data);
                // toast.success("Bank Details Found!");
            } else {
                setBankDetails(null);
                // toast.error("Invalid IFSC Code");
            }
        } catch (error) {
            console.error("Error fetching IFSC:", error);
            setBankDetails(null);
        } finally {
            setIsLoadingBank(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Regex Validations
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const accountRegex = /^[0-9]{9,18}$/;

        // Validation
        if (!formData.vendorName.trim() ||
            !formData.beneficiaryName.trim() ||
            !formData.ifscCode.trim() ||
            !formData.accountNumber.trim()) {
            toast.error("Please fill all mandatory fields: Vendor, Beneficiary, IFSC, Account");
            return;
        }

        // Aadhar Validation (Optional but if entered, must be 12)
        if (formData.aadharNumber && formData.aadharNumber.length !== 12) {
            toast.error("Aadhar Number must be exactly 12 digits.");
            return;
        }

        if (!ifscRegex.test(formData.ifscCode)) {
            toast.error("Invalid IFSC Code Format. (e.g., SBIN0001234)");
            return;
        }

        if (!accountRegex.test(formData.accountNumber)) {
            toast.error("Invalid Account Number. Must be 9-18 digits.");
            return;
        }

        onSave(formData);

        // Only close if editing. If adding, keep open for next entry.
        if (initialData) {
            onClose();
        } else {
            // Reset for next entry
            setFormData({
                vendorName: '',
                beneficiaryName: '',
                cfmsId: '',
                aadharNumber: '',
                panCard: '',
                ifscCode: '',
                accountNumber: ''
            });
            setBankDetails(null);
            // Focus can be handled by user clicking, or we could add a ref, but reset is sufficient.
        }
    };

    const inputStyle = {
        display: 'block',
        width: '100%',
        padding: '0.8rem',
        marginBottom: '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        color: 'white',
        fontSize: '1rem'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '0.5rem',
        textAlign: 'left',
        fontSize: '0.9rem',
        opacity: 0.9
    };

    return !isOpen ? null : (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1050, backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2rem' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '10px', right: '15px',
                        background: 'none', border: 'none', color: 'white',
                        fontSize: '1.5rem', cursor: 'pointer'
                    }}>
                    &times;
                </button>
                <h2 style={{ marginBottom: '1.5rem', marginTop: 0 }}>{initialData ? 'Edit Entry' : 'Data Entry'}</h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Vendor Name *</label>
                            <input
                                type="text"
                                name="vendorName"
                                value={formData.vendorName}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Enter Vendor Name"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Beneficiary Name *</label>
                            <input
                                type="text"
                                name="beneficiaryName"
                                value={formData.beneficiaryName}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Enter Beneficiary Name"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>CFMS ID</label>
                            <input
                                type="text"
                                name="cfmsId"
                                value={formData.cfmsId}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Enter CFMS ID"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Aadhar Number</label>
                            <input
                                type="text"
                                name="aadharNumber"
                                value={formData.aadharNumber}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Enter Aadhar"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Pan Card</label>
                            <input
                                type="text"
                                name="panCard"
                                value={formData.panCard}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Enter PAN"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>IFSC Code *</label>
                            <input
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode}
                                onChange={handleChange}
                                maxLength={11}
                                style={{ ...inputStyle, textTransform: 'uppercase' }}
                                placeholder="Enter IFSC"
                            />
                            {isLoadingBank && <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Fetching Bank Details...</div>}
                            {bankDetails && (
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: '#4caf50',
                                    marginTop: '-0.5rem',
                                    marginBottom: '1rem',
                                    background: 'rgba(76, 175, 80, 0.1)',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(76, 175, 80, 0.3)'
                                }}>
                                    ✓ {bankDetails.BANK} - {bankDetails.BRANCH}, {bankDetails.CITY}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Account Number *</label>
                        <input
                            type="text"
                            name="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            style={inputStyle}
                            placeholder="Enter Account Number"
                        />
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="glass-button"
                            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="glass-button"
                            style={{ background: 'rgba(76, 175, 80, 0.5)' }}
                        >
                            {initialData ? 'Update' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DataEntryModal;
