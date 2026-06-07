/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileCode, CheckCircle, Database, Grid, Sliders, AlertCircle, RefreshCw } from 'lucide-react';
import { Dataset, ColumnSummary } from '../types';
import { defaultDatasets } from '../data/defaultDatasets';

interface DataPreprocessingProps {
  onDatasetLoaded: (dataset: Dataset, name: string) => void;
  loadedDataset: Dataset | null;
  loadedName: string;
}

export default function DataPreprocessing({
  onDatasetLoaded,
  loadedDataset,
  loadedName,
}: DataPreprocessingProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Preprocessing Options
  const [missingStrategy, setMissingStrategy] = useState<'drop' | 'mean_median' | 'mode'>('mean_median');
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const loadDefaultData = (index: number) => {
    setSelectedDatasetIndex(index);
    const sample = defaultDatasets[index];
    processCSVContent(sample.csvContent, sample.name);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMsg("Invalid file type. Please upload a structured CSV file.");
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCSVContent(text, file.name);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file.");
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const processCSVContent = (csvText: string, datasetName: string) => {
    setIsProcessing(true);
    setErrorMsg(null);

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rawRows = results.data as Record<string, any>[];
        if (rawRows.length === 0) {
          setErrorMsg("The CSV file appears to be empty.");
          setIsProcessing(false);
          return;
        }

        const columns = results.meta.fields || [];
        if (columns.length === 0) {
          // If PapaParse couldn't find headers, extract them from first row
          const keys = Object.keys(rawRows[0] || {});
          if (keys.length === 0) {
            setErrorMsg("No columns or fields detected in dataset.");
            setIsProcessing(false);
            return;
          }
        }

        try {
          // Clean & Preprocess Data based on strategy chosen
          const { cleanedRows, summaries, correlationMatrix } = cleanAndSummarizeData(
            rawRows,
            columns,
            missingStrategy
          );

          onDatasetLoaded(
            {
              rawRows,
              cleanedRows,
              columns,
              summaries,
              correlationMatrix,
            },
            datasetName
          );
        } catch (err: any) {
          setErrorMsg(err.message || "An error occurred during data preprocessing.");
        } finally {
          setIsProcessing(false);
        }
      },
      error: (err) => {
        setErrorMsg(`Failed to parse CSV: ${err.message}`);
        setIsProcessing(false);
      }
    });
  };

  // Preprocessing and summarization pipeline
  const cleanAndSummarizeData = (
    rawRows: Record<string, any>[],
    columns: string[],
    strategy: 'drop' | 'mean_median' | 'mode'
  ) => {
    // 1. Column Metadata detection
    const initialSummaries: Record<string, ColumnSummary> = {};

    for (const col of columns) {
      const vals = rawRows.map(r => r[col]).filter(v => v !== undefined && v !== null);
      const isNumeric = vals.every(v => typeof v === 'number' || !isNaN(Number(v)));
      const missingCount = rawRows.length - vals.length;
      const uniqueValues = Array.from(new Set(vals.map(v => String(v))));

      initialSummaries[col] = {
        name: col,
        type: isNumeric ? 'numeric' : 'categorical',
        missingCount,
        uniqueValues,
      };
    }

    // 2. Perform Cleaning (Missing Data strategy)
    let cleanedRows: Record<string, any>[] = [];

    if (strategy === 'drop') {
      // Drop any row that has any missing/null column
      cleanedRows = rawRows.filter(row => {
        return columns.every(col => row[col] !== undefined && row[col] !== null && row[col] !== "");
      });
    } else {
      // Copy rows to clean them in-place
      cleanedRows = rawRows.map(r => ({ ...r }));

      for (const col of columns) {
        const summary = initialSummaries[col];
        const validVals = cleanedRows
          .map(r => r[col])
          .filter(v => v !== undefined && v !== null && v !== "");

        if (summary.type === 'numeric') {
          // Compute Mean & Median
          const numVals = validVals.map(Number);
          const sum = numVals.reduce((a, b) => a + b, 0);
          const mean = numVals.length > 0 ? sum / numVals.length : 0;
          
          const sorted = [...numVals].sort((a, b) => a - b);
          const median = sorted.length > 0 
            ? (sorted.length % 2 === 0 
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 
                : sorted[Math.floor(sorted.length / 2)])
            : 0;

          // Fill missing values if mean_median strategy
          if (strategy === 'mean_median') {
            cleanedRows.forEach(row => {
              if (row[col] === undefined || row[col] === null || row[col] === "") {
                row[col] = median; // Prefer median for robustness
              } else {
                row[col] = Number(row[col]); // Cast/clean type
              }
            });
          }
        } else {
          // Categorical Mode calculation
          const frequencies: Record<string, number> = {};
          let maxCount = 0;
          let modeVal = "";
          
          validVals.forEach(val => {
            const strVal = String(val);
            frequencies[strVal] = (frequencies[strVal] || 0) + 1;
            if (frequencies[strVal] > maxCount) {
              maxCount = frequencies[strVal];
              modeVal = strVal;
            }
          });

          if (strategy === 'mode' || strategy === 'mean_median') {
            cleanedRows.forEach(row => {
              if (row[col] === undefined || row[col] === null || row[col] === "") {
                row[col] = modeVal || "Unknown";
              } else {
                row[col] = String(row[col]);
              }
            });
          }
        }
      }
    }

    // 3. Final statistics based on preprocessed dataset
    const finalSummaries: Record<string, ColumnSummary> = {};
    for (const col of columns) {
      const vals = cleanedRows.map(r => r[col]);
      const summary = initialSummaries[col];
      const uniqueValues = Array.from(new Set(vals.map(v => String(v))));

      if (summary.type === 'numeric') {
        const numVals = vals.map(Number);
        const sum = numVals.reduce((a, b) => a + b, 0);
        const mean = sum / numVals.length;
        
        const sorted = [...numVals].sort((a, b) => a - b);
        const median = sorted.length > 0 
          ? (sorted.length % 2 === 0 
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 
              : sorted[Math.floor(sorted.length / 2)])
          : 0;

        const sqDiffs = numVals.map(v => (v - mean) * (v - mean));
        const variance = sqDiffs.reduce((a, b) => a + b, 0) / numVals.length;
        const stdDev = Math.sqrt(variance);

        finalSummaries[col] = {
          name: col,
          type: 'numeric',
          missingCount: 0,
          uniqueValues,
          mean,
          median,
          min: sorted[0] ?? 0,
          max: sorted[sorted.length - 1] ?? 0,
          stdDev,
        };
      } else {
        finalSummaries[col] = {
          name: col,
          type: 'categorical',
          missingCount: 0,
          uniqueValues,
        };
      }
    }

    // 4. PEARSON CORRELATION MATRIX (for all numerical variables)
    const numericCols = columns.filter(col => finalSummaries[col].type === 'numeric');
    const correlationMatrix: { colA: string; colB: string; value: number }[] = [];

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = 0; j < numericCols.length; j++) {
        const colA = numericCols[i];
        const colB = numericCols[j];
        
        if (i === j) {
          correlationMatrix.push({ colA, colB, value: 1.0 });
          continue;
        }

        const valsA = cleanedRows.map(r => Number(r[colA]));
        const valsB = cleanedRows.map(r => Number(r[colB]));

        const meanA = finalSummaries[colA].mean ?? 0;
        const meanB = finalSummaries[colB].mean ?? 0;

        let num = 0;
        let denA = 0;
        let denB = 0;

        for (let k = 0; k < cleanedRows.length; k++) {
          const diffA = valsA[k] - meanA;
          const diffB = valsB[k] - meanB;
          num += diffA * diffB;
          denA += diffA * diffA;
          denB += diffB * diffB;
        }

        const rCoeff = denA > 0 && denB > 0 ? num / Math.sqrt(denA * denB) : 0;
        correlationMatrix.push({ colA, colB, value: rCoeff });
      }
    }

    return { cleanedRows, summaries: finalSummaries, correlationMatrix };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-600" />
          Data Upload & Cleaning Strategy
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Import a spreadsheet, specify missing-data treatments, and compile your analytical profile with a high-fidelity cleaner.
        </p>

        {/* Strategies panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" /> Preprocessing Configurations
            </span>
            <label className="block text-sm font-medium text-slate-700 mb-1">Missing Value Correction Strategy</label>
            <select
              value={missingStrategy}
              onChange={(e) => setMissingStrategy(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="mean_median">Numerical: Fills with Median (Robust to outliers) / Categorical: Mode</option>
              <option value="mode">Fills missing values with Mode (Most frequent frequency)</option>
              <option value="drop">Listwise Deletion (Strips all records containing any row-nulls)</option>
            </select>
            <p className="text-xs text-slate-400 mt-2">
              Note: Decision Trees split perfectly with missing flags, but Logistic Regression requires zero raw null coefficients for training stability bounds.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-slate-500" /> Sandbox Sample Datasets
              </span>
              <p className="text-xs text-slate-500 mb-3">
                No CSV at hand? Click a curated standard dataset to instantly populate ML models with training bounds.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {defaultDatasets.map((ds, idx) => (
                <button
                  key={idx}
                  onClick={() => loadDefaultData(idx)}
                  className={`px-3 py-2 text-xs rounded-md border text-left transition-colors duration-200 ${
                    selectedDatasetIndex === idx
                      ? "bg-cyan-50 border-cyan-200 text-cyan-800"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-semibold block truncate">{ds.name}</span>
                  <span className="text-[10px] text-slate-400 block truncate leading-tight mt-0.5">
                    {idx === 0 ? "Classification & Regression" : "Binary Classification"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 mt-6 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-cyan-500 bg-cyan-50/50"
              : "border-slate-200 hover:border-cyan-400 hover:bg-slate-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
          {isProcessing ? (
            <div className="space-y-3 py-4">
              <RefreshCw className="w-10 h-10 text-cyan-600 animate-spin mx-auto" />
              <p className="text-slate-600 font-medium text-sm">Parsing sheet rows & executing cleansing algorithm...</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center mx-auto text-cyan-600">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-slate-700 font-medium text-sm">
                Drag & drop your CSV file here, or <span className="text-cyan-600 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400">
                Supports standard comma-separated tabular spreadsheets (.csv format) up to 20MB
              </p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Clean Summary Indicator */}
        {loadedDataset && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold block text-emerald-900">Successfully Configured Dataset!</span>
                <span className="text-xs text-emerald-700 mt-0.5 block">
                  File {loadedName} loaded: {loadedDataset.rawRows.length} raw records cleaned into {loadedDataset.cleanedRows.length} rows with {loadedDataset.columns.length} features. Zero missing cells remain!
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {loadedDataset && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-1.5 mb-2">
            <Grid className="w-4 h-4 text-slate-400" />
            Cleaned Spreadsheet Preview (First 5 Rows)
          </h3>
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {loadedDataset.columns.map((col, idx) => (
                    <th key={idx} className="p-3 font-semibold text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadedDataset.cleanedRows.slice(0, 5).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    {loadedDataset.columns.map((col, cIdx) => (
                      <td key={cIdx} className="p-3 text-slate-500 font-mono truncate max-w-[150px]">
                        {row[col] === null || row[col] === undefined ? "null" : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
