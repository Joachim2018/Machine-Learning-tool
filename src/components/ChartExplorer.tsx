/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { BarChart2, TrendingUp, ScatterChart as ScatterIcon, Layers, FileDown, Eye, HelpCircle } from 'lucide-react';
import { Dataset, ModelResults } from '../types';
import { generatePDFReport } from '../utils/pdfGenerator';

interface ChartExplorerProps {
  dataset: Dataset | null;
  modelResults: ModelResults | null;
  datasetName: string;
}

type ChartType = 'bar' | 'line' | 'scatter' | 'histogram';

export default function ChartExplorer({ dataset, modelResults, datasetName }: ChartExplorerProps) {
  const [chartType, setChartType] = useState<ChartType>('scatter');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [colorBy, setColorBy] = useState<string>('');
  const [binCount, setBinCount] = useState<number>(10);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Set default axes based on dataset columns on change
  useMemo(() => {
    if (dataset && dataset.columns.length > 0) {
      const numericCols = dataset.columns.filter(col => dataset.summaries[col]?.type === 'numeric');
      const catCols = dataset.columns.filter(col => dataset.summaries[col]?.type === 'categorical');
      
      setXAxis(numericCols[0] || dataset.columns[0]);
      setYAxis(numericCols[1] || numericCols[0] || dataset.columns[0]);
      setColorBy(catCols[0] || '');
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-slate-800 font-semibold mb-1">Visualizer Studio Inactive</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Please upload or select a dataset under "Upload & Clean" first to unlock plotting capabilities.
        </p>
      </div>
    );
  }

  const columns = dataset.columns;
  const summaries = dataset.summaries;
  const numericColumns = columns.filter(col => summaries[col]?.type === 'numeric');
  const categoricalColumns = columns.filter(col => summaries[col]?.type === 'categorical');

  // Colors scheme for Recharts
  const primaryColors = ['#0e7490', '#4f46e5', '#f59e0b', '#dc2626', '#10b981', '#6366f1', '#64748b'];

  // Histogram computation logic
  const histogramData = useMemo(() => {
    if (chartType !== 'histogram' || !xAxis || !summaries[xAxis]) return [];
    
    const sum = summaries[xAxis];
    if (sum.type !== 'numeric' || sum.min === undefined || sum.max === undefined) return [];

    const min = sum.min;
    const max = sum.max;
    const range = max - min;
    const interval = range / binCount;

    // Initialize bins
    const bins = Array.from({ length: binCount }, (_, i) => {
      const binMin = min + i * interval;
      const binMax = binMin + interval;
      return {
        binIndex: i,
        rangeLabel: `${binMin.toFixed(1)} - ${binMax.toFixed(1)}`,
        binMin,
        binMax,
        count: 0,
      };
    });

    // Count instances in rows
    dataset.cleanedRows.forEach(row => {
      const val = Number(row[xAxis]);
      if (!isNaN(val)) {
        // Find correct bin
        let binIdx = Math.floor((val - min) / interval);
        if (binIdx >= binCount) binIdx = binCount - 1;
        if (binIdx < 0) binIdx = 0;
        bins[binIdx].count++;
      }
    });

    return bins;
  }, [chartType, xAxis, binCount, dataset, summaries]);

  // Scatter & Line Chart coloring group groupings
  const uniqueColorCategories = useMemo(() => {
    if (!colorBy || !summaries[colorBy]) return [];
    return summaries[colorBy].uniqueValues;
  }, [colorBy, summaries]);

  const scatterChartData = useMemo(() => {
    if (chartType !== 'scatter' || !xAxis || !yAxis) return [];
    
    // If colorBy is specified, group the data rows into series
    if (colorBy && uniqueColorCategories.length > 0) {
      return uniqueColorCategories.map(cat => {
        return {
          categoryValue: cat,
          points: dataset.cleanedRows
            .filter(r => String(r[colorBy]) === cat)
            .map(row => ({
              x: Number(row[xAxis]),
              y: Number(row[yAxis]),
              raw: row,
            })),
        };
      });
    }

    // Default return single series
    return [
      {
        categoryValue: 'All Entries',
        points: dataset.cleanedRows.map(row => ({
          x: Number(row[xAxis]),
          y: Number(row[yAxis]),
          raw: row,
        })),
      }
    ];
  }, [chartType, xAxis, yAxis, colorBy, uniqueColorCategories, dataset]);

  // Bar and Line standard plotting series formatted for Recharts
  const sequentialChartData = useMemo(() => {
    if (chartType !== 'bar' && chartType !== 'line') return [];
    
    return dataset.cleanedRows.slice(0, 50).map((row, idx) => ({
      index: idx + 1,
      xLabel: summaries[xAxis]?.type === 'categorical' ? String(row[xAxis]) : `#${idx + 1}`,
      xVal: row[xAxis],
      yVal: Number(row[yAxis]) || 0,
    }));
  }, [chartType, xAxis, yAxis, dataset, summaries]);

  // Download Action for PDF report
  const handleDownloadPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      const doc = generatePDFReport(
        datasetName,
        dataset.rawRows.length,
        dataset.cleanedRows.length,
        dataset.summaries,
        modelResults
      );
      doc.save(`${datasetName.replace(/\.[^/.]+$/, "")}_analytics_profile.pdf`);
      setIsExporting(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Interactive Visualization Studio
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Construct high-fidelity plotting visuals of covariate trends prior to model training split evaluations.
            </p>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            {isExporting ? "Compiling PDF Data..." : "Export PDF Executive Report"}
          </button>
        </div>

        {/* Toolbar controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
          {/* Form fields */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chart Representation</label>
            <div className="flex gap-1 border border-slate-200/60 p-0.5 rounded-lg bg-white">
              <button
                onClick={() => setChartType('scatter')}
                className={`flex-1 flex justify-center py-2 rounded-md ${chartType === 'scatter' ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"}`}
                title="Scatter Plot"
              >
                <ScatterIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`flex-1 flex justify-center py-2 rounded-md ${chartType === 'bar' ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"}`}
                title="Bar Distribution"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`flex-1 flex justify-center py-2 rounded-md ${chartType === 'line' ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"}`}
                title="Line Correlation"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('histogram')}
                className={`flex-1 flex justify-center py-2 rounded-md ${chartType === 'histogram' ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"}`}
                title="Frequency Histogram"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* X Axis */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Select X-Axis {chartType === 'histogram' ? '(Frequency Target)' : ''}
            </label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {chartType === 'bar' || chartType === 'histogram'
                ? columns.map((col, idx) => (
                    <option key={idx} value={col}>
                      {col} ({summaries[col]?.type.toUpperCase()})
                    </option>
                  ))
                : numericColumns.map((col, idx) => (
                    <option key={idx} value={col}>
                      {col}
                    </option>
                  ))}
            </select>
          </div>

          {/* Y Axis */}
          {chartType !== 'histogram' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Y-Axis (Metric value)</label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                {numericColumns.map((col, idx) => (
                  <option key={idx} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grouping colors (Scattered) */}
          {chartType === 'scatter' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Color Cluster Grouping</label>
              <select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="">No Color Clusters</option>
                {categoricalColumns.map((col, idx) => (
                  <option key={idx} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}

          {/* Bin Counts slider (for Histogram) */}
          {chartType === 'histogram' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Histogram Bin Counts ({binCount})</label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={binCount}
                onChange={(e) => setBinCount(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-2.5 cursor-ew-resize"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Plot Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Plot Frame */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[420px] flex flex-col justify-between">
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'scatter' ? (
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={xAxis}
                    label={{ value: xAxis, position: 'bottom', offset: -5, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                    tick={{ fontSize: 9 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={yAxis}
                    label={{ value: yAxis, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                  {scatterChartData.map((series, idx) => (
                    <Scatter
                      key={idx}
                      name={`${colorBy ? colorBy + ' : ' : ''}${series.categoryValue}`}
                      data={series.points}
                      fill={primaryColors[idx % primaryColors.length]}
                    />
                  ))}
                </ScatterChart>
              ) : chartType === 'bar' ? (
                <BarChart data={sequentialChartData} margin={{ top: 20, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="xLabel"
                    tick={{ fontSize: 9 }}
                    label={{ value: xAxis, position: 'bottom', offset: -5, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                  />
                  <YAxis
                    tick={{ fontSize: 9 }}
                    label={{ value: yAxis, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                  />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="yVal" name={yAxis} fill="#0e7490" radius={[4, 4, 0, 0]}>
                    {sequentialChartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={primaryColors[idx % primaryColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={sequentialChartData} margin={{ top: 20, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="xLabel"
                    tick={{ fontSize: 9 }}
                    label={{ value: xAxis, position: 'bottom', offset: -5, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                  />
                  <YAxis
                    tick={{ fontSize: 9 }}
                    label={{ value: yAxis, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                  />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="yVal" name={yAxis} stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={histogramData} margin={{ top: 20, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="rangeLabel"
                    tick={{ fontSize: 9 }}
                    label={{ value: `Value Clusters (${xAxis})`, position: 'bottom', offset: -5, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                  />
                  <YAxis
                    tick={{ fontSize: 9 }}
                    label={{ value: 'Instance Counts', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                  />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Frequency" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual Insights Side panel */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider mb-2 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" /> Plot Trends & Metadata
            </span>
            <div className="space-y-4 text-xs text-slate-500 mt-4 leading-relaxed">
              <div>
                <span className="font-semibold text-slate-700 block text-[11px]">Primary X-Field:</span>
                <span className="font-mono">{xAxis}</span> ({summaries[xAxis]?.type})
              </div>
              {chartType !== 'histogram' && (
                <div>
                  <span className="font-semibold text-slate-700 block text-[11px]">Secondary Y-Field:</span>
                  <span className="font-mono">{yAxis}</span> ({summaries[yAxis]?.type})
                </div>
              )}
              {chartType === 'scatter' && colorBy && (
                <div>
                  <span className="font-semibold text-slate-700 block text-[11px]">Clustered By:</span>
                  <span className="font-mono">{colorBy}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm mt-6">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-300" /> Plot Observations
            </span>
            <span className="text-xs text-slate-600 mt-1.5 block leading-normal">
              {chartType === 'scatter'
                ? `The scatter canvas plots coordinates to reveal groupings. Check if classes separate in clusters — discrete boundaries hint at highly clean classification potential!`
                : chartType === 'histogram'
                ? `Shows distribution dispersion. Check if ${xAxis} is symmetric (normal distribution) or skewed. Skewed profiles might benefit from standard log-preprocessors.`
                : `Sequential pattern visualization of the first 50 records in the preprocessed spreadsheet, plotting indices versus selected magnitudes.`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
