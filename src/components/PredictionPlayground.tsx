/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sliders, HelpCircle, Sparkles, Wand2 } from 'lucide-react';
import { Dataset, ModelResults } from '../types';
import { predictInteractive } from '../ml/models';

interface PredictionPlaygroundProps {
  dataset: Dataset | null;
  trainedModel: ModelResults | null;
}

export default function PredictionPlayground({
  dataset,
  trainedModel,
}: PredictionPlaygroundProps) {
  // Input weights mapped to each available features
  const [inputFields, setInputFields] = useState<Record<string, any>>({});
  const [predictionResult, setPredictionResult] = useState<any>(null);

  // Initialize input parameters with average/mode values on model loaded
  useEffect(() => {
    if (trainedModel && dataset) {
      const initialFields: Record<string, any> = {};
      
      trainedModel.features.forEach(feat => {
        const sum = dataset.summaries[feat];
        if (sum) {
          if (sum.type === 'numeric') {
            initialFields[feat] = sum.median ?? sum.mean ?? 0;
          } else {
            initialFields[feat] = sum.uniqueValues[0] || 'Unknown';
          }
        }
      });
      setInputFields(initialFields);
    }
  }, [trainedModel, dataset]);

  // Compute live inference predictions in real-time on input state changes
  useEffect(() => {
    if (trainedModel && Object.keys(inputFields).length === trainedModel.features.length) {
      try {
        const result = predictInteractive(inputFields, trainedModel);
        setPredictionResult(result);
      } catch (err) {
        console.error("Failed to compile real-time interactive predictions: ", err);
      }
    }
  }, [inputFields, trainedModel]);

  if (!trainedModel || !dataset) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <Wand2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-slate-800 font-semibold mb-1">Prediction Playground Lock</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Please complete training an algorithm in the "Train Model" tab first to unlock this real-time inference playground with sliders.
        </p>
      </div>
    );
  }

  const handleNumericSliderChange = (feat: string, val: number) => {
    setInputFields(prev => ({
      ...prev,
      [feat]: val,
    }));
  };

  const handleCategoricalSelectChange = (feat: string, val: string) => {
    setInputFields(prev => ({
      ...prev,
      [feat]: val,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-indigo-600" />
          Real-Time Predictor Playground
        </h2>
        <p className="text-slate-500 text-sm mt-1 border-b border-slate-100 pb-4">
          Adjust inputs using interactive sliders and select elements to test your compiled training weights and observe inference adjustments instantly.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
          {/* Sliders Input Panel */}
          <div className="lg:col-span-3 space-y-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-slate-400" /> Adjust Covariate Factors
            </span>

            <div className="space-y-4">
              {trainedModel.features.map((feat, idx) => {
                const sum = dataset.summaries[feat];
                const val = inputFields[feat];
                if (!sum || val === undefined) return null;

                const isNumeric = sum.type === 'numeric';

                return (
                  <div key={idx} className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">{feat}</span>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {isNumeric ? Number(val).toFixed(2) : String(val)}
                      </span>
                    </div>

                    {isNumeric ? (
                      <div>
                        <input
                          type="range"
                          min={sum.min ?? 0}
                          max={sum.max ?? 100}
                          step={((sum.max ?? 100) - (sum.min ?? 0)) / 100 || 1}
                          value={val}
                          onChange={(e) => handleNumericSliderChange(feat, Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-ew-resize h-1 bg-slate-200 rounded"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 italic font-mono mt-1">
                          <span>Min: {(sum.min ?? 0).toFixed(1)}</span>
                          <span>Max: {(sum.max ?? 100).toFixed(1)}</span>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={val}
                        onChange={(e) => handleCategoricalSelectChange(feat, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      >
                        {sum.uniqueValues.map((level, lIdx) => (
                          <option key={lIdx} value={level}>{level}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inference Output Frame */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-2xl p-6 text-white text-center shadow-lg border border-indigo-950 h-full flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 shrink-0 opacity-15">
                <Sparkles className="w-24 h-24 text-indigo-400" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block bg-indigo-900/40 w-max mx-auto px-2.5 py-1 rounded-full border border-indigo-800/30">
                  ⚡ Interactive Inference Engine
                </span>
                
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  Predicting objective target condition <br />
                  <span className="font-mono text-white font-bold bg-white/10 px-2 py-0.5 rounded text-xs leading-none mt-1 inline-block">
                    {trainedModel.target}
                  </span>
                </p>
              </div>

              {predictionResult ? (
                <div className="my-8 space-y-4">
                  <span className="text-[10px] text-indigo-300 uppercase tracking-wider block">Model Result Result</span>
                  
                  {/* Regression prediction format */}
                  {trainedModel.type.includes('regressor') || trainedModel.type === 'linear_regression' ? (
                    <div className="text-4xl font-extrabold tracking-tight text-white font-mono">
                      {Number(predictionResult.prediction).toFixed(3)}
                    </div>
                  ) : (
                    /* Classification prediction format */
                    <div className="space-y-4">
                      <div className="text-3xl font-black tracking-tight text-indigo-200 truncate pr-1">
                        {String(predictionResult.prediction)}
                      </div>

                      {/* Display probability percentages bar logic for Logistic Regression */}
                      {predictionResult.probability !== undefined && (
                        <div className="max-w-xs mx-auto space-y-1.5">
                          <div className="flex justify-between text-[10px] text-indigo-300 font-mono">
                            <span>Likelihood class 1/positive:</span>
                            <span className="font-bold">{(predictionResult.probability * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300 shadow-sm"
                              style={{ width: `${predictionResult.probability * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-xs italic my-12">
                  Calculating real-time weights...
                </div>
              )}

              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-left text-[11px] text-slate-300 leading-normal relative">
                <span className="font-semibold text-white block mb-0.5 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> Playground Utility
                </span>
                Changing factors triggers a math loop calculating y = wᵀx + b (linear models) or traversing recursive splits (tree structures) instantly inside your preview frame.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
