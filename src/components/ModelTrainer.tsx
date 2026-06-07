/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sliders,
  Play,
  Download,
  CheckCircle,
  TrendingDown,
  Info,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Dataset, ModelType, ModelConfig, ModelResults } from '../types';
import { trainModel } from '../ml/models';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ModelTrainerProps {
  dataset: Dataset | null;
  onModelTrained: (results: ModelResults) => void;
  trainedModel: ModelResults | null;
}

export default function ModelTrainer({
  dataset,
  onModelTrained,
  trainedModel,
}: ModelTrainerProps) {
  // Setup forms
  const [targetVar, setTargetVar] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});
  const [algorithm, setAlgorithm] = useState<ModelType>('decision_tree_classifier');
  const [trainRatio, setTrainRatio] = useState<number>(0.8);
  
  // Hyperparameters
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [epochs, setEpochs] = useState<number>(100);
  const [maxDepth, setMaxDepth] = useState<number>(5);
  const [minSamplesSplit, setMinSamplesSplit] = useState<number>(2);

  // States
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingHistory, setTrainingHistory] = useState<{ epoch: number; loss: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default targets and features on dataset loaded
  useEffect(() => {
    if (dataset && dataset.columns.length > 0) {
      const cols = dataset.columns;
      // Set target to last column by default
      const defaultTarget = cols[cols.length - 1];
      setTargetVar(defaultTarget);

      // Turn on all other columns as features by default
      const feats: Record<string, boolean> = {};
      cols.forEach(col => {
        feats[col] = col !== defaultTarget;
      });
      setSelectedFeatures(feats);

      // Auto-negotiate algorithm type based on target datatype
      const targetSum = dataset.summaries[defaultTarget];
      if (targetSum) {
        if (targetSum.type === 'numeric') {
          setAlgorithm('decision_tree_regressor');
        } else {
          setAlgorithm('decision_tree_classifier');
        }
      }
    }
  }, [dataset]);

  // Adjust algorithm on target change
  const handleTargetChange = (val: string) => {
    setTargetVar(val);
    if (!dataset) return;
    
    // Auto-update algorithm category
    const targetSum = dataset.summaries[val];
    if (targetSum) {
      if (targetSum.type === 'numeric') {
        setAlgorithm('decision_tree_regressor');
      } else {
        setAlgorithm('decision_tree_classifier');
      }
    }

    // Toggle target off from features, and restore old targets as features
    setSelectedFeatures(prev => {
      const updated = { ...prev };
      dataset.columns.forEach(col => {
        updated[col] = col !== val;
      });
      return updated;
    });
  };

  if (!dataset) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-slate-800 font-semibold mb-1">Training Hub Inactive</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Please upload or select a cleaned dataset in the "Upload & Clean" panel first to trigger the machine learning setup sequence.
        </p>
      </div>
    );
  }

  const columns = dataset.columns;
  const featuresList = columns.filter(col => col !== targetVar);

  const handleToggleFeature = (col: string) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [col]: !prev[col],
    }));
  };

  const handleSelectAllFeatures = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    featuresList.forEach(col => {
      updated[col] = checked;
    });
    setSelectedFeatures(updated);
  };

  const executeTraining = () => {
    setErrorMsg(null);
    setIsTraining(true);
    setTrainingHistory([]);

    // Collate features list
    const featuresArr = featuresList.filter(f => selectedFeatures[f]);
    if (featuresArr.length === 0) {
      setErrorMsg("Please select at least one input feature variable to train the ML model.");
      setIsTraining(false);
      return;
    }

    const config: ModelConfig = {
      type: algorithm,
      target: targetVar,
      features: featuresArr,
      trainRatio,
      hyperparameters: {
        learningRate,
        epochs,
        maxDepth,
        minSamplesSplit,
      },
    };

    // Since training in javascript is near instant for average size datasets, let's create a beautiful,
    // educational simulated loop for gradient descent models, or just train directly and generate outputs.
    setTimeout(() => {
      try {
        const results = trainModel(dataset.cleanedRows, config);

        if (results.weights?.epochHistory) {
          // Gradient models have epochs history: slow down slightly to animate convergence
          let historyIdx = 0;
          const hist = results.weights.epochHistory;
          const animatedHistory: { epoch: number; loss: number }[] = [];
          
          const interval = setInterval(() => {
            if (historyIdx < hist.length) {
              const recordsLimit = Math.max(1, Math.floor(hist.length / 20)); // show max 20 increments for smoothness
              for (let x = 0; x < recordsLimit && historyIdx < hist.length; x++) {
                animatedHistory.push({
                  epoch: hist[historyIdx].epoch,
                  loss: hist[historyIdx].loss,
                });
                historyIdx++;
              }
              setTrainingHistory([...animatedHistory]);
            } else {
              clearInterval(interval);
              onModelTrained(results);
              setIsTraining(false);
            }
          }, 35);
        } else {
          // Trees train instantly - simulate short progress delay for premium feeling
          setTrainingHistory([
            { epoch: 1, loss: 0.5 },
            { epoch: 2, loss: 0.1 }
          ]);
          onModelTrained(results);
          setIsTraining(false);
        }

      } catch (err: any) {
        setErrorMsg(err.message || "An error occurred during machine learning model training.");
        setIsTraining(false);
      }
    }, 600);
  };

  // Safe file downloads for outputs
  const downloadModelFile = () => {
    if (!trainedModel) return;
    const contents = JSON.stringify(trainedModel, null, 2);
    downloadBlob(contents, `${trainedModel.type}_model_definition.json`, 'application/json');
  };

  const downloadProcessedJSON = () => {
    const contents = JSON.stringify(dataset.cleanedRows, null, 2);
    downloadBlob(contents, "clean_preprocessed_dataset.json", 'application/json');
  };

  const downloadBlob = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to draw deep visual recursive Decision Tree Nodes
  const renderDecisionTreeRules = (node: any, depth = 0): React.ReactNode => {
    if (!node) return null;
    
    // Leaf Node render
    if (node.value !== undefined) {
      return (
        <div className="pl-6 border-l border-slate-100 my-1 py-0.5" key={Math.random()}>
          <span className="text-emerald-700 font-semibold font-mono text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            ➔ Leaf Prediction: {String(node.value)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Samples matching split: {node.samples} (Impurity: {node.impurity.toFixed(3)})
          </span>
        </div>
      );
    }

    return (
      <div className="pl-6 border-l border-indigo-100/60 my-2" key={Math.random()}>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-bold font-mono text-[11px] bg-indigo-50/50 border border-slate-200/40 px-2 py-0.5 rounded">
            🔍 Split on feature [{node.feature}]
          </span>
          <span className="text-[10px] text-slate-400">
            val ≤ {node.threshold.toFixed(3)}
          </span>
        </div>
        <div className="mt-2 space-y-2">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider pl-4">➔ IF Standard {node.feature} ≤ {node.threshold.toFixed(2)}:</div>
          {renderDecisionTreeRules(node.left, depth + 1)}
          
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider pl-4">➔ ELSE (Standard {node.feature} &gt; {node.threshold.toFixed(2)}):</div>
          {renderDecisionTreeRules(node.right, depth + 1)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          Experimental Model Trainer Setup
        </h2>
        <p className="text-slate-500 text-sm mt-1 border-b border-slate-100 pb-4">
          Configure holdout segments, assign labels, select features, and customize parameters to train classical ML models.
        </p>

        {/* Input Parameters Config Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            {/* Target and Algorithm Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target variable (Y)</label>
                <select
                  value={targetVar}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {columns.map((col, idx) => (
                    <option key={idx} value={col}>{col} ({dataset.summaries[col]?.type.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Model Algorithm</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as ModelType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="logistic_regression">Logistic Regression (Binary Classify)</option>
                  <option value="decision_tree_classifier">Decision Tree Classifier (Classification)</option>
                  <option value="linear_regression">Linear Regression (Scoring Regressor)</option>
                  <option value="decision_tree_regressor">Decision Tree Regressor (Score Splits)</option>
                </select>
              </div>
            </div>

            {/* Split Settings */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Train / Test Split Holdout Ratio</label>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {(trainRatio * 100).toFixed(0)}% Train / {((1 - trainRatio) * 100).toFixed(0)}% Test
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.05"
                value={trainRatio}
                onChange={(e) => setTrainRatio(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-ew-resize h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
              <p className="text-[10px] text-slate-400 leading-none mt-1.5">
                Splitting holdouts cleanly isolates validation items to verify the trained models' generalization.
              </p>
            </div>

            {/* Expandable hyperparameters tuning card */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-3">
                <Sliders className="w-3.5 h-3.5 text-slate-400" /> Advanced Hyperparameters Tuning
              </span>

              {(algorithm === 'logistic_regression' || algorithm === 'linear_regression') ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Learning Rate (α)</label>
                    <select
                      value={learningRate}
                      onChange={(e) => setLearningRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                    >
                      <option value="0.01">0.01 (Stable / Slow)</option>
                      <option value="0.05">0.05 (Default)</option>
                      <option value="0.1">0.10 (Standard)</option>
                      <option value="0.3">0.30 (Aggressive)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max GD Training Epochs</label>
                    <select
                      value={epochs}
                      onChange={(e) => setEpochs(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                    >
                      <option value="50">50 Epochs</option>
                      <option value="100">100 Epochs</option>
                      <option value="200">200 Epochs</option>
                      <option value="500">500 Epochs</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max Deep Branches</label>
                    <select
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                    >
                      <option value="3">3 Layers Max (Visual)</option>
                      <option value="5">5 Layers (Accurate)</option>
                      <option value="8">8 Layers (Deeper split)</option>
                      <option value="12">12 Layers Max</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min split threshold bounds</label>
                    <select
                      value={minSamplesSplit}
                      onChange={(e) => setMinSamplesSplit(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                    >
                      <option value="2">2 samples</option>
                      <option value="5">5 samples (Avoid Overfit)</option>
                      <option value="10">10 samples</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feature variables selector List */}
          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Features Variables Selection (X)</span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    id="selectAll"
                    onChange={(e) => handleSelectAllFeatures(e.target.checked)}
                    checked={featuresList.every(f => selectedFeatures[f])}
                    className="cursor-pointer font-sans"
                  />
                  <label htmlFor="selectAll" className="cursor-pointer font-sans">Toggle All</label>
                </div>
              </div>

              <div className="space-y-1.5 h-44 overflow-y-auto pr-1 border border-slate-200/50 p-2.5 rounded-lg bg-white">
                {featuresList.map((col, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleToggleFeature(col)}
                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer select-none transition-all ${
                      selectedFeatures[col]
                        ? "bg-indigo-50 border-indigo-100 text-indigo-950 font-medium"
                        : "bg-slate-50/55 border-slate-100 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <span>{col}</span>
                    <span className="font-mono text-[9px] uppercase font-semibold text-slate-400">
                      {dataset.summaries[col]?.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action launcher */}
            <div className="pt-4 border-t border-slate-200/50 mt-4 flex gap-4">
              <button
                onClick={executeTraining}
                disabled={isTraining}
                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                {isTraining ? "Training algorithm on holdouts..." : "Train ML Model"}
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-sm">
            ❌ {errorMsg}
          </div>
        )}
      </div>

      {/* GD Loss Convergence Canvas (only visible when training) */}
      {isTraining && trainingHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-indigo-600 animate-pulse" /> Gradient Descent Loss Convergence
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="epoch" tick={{ fontSize: 9 }} name="Epoch" />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="loss" stroke="#312e81" strokeWidth={1.5} dot={false} name="Loss/MSE" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Model Evaluation Metrics Report */}
      {trainedModel && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 animate-pulse">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Evaluated Model Successfully!</h3>
                  <p className="text-xs text-slate-400">
                    Model: {trainedModel.type.toUpperCase().replace(/_/g, ' ')} | Targets: {trainedModel.target}
                  </p>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadModelFile}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Model (.json)
                </button>
                <button
                  onClick={downloadProcessedJSON}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Processed Data (.json)
                </button>
              </div>
            </div>

            {/* Display evaluation matrix metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              {trainedModel.isClassification ? (
                <>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Overall Accuracy</span>
                    <span className="text-3xl font-extrabold text-slate-800 font-mono mt-2 block">
                      {(trainedModel.classificationMetrics!.accuracy * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Precision Score (PPV)</span>
                    <span className="text-3xl font-extrabold text-slate-800 font-mono mt-2 block">
                      {(trainedModel.classificationMetrics!.precision * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Recall (Sensitivity)</span>
                    <span className="text-3xl font-extrabold text-slate-800 font-mono mt-2 block">
                      {(trainedModel.classificationMetrics!.recall * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">F1-Score Harmonic</span>
                    <span className="text-3xl font-extrabold text-slate-800 font-mono mt-2 block">
                      {(trainedModel.classificationMetrics!.f1Score * 100).toFixed(2)}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mean Squared Error (MSE)</span>
                    <span className="text-2xl font-extrabold text-slate-800 font-mono mt-2.5 block">
                      {trainedModel.regressionMetrics!.mse.toFixed(4)}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Root MSE (RMSE)</span>
                    <span className="text-2xl font-extrabold text-slate-800 font-mono mt-2.5 block">
                      {trainedModel.regressionMetrics!.rmse.toFixed(4)}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mean Absolute Error (MAE)</span>
                    <span className="text-2xl font-extrabold text-slate-800 font-mono mt-2.5 block">
                      {trainedModel.regressionMetrics!.mae.toFixed(4)}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">R² (Explained Variance)</span>
                    <span className="text-xl font-extrabold text-indigo-700 font-mono mt-3 block">
                      {(trainedModel.regressionMetrics!.r2 * 100).toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Classification Confusion Matrix */}
            {trainedModel.isClassification && trainedModel.classificationMetrics && (
              <div className="mt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-300" /> Holdout Confusion Matrix
                </span>
                <div className="grid grid-cols-3 max-w-md border border-slate-150 rounded-lg overflow-hidden divide-y divide-x divide-slate-100 text-center text-xs mt-2">
                  <div className="p-3 bg-slate-55/70 font-semibold text-slate-400">Confusion Matrix</div>
                  <div className="p-3 bg-slate-50 font-semibold text-slate-600">Predicted Positive</div>
                  <div className="p-3 bg-slate-50 font-semibold text-slate-600">Predicted Negative</div>

                  <div className="p-3 bg-slate-50 font-semibold text-slate-650">Actual Positive</div>
                  <div className="p-3 bg-white font-mono font-bold text-emerald-700">
                    TP: {trainedModel.classificationMetrics.confusionMatrix.truePositive}
                  </div>
                  <div className="p-3 bg-white font-mono font-bold text-rose-600">
                    FN: {trainedModel.classificationMetrics.confusionMatrix.falseNegative}
                  </div>

                  <div className="p-3 bg-slate-50 font-semibold text-slate-650">Actual Negative</div>
                  <div className="p-3 bg-white font-mono font-bold text-rose-600">
                    FP: {trainedModel.classificationMetrics.confusionMatrix.falsePositive}
                  </div>
                  <div className="p-3 bg-white font-mono font-bold text-slate-700">
                    TN: {trainedModel.classificationMetrics.confusionMatrix.trueNegative}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Model Weights coefficients or Tree Inspector Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-4 font-sans">
              <Sliders className="w-4 h-4 text-slate-400" />
              Model Interior Inspection & Weights Weights
            </h3>

            {trainedModel.treeRoot ? (
              <div className="border border-slate-200/50 p-4 rounded-xl bg-slate-50/20 max-h-[400px] overflow-y-auto">
                <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5 italic font-sans">
                  The Decision Tree splits variables by Gini Gain (Classification) or Variance reduction (Regression) thresholds.
                </p>
                {renderDecisionTreeRules(trainedModel.treeRoot)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Coefficients chart bar list */}
                <div className="md:col-span-3 space-y-3">
                  <div className="flex justify-between font-semibold text-[10px] text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    <span>Active Feature (Scale Adjusted)</span>
                    <span>Coefficient Coefficient Weight</span>
                  </div>
                  
                  {/* Intercept Row */}
                  <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded font-mono text-xs">
                    <span className="font-semibold text-slate-600">(Bias/Intercept)</span>
                    <span className="font-bold text-slate-800">{trainedModel.weights?.intercept.toFixed(4)}</span>
                  </div>

                  {Object.entries(trainedModel.weights?.coefficients || {}).map(([name, weight], idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 font-mono text-xs hover:bg-slate-50/10">
                      <span className="font-sans text-slate-705 font-medium">{name}</span>
                      <div className="flex items-center gap-3">
                        {/* Coefficient magnitude indicator */}
                        <div className="w-24 bg-slate-100 h-2 rounded overflow-hidden hidden sm:block">
                          <div
                            className={`h-full ${weight >= 0 ? "bg-cyan-600" : "bg-rose-500"}`}
                            style={{ width: `${Math.min(100, Math.abs(weight) * 35)}%` }}
                          />
                        </div>
                        <span className={`font-bold ${weight >= 0 ? "text-cyan-700" : "text-rose-600"}`}>
                          {weight >= 0 ? "+" : ""}{weight.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Insight side */}
                <div className="bg-slate-50/70 shrink-0 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Coeff Parameters Guidance
                    </span>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Linear coefficients signify directional weights.
                    </p>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      A <span className="text-cyan-600 font-semibold">Positive</span> weight indicates that larger scores increase predictions.
                    </p>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      A <span className="text-rose-500 font-semibold">Negative</span> weight forces the prediction down.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
