/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DataType = 'numeric' | 'categorical';

export interface ColumnSummary {
  name: string;
  type: DataType;
  missingCount: number;
  uniqueValues: string[];
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stdDev?: number;
}

export interface CorrelationRow {
  colA: string;
  colB: string;
  value: number;
}

export interface Dataset {
  rawRows: Record<string, any>[];
  cleanedRows: Record<string, any>[];
  columns: string[];
  summaries: Record<string, ColumnSummary>;
  correlationMatrix: CorrelationRow[];
}

export type ModelType = 
  | 'logistic_regression' 
  | 'decision_tree_classifier' 
  | 'linear_regression' 
  | 'decision_tree_regressor';

export interface ModelConfig {
  type: ModelType;
  target: string;
  features: string[];
  trainRatio: number; // e.g. 0.8
  hyperparameters: {
    learningRate?: number;
    epochs?: number;
    maxDepth?: number;
    minSamplesSplit?: number;
  };
}

export interface ConfusionMatrix {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: ConfusionMatrix;
}

export interface RegressionMetrics {
  mse: number;
  rmse: number;
  mae: number;
  r2: number;
}

export interface LogisticRegressionWeights {
  coefficients: Record<string, number>;
  intercept: number;
  epochHistory: { epoch: number; loss: number; accuracy?: number }[];
}

export interface TreeNode {
  feature?: string;
  threshold?: number;
  isCategorical?: boolean;
  left?: TreeNode;
  right?: TreeNode;
  value?: any; // predicted class or value
  impurity?: number;
  samples?: number;
}

export interface ModelResults {
  config: ModelConfig;
  features: string[];
  target: string;
  type: ModelType;
  isClassification: boolean;
  classificationMetrics?: ClassificationMetrics;
  regressionMetrics?: RegressionMetrics;
  weights?: LogisticRegressionWeights; // for logistic/linear regression
  treeRoot?: TreeNode; // for decision tree
  featureImportances: Record<string, number>;
  testPredictions: {
    actual: any;
    predicted: any;
    features: Record<string, any>;
  }[];
  categoryMapping: Record<string, string[]>; // categorical values encoded
  means: Record<string, number>; // for standardization
  stdDevs: Record<string, number>; // for standardization
}
