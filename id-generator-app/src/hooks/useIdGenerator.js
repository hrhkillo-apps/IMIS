import { useState } from 'react';
import * as XLSX from 'xlsx';
import { REQUIRED_COLUMNS } from '../constants';

export const useIdGenerator = () => {
    const [isVerifying, setIsVerifying] = useState(false);
    const [investigationReport, setInvestigationReport] = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [synthesisCount, setSynthesisCount] = useState(0);
    const [progress, setProgress] = useState(0);

    // Load utilities dynamically to keep bundle size optimized? 
    // Or just import statically. The original had dynamic imports. 
    // We'll keep dynamic imports to match original perf characteristics if desired,
    // but in a hook it's a bit messier. Let's start with dynamic as in original.

    const analyzeAndVerify = async (data, headers) => {
        try {
            setIsVerifying(true);
            setProgress(0);
            setInvestigationReport(null);

            const { validateRow } = await import('../utils/idGenerator.js');
            const { analyzeContext } = await import('../utils/dataAnalyzer.js');

            // 1. Schema Validation
            const headerSet = new Set(headers.map(h => h && h.trim()));
            const missingColumns = [];
            REQUIRED_COLUMNS.forEach(col => {
                if (!headerSet.has(col)) missingColumns.push(col);
            });

            if (missingColumns.length > 0) {
                throw new Error(`CRITICAL ERROR: Missing required columns: ${missingColumns.join(', ')}`);
            }

            // 2. Context Analysis
            const context = analyzeContext(data, headers);
            setGenerationContext(context);

            let validCount = 0;
            let invalidCount = 0;
            const missingStats = { ticket: 0, ftr: 0, reg: 0, name: 0 };

            const ticketIdx = headers.indexOf('Ticket Number');
            const ftrIdx = headers.indexOf('FTR Number');
            const realRegIdx = headers.indexOf('IMIS Id');
            const nameIdx = headers.indexOf('Benificiary Name');

            const total = data.length;

            for (let i = 0; i < total; i++) {
                const row = data[i];
                const validation = validateRow(row);

                if (validation.valid) {
                    validCount++;
                    if (ticketIdx !== -1 && !row[ticketIdx]) missingStats.ticket++;
                    if (ftrIdx !== -1 && !row[ftrIdx]) missingStats.ftr++;
                    if (realRegIdx !== -1 && !row[realRegIdx]) missingStats.reg++;
                    if (nameIdx !== -1 && !row[nameIdx]) missingStats.name++;
                } else {
                    invalidCount++;
                }

                if (total > 100 && i % (Math.ceil(total / 10)) === 0) {
                    setProgress(Math.round((i / total) * 100));
                }
            }
            setProgress(100);

            setInvestigationReport({
                total,
                validCount,
                invalidCount,
                missingStats,
                context
            });

            return { success: true };

        } catch (error) {
            console.error("Analysis failed:", error);
            return { success: false, error: error.message };
        } finally {
            setIsVerifying(false);
        }
    };

    const generateIds = async (data, headers, idHistory, fileName) => {
        try {
            const { generateTicketNumber, generateFTRNumber, generateBeneficiaryRegId, generateName, validateRow } = await import('../utils/idGenerator.js');
            const { synthesizeRows } = await import('../utils/dataSynthesizer.js');
            // USE ID SERVICE INSTEAD OF LOCAL STORAGE
            const { IdService } = await import('../services/IdService.js');

            // 0. STRICT CONNECTION CHECK
            // We must ensure we can talk to Firebase before doing ANYTHING.
            // If the initial ID load failed or network is down, we cannot proceed.
            let currentHistory;
            try {
                currentHistory = await IdService.getAllIds();
            } catch (connErr) {
                return {
                    success: false,
                    error: "CRITICAL: Cannot connect to Online Storage. \n\nCheck your internet connection or configuration. \nID Generation aborted to prevent duplicates."
                };
            }

            const ticketIdx = headers.indexOf('Ticket Number');
            const ftrIdx = headers.indexOf('FTR Number');
            const regIdx = headers.indexOf('IMIS Id');
            const nameIdx = headers.indexOf('Benificiary Name');
            const distIdx = headers.indexOf('District');
            const mandalIdx = headers.indexOf('Mandal');

            const stageIdx = headers.indexOf('Stage Level');
            const amountIdx = headers.indexOf('Amount');
            const bankAccIdx = headers.indexOf('Bank Account Number');
            const bankBranchIdx = headers.indexOf('Bank Branch');
            const ifscIdx = headers.indexOf('IFSC Code');
            const nankAccIdx = headers.indexOf('Nank Account Number');

            // Initialize local tracking sets from the FRESHLY fetched history
            const existingIds = {
                ticket: new Set(currentHistory.ticket),
                ftr: new Set(currentHistory.ftr),
                reg: new Set(currentHistory.reg)
            };

            const newGeneratedIds = {
                ticket: new Set(),
                ftr: new Set(),
                reg: new Set()
            };

            // Prime existing IDs from current file
            data.forEach(row => {
                if (ticketIdx !== -1 && row[ticketIdx]) existingIds.ticket.add(String(row[ticketIdx]));
                if (ftrIdx !== -1 && row[ftrIdx]) existingIds.ftr.add(String(row[ftrIdx]));
                if (regIdx !== -1 && row[regIdx]) existingIds.reg.add(String(row[regIdx]));
            });

            // Use context max IDs
            let currentTicketMax = generationContext?.maxIds?.ticket || 0;
            let currentFtrMax = generationContext?.maxIds?.ftr || 0;
            let currentRegMax = generationContext?.maxIds?.reg || 0;

            // 1. Process Existing Data (Correction/Filling)
            let updatedData = data.map(row => {
                if (!validateRow(row).valid) return row;

                let newRow = [...row];

                // Auto-fill Location if Single Mode
                if (distIdx !== -1 && !newRow[distIdx] && generationContext?.districtMode) {
                    newRow[distIdx] = generationContext.districtMode;
                }
                if (mandalIdx !== -1 && !newRow[mandalIdx] && generationContext?.mandalMode) {
                    newRow[mandalIdx] = generationContext.mandalMode;
                }
                // Auto-fill Name
                if (nameIdx !== -1 && !newRow[nameIdx] && generationContext?.namePool) {
                    newRow[nameIdx] = generateName(generationContext.namePool);
                }

                // ID Generation
                if (ticketIdx !== -1 && !newRow[ticketIdx]) {
                    const newId = generateTicketNumber(existingIds.ticket, currentTicketMax);
                    newRow[ticketIdx] = newId;
                    existingIds.ticket.add(String(newId));
                    newGeneratedIds.ticket.add(String(newId));
                    currentTicketMax = newId;
                }
                if (ftrIdx !== -1 && !newRow[ftrIdx]) {
                    const newId = generateFTRNumber(existingIds.ftr, currentFtrMax);
                    newRow[ftrIdx] = newId;
                    existingIds.ftr.add(String(newId));
                    newGeneratedIds.ftr.add(String(newId));
                    currentFtrMax = newId;
                }
                if (regIdx !== -1 && !newRow[regIdx]) {
                    const newId = generateBeneficiaryRegId(existingIds.reg, currentRegMax);
                    newRow[regIdx] = newId;
                    existingIds.reg.add(String(newId));
                    newGeneratedIds.reg.add(String(newId));
                    currentRegMax = newId;
                }

                return newRow;
            });

            // 2. Synthesis (New Rows)
            const countToAdd = parseInt(synthesisCount, 10) || 0;
            let finalData = [];
            let newRowsCount = 0;

            if (countToAdd > 0) {
                const newRows = synthesizeRows(
                    countToAdd,
                    generationContext,
                    headers,
                    existingIds,
                    { ticket: currentTicketMax, ftr: currentFtrMax, reg: currentRegMax }
                );
                newRowsCount = newRows.length;
                finalData = [...updatedData, ...newRows];

                // Track generated IDs from new rows
                newRows.forEach(row => {
                    if (ticketIdx !== -1) newGeneratedIds.ticket.add(String(row[ticketIdx]));
                    if (ftrIdx !== -1) newGeneratedIds.ftr.add(String(row[ftrIdx]));
                    if (regIdx !== -1) newGeneratedIds.reg.add(String(row[regIdx]));
                });
            } else {
                finalData = updatedData;
            }

            // 3. Save to Firebase Service
            await IdService.saveBatch(newGeneratedIds);

            // 4. Post-process (Serial No, Formatting)
            const slNoIdx = headers.findIndex(h => {
                const lower = String(h).toLowerCase().replace('.', '').replace(/\s/g, '');
                return ['sno', 'slno', 'serialno', 'serialnumber'].includes(lower);
            });

            finalData = finalData.map((row, index) => {
                if (row.length < headers.length) {
                    // Pad row
                    while (row.length < headers.length) row.push('');
                }
                let modifiedRow = [...row];

                if (slNoIdx !== -1) modifiedRow[slNoIdx] = index + 1;
                // Clear sensitive/bank info
                if (bankAccIdx !== -1) modifiedRow[bankAccIdx] = '';
                if (nankAccIdx !== -1) modifiedRow[nankAccIdx] = '';
                if (bankBranchIdx !== -1) modifiedRow[bankBranchIdx] = '';
                if (ifscIdx !== -1) modifiedRow[ifscIdx] = '';

                // Logic specific: Amount based on Stage
                if (stageIdx !== -1 && amountIdx !== -1) {
                    const stage = String(modifiedRow[stageIdx] || '').toLowerCase();
                    if (stage.includes('after basement') || stage.includes('afterbasement')) {
                        modifiedRow[amountIdx] = 6000;
                    } else if (stage.includes('final completion') || stage.includes('finalcompletion')) {
                        modifiedRow[amountIdx] = 9000;
                    }
                }
                return modifiedRow;
            });

            // 5. Auto Export
            const now = new Date();
            const datePrefix = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
            const ws = XLSX.utils.aoa_to_sheet([headers, ...finalData]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            const outName = `${datePrefix}_${fileName || 'data.xlsx'}`;
            XLSX.writeFile(wb, outName);

            // Return new history snapshot and data
            // Fetch updated history from service to ensure sync? 
            // OR just return the local accumulation. 
            // Let's re-fetch to be safe and consistent with "reads the online backup directly"
            const updatedHistory = await IdService.getAllIds();

            return {
                success: true,
                finalData,
                newHistory: updatedHistory,
                message: countToAdd > 0
                    ? `SUCCESS!\n\nGenerated ${newRowsCount} NEW rows.\nIDs saved to Firebase.`
                    : `SUCCESS!\n\nProcessed ${finalData.length} rows.\nIDs saved to Firebase.`
            };

        } catch (err) {
            console.error(err);
            return { success: false, error: err.message };
        }
    };

    return {
        isVerifying,
        investigationReport,
        generationContext,
        synthesisCount,
        setSynthesisCount,
        progress,
        analyzeAndVerify,
        generateIds,
        reset: () => {
            setInvestigationReport(null);
            setGenerationContext(null);
            setSynthesisCount(0);
            setProgress(0);
            setIsVerifying(false);
        }
    };
};
