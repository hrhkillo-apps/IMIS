import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

export const useFileProcessor = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const processFile = useCallback((file) => {
        if (!file) return;

        setIsUploading(true);
        setFileName(file.name);
        setError(null);
        setData([]);

        // Use a timeout to allow UI to update (show spinner)
        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    let rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

                    if (!rawData || rawData.length === 0) {
                        throw new Error("File is empty");
                    }

                    let oldHeaders = rawData[0];

                    // 1. Rename Logic
                    const regIdxOld = oldHeaders.indexOf("Benificiary Registration Id");
                    if (regIdxOld !== -1) oldHeaders[regIdxOld] = "IMIS Id";

                    // 2. Define New Header Order
                    let newHeaders = [...oldHeaders];
                    // Remove specific columns to re-insert them in specific order or filter out?
                    // Original logic: filter out "CFMS Id", "Aadhar Number", "Amount" then add them back.
                    newHeaders = newHeaders.filter(h => h !== "CFMS Id" && h !== "Aadhar Number" && h !== "Amount");

                    const bankIdx = newHeaders.findIndex(h => h && h.trim() === "Bank Account Number");
                    const colsToAdd = ["CFMS Id", "Aadhar Number"];

                    if (bankIdx !== -1) {
                        newHeaders.splice(bankIdx, 0, ...colsToAdd);
                    } else {
                        newHeaders.push(...colsToAdd);
                    }

                    if (!newHeaders.includes("Amount")) newHeaders.push("Amount");

                    // 3. Reconstruct Data
                    const oldHeaderMap = {};
                    oldHeaders.forEach((h, i) => oldHeaderMap[h] = i);

                    const restructuredData = rawData.slice(1).map(row => {
                        return newHeaders.map(header => {
                            const oldIdx = oldHeaderMap[header];
                            if (oldIdx !== undefined && row[oldIdx] !== undefined) {
                                return row[oldIdx];
                            }
                            return '';
                        });
                    });

                    setHeaders(newHeaders);
                    setData(restructuredData);
                } catch (err) {
                    console.error(err);
                    setError(err.message || "Error reading file");
                } finally {
                    setIsUploading(false);
                }
            };

            reader.onerror = () => {
                setError("Failed to read file");
                setIsUploading(false);
            };

            reader.readAsBinaryString(file);
        }, 100);
    }, []);

    const clearData = useCallback(() => {
        setData([]);
        setHeaders([]);
        setFileName('');
        setError(null);
    }, []);

    return {
        data,
        setData, // Exposed for external updates (e.g. after generation)
        headers,
        setHeaders,
        fileName,
        isUploading,
        error,
        processFile,
        clearData
    };
};
