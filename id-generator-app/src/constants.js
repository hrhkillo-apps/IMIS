export const REQUIRED_COLUMNS = [
    "District", "Mandal", "Grampanchayat", "Benificiary Name",
    "IMIS Id", "Beneficiary Category", "Beneficiary Type",
    "Beneficiary Mobile Number", "Ration Card Number", "Ticket Number",
    "Stage Level", "FTR Status", "FTR Number"
];

// Columns to clear
export const CLEAR_COLUMNS = [
    "Bank Account Number", "Bank Branch", "IFSC Code"
];

export const PREDEFINED_LINKS = [
    { label: 'CFMS Bill Status', url: 'https://prdcfms.apcfss.in:44300/sap/bc/ui5_ui5/sap/zexp_billstatus/index.html?sap-client=%27%27' },
    { label: 'Create Multiple Beneficiary Requests', url: 'https://prdcfms.apcfss.in:44300/sap/bc/ui5_ui5/sap/zexp_bf_mul_req/index.html' },
    { label: 'SBM IMIS', url: 'https://sbm.gov.in/SBMPhase2/Secure/Entry/UserMenu.aspx' },
    { label: 'SAC', url: 'https://sac.ap.gov.in/internal' },
    { label: 'Tally xlsx to xlsx', url: '#' },
    { label: 'Tally cfms xlsx to local xlsx', url: '#' }
];

export const ID_RANGES = {
    TICKET: { MIN: 2000000000, MAX: 2999999999 },
    FTR: { MIN: 2000000000, MAX: 2999999999 }, // Currently same as Ticket
    REG: { MIN: 1000000000, MAX: 1999999999 }
};
