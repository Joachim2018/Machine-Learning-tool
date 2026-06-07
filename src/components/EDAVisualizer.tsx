/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Eye, Filter, Sparkles, Sigma, HelpCircle } from 'lucide-react';
import { Dataset, ColumnSummary } from '../types';

interface EDAVisualizerProps {
  dataset: Dataset | null;
}

export default function EDAVisualizer({ dataset }: EDAVisualizerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'numeric' | 'categorical'>('all');
  const [hoveredCell, setHoveredCell] = useState<{ r: string; c: string; v: number } | null>(null);

  if (!dataset) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-slate-800 font-semibold mb-1">Exploratory Data Analysis Pending</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Please upload or load a sample dataset in the "Upload & Clean" panel first to trigger the automated statistical profiling suite.
        </p>
      </div>
    );
  }

  // Filter columns based on search and selected column type
  const columnNames = dataset.columns;
  const filteredColumns = columnNames.filter(col => {
    const sum = dataset.summaries[col];
    const matchesSearch = col.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'numeric' && sum.type === 'numeric') ||
      (filterType === 'categorical' && sum.type === 'categorical');
    return matchesSearch && matchesType;
  });

  // Numeric columns specifically for Correlation Matrix Heatmap
  const numericColumns = columnNames.filter(col => dataset.summaries[col]?.type === 'numeric');

  // Helper to resolve cell heat maps background styling
  const getCellColor = (val: number) => {
    // scale from -1 to +1
    if (val === 1) return 'bg-cyan-900 text-white';
    
    // Positive values
    if (val > 0.8) return 'bg-cyan-800/90 text-white';
    if (val > 0.6) return 'bg-cyan-700/80 text-white';
    if (val > 0.4) return 'bg-cyan-600/65 text-slate-900';
    if (val > 0.2) return 'bg-cyan-500/35 text-slate-800';
    if (val > 0.05) return 'bg-cyan-200/20 text-slate-700';

    // Negative values
    if (val < -0.8) return 'bg-rose-850/90 text-white';
    if (val < -0.6) return 'bg-rose-700/80 text-white';
    if (val < -0.4) return 'bg-rose-600/65 text-slate-900';
    if (val < -0.2) return 'bg-rose-500/35 text-slate-800';
    if (val < -0.05) return 'bg-rose-200/20 text-slate-700';

    // Neutral
    return 'bg-slate-100/50 text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
            <Sigma className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Sample Dimensions</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {dataset.cleanedRows.length} <span className="text-xs text-slate-400 font-sans font-normal">Rows</span> × {columnNames.length} <span className="text-xs text-slate-400 font-sans font-normal">Columns</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Feature Class Splits</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {numericColumns.length} <span className="text-xs text-indigo-500 font-sans font-medium">Numeric</span> / {columnNames.length - numericColumns.length} <span className="text-xs text-amber-500 font-sans font-medium">Categorical</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Data Completeness Rate</span>
            <span className="text-xl font-bold text-slate-800 font-mono">100.0% <span className="text-xs text-emerald-500 font-sans font-medium">Clean</span></span>
          </div>
        </div>
      </div>

      {/* Statistics profiling table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Univariate Descriptive Statistics</h3>
            <p className="text-xs text-slate-500">Comprehensive summary metrics computed instantly across all active cleaned dataset dimensions.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs w-48 focus:bg-white focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Filters Toggles */}
            <div className="border border-slate-200 rounded-md p-0.5 flex gap-1 bg-slate-50">
              {(['all', 'numeric', 'categorical'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-[10px] rounded uppercase font-medium tracking-wider transition-colors duration-200 ${
                    filterType === type
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dense summary tables */}
        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3">Variable Name</th>
                <th className="p-3 text-center">Data Type</th>
                <th className="p-3 text-center">Unique Keys</th>
                <th className="p-3 text-right">Mean Average</th>
                <th className="p-3 text-right">Median Mid</th>
                <th className="p-3 text-right">Std Dev (σ)</th>
                <th className="p-3 text-right">Min Bound</th>
                <th className="p-3 text-right">Max Bound</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredColumns.map((col, idx) => {
                const sum = dataset.summaries[col];
                const isNumeric = sum.type === 'numeric';
                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-sans font-semibold text-slate-700">{sum.name}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-sans font-semibold ${
                        isNumeric ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {sum.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500">{sum.uniqueValues.length}</td>
                    <td className="p-3 text-right text-slate-600">
                      {isNumeric && sum.mean !== undefined ? sum.mean.toFixed(3) : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-600">
                      {isNumeric && sum.median !== undefined ? sum.median.toFixed(3) : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-600">
                      {isNumeric && sum.stdDev !== undefined ? sum.stdDev.toFixed(3) : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      {isNumeric && sum.min !== undefined ? sum.min.toFixed(2) : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-700 font-semibold">
                      {isNumeric && sum.max !== undefined ? sum.max.toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
              {filteredColumns.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    No variables matched your target filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pearson Correlation Heatmap */}
      {numericColumns.length > 1 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Pearson Correlation Matrix (Linear Strength)</h3>
            <p className="text-xs text-slate-500">
              Quantifies linear relationships between numeric variables. Valued between +1.0 (perfect positive, <span className="text-cyan-700 font-semibold">cyan</span>) to -1.0 (perfect inverse, <span className="text-rose-600 font-semibold">rose</span>).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Heatmap Matrix Display */}
            <div className="lg:col-span-3 overflow-x-auto">
              <div className="min-w-[450px]">
                {/* Horizontal headers */}
                <div className="grid border-b border-rose-50/10 pb-1" style={{ gridTemplateColumns: `120px repeat(${numericColumns.length}, 1fr)` }}>
                  <div className="text-slate-400 text-[10px] font-semibold uppercase self-end">Field Field</div>
                  {numericColumns.map((col, idx) => (
                    <div key={idx} className="text-center font-semibold text-slate-600 text-[10px] uppercase truncate px-1" title={col}>
                      {col}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {numericColumns.map((colA, rIdx) => (
                  <div
                    key={rIdx}
                    className="grid border-b border-slate-50 items-center hover:bg-slate-50/30"
                    style={{ gridTemplateColumns: `120px repeat(${numericColumns.length}, 1fr)` }}
                  >
                    {/* Y Header */}
                    <div className="p-2 font-semibold text-slate-700 text-[10px] uppercase truncate" title={colA}>
                      {colA}
                    </div>

                    {/* Heat cells */}
                    {numericColumns.map((colB, cIdx) => {
                      const corrObj = dataset.correlationMatrix.find(cell => cell.colA === colA && cell.colB === colB);
                      const val = corrObj ? corrObj.value : 0;
                      return (
                        <div
                          key={cIdx}
                          onMouseEnter={() => setHoveredCell({ r: colA, c: colB, v: val })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`p-3 text-center transition-all duration-150 relative cursor-crosshair font-mono font-bold text-xs ${getCellColor(val)}`}
                        >
                          {val.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Helper Insight Board */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Statistical Inspection
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hover over cells to review exact numeric correlation statistics.
                </p>
              </div>

              {hoveredCell ? (
                <div className="p-3 bg-white border border-slate-200 rounded-lg mt-4 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Relationship</span>
                  <div className="font-semibold text-xs text-slate-800 mt-1 truncate">
                    {hoveredCell.r} <br />
                    <span className="text-[10px] font-normal text-slate-400 font-serif">versus</span> <br />
                    {hoveredCell.c}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-mono ${hoveredCell.v > 0 ? "text-cyan-700" : hoveredCell.v < 0 ? "text-rose-600" : "text-slate-500"}`}>
                      {hoveredCell.v > 0 ? "+" : ""}{hoveredCell.v.toFixed(4)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-1">
                    {Math.abs(hoveredCell.v) > 0.7 
                      ? "🔥 Strong Linear Association. Excellent candidate for direct model inclusion." 
                      : Math.abs(hoveredCell.v) > 0.3 
                      ? "📈 Moderate predictive factor." 
                      : "🧊 Negligible correlation. Trees handle beautifully, but regression algorithm may decay weights near 0."}
                  </span>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No cell selected. Move mouse cursor over grid cells to read weights.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center text-slate-400 text-sm">
          A correlation heatmap requires at least 2 numerical features to compute covariance grids. Your dataset has {numericColumns.length} numerical columns.
        </div>
      )}
    </div>
  );
}
