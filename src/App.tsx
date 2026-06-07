/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Sigma,
  AreaChart,
  Brain,
  Wand2,
  Cpu,
  FileSpreadsheet,
} from 'lucide-react';
import { Dataset, ModelResults } from './types';
import DataPreprocessing from './components/DataPreprocessing';
import EDAVisualizer from './components/EDAVisualizer';
import ChartExplorer from './components/ChartExplorer';
import ModelTrainer from './components/ModelTrainer';
import PredictionPlayground from './components/PredictionPlayground';

type TabID = 'upload_clean' | 'eda' | 'visualizer' | 'trainer' | 'playground';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabID>('upload_clean');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetName, setDatasetName] = useState<string>('');
  const [trainedModel, setTrainedModel] = useState<ModelResults | null>(null);

  const handleDatasetLoaded = (newDataset: Dataset, name: string) => {
    setDataset(newDataset);
    setDatasetName(name);
    setTrainedModel(null); // Reset trained model when a new dataset is uploaded
    setActiveTab('eda'); // Auto-advance to EDA
  };

  const handleModelTrained = (results: ModelResults) => {
    setTrainedModel(results);
    setActiveTab('trainer'); // Keep on trainer to view metrics first
  };

  const navigationItems = [
    {
      id: 'upload_clean' as TabID,
      title: 'Upload & Clean Data',
      desc: 'Import and sanitize raw CSV rows',
      icon: Database,
      disabled: false,
    },
    {
      id: 'eda' as TabID,
      title: 'Exploratory Analysis (EDA)',
      desc: 'Univariate & correlation statistics',
      icon: Sigma,
      disabled: !dataset,
    },
    {
      id: 'visualizer' as TabID,
      title: 'Visualizer Studio',
      desc: 'Covariate distributions & scatter plots',
      icon: AreaChart,
      disabled: !dataset,
    },
    {
      id: 'trainer' as TabID,
      title: 'Train ML Models',
      desc: 'Optimizers, tree limits & split metrics',
      icon: Brain,
      disabled: !dataset,
    },
    {
      id: 'playground' as TabID,
      title: 'Predictor Playground',
      desc: 'Live continuous sliders inference',
      icon: Wand2,
      disabled: !trainedModel,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 selection:bg-indigo-100 antialiased">
      {/* 1. Sidebar - Left Side */}
      <aside className="w-full md:w-80 bg-slate-900 text-slate-100 flex flex-col justify-between p-6 shrink-0 border-b md:border-b-0 md:border-r border-slate-850 shadow-md">
        <div className="space-y-8">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight uppercase leading-none block">ML Workbench</h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide block mt-1">Version 1.4 · Client-Side AutoML</span>
            </div>
          </div>

          <div className="border-t border-slate-800/60 my-4" />

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && setActiveTab(item.id)}
                  disabled={item.disabled}
                  className={`w-full text-left p-3 rounded-xl flex items-start gap-3.5 transition-all duration-200 ${
                    isActive
                      ? "bg-slate-800 text-white border border-slate-700/50 shadow-sm"
                      : item.disabled
                      ? "opacity-35 cursor-not-allowed"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">{item.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Metadata Status */}
        <div className="mt-8 border-t border-slate-800/60 pt-4 text-[10px] text-slate-500 space-y-2">
          {dataset ? (
            <div className="flex items-center gap-2 bg-slate-805/40 p-2.5 rounded-lg border border-slate-800/50">
              <FileSpreadsheet className="w-4 h-4 text-cyan-500 shrink-0" />
              <div className="truncate">
                <span className="font-bold block text-slate-300 truncate">{datasetName}</span>
                <span className="block">{dataset.cleanedRows.length} preprocessed records</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-800/20 border border-slate-800/40 text-center rounded-lg">
              Pending dataset upload...
            </div>
          )}
          <div className="text-center font-mono">
            Status: System Ready
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace - Right Side */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar headers */}
        <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-8 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Workspace /</span>
            <span className="text-xs font-bold text-slate-700 uppercase bg-slate-100 rounded px-2.5 py-1">
              {navigationItems.find(n => n.id === activeTab)?.title}
            </span>
          </div>

          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" />
            UTC 15:11:53
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'upload_clean' && (
            <DataPreprocessing
              onDatasetLoaded={handleDatasetLoaded}
              loadedDataset={dataset}
              loadedName={datasetName}
            />
          )}

          {activeTab === 'eda' && (
            <EDAVisualizer dataset={dataset} />
          )}

          {activeTab === 'visualizer' && (
            <ChartExplorer
              dataset={dataset}
              modelResults={trainedModel}
              datasetName={datasetName}
            />
          )}

          {activeTab === 'trainer' && (
            <ModelTrainer
              dataset={dataset}
              onModelTrained={handleModelTrained}
              trainedModel={trainedModel}
            />
          )}

          {activeTab === 'playground' && (
            <PredictionPlayground
              dataset={dataset}
              trainedModel={trainedModel}
            />
          )}
        </div>
      </main>
    </div>
  );
}
