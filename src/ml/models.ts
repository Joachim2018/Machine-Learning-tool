/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ModelType,
  ModelConfig,
  ModelResults,
  ClassificationMetrics,
  RegressionMetrics,
  TreeNode,
  ConfusionMatrix,
} from '../types';

// Helper: Sigmoid function for logistic regression
const sigmoid = (z: number): number => {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));
};

// Helper: Shuffler
function shuffleArray<T>(array: T[], seed: number = 42): T[] {
  const shuffled = [...array];
  let m = shuffled.length, t, i;
  // Simple LCG pseudo-random generator for reproducible split
  let random = seed;
  const rand = () => {
    random = (random * 1664525 + 1013904223) % 4294967296;
    return random / 4294967296;
  };

  while (m) {
    i = Math.floor(rand() * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
  }
  return shuffled;
}

// Helper: Calculate Gini Impurity for classification split
function calculateGini(labels: any[]): number {
  if (labels.length === 0) return 0;
  const counts: Record<any, number> = {};
  for (const label of labels) {
    counts[label] = (counts[label] || 0) + 1;
  }
  let sumSquaredProb = 0;
  for (const key in counts) {
    const prob = counts[key] / labels.length;
    sumSquaredProb += prob * prob;
  }
  return 1 - sumSquaredProb;
}

// Helper: Calculate Variance for regression split
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) * (v - mean));
  return sqDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

// Encode categorical values using one-hot mapping
export function buildOneHotMapping(
  rows: Record<string, any>[],
  features: string[]
): Record<string, string[]> {
  const mapping: Record<string, string[]> = {};
  for (const feat of features) {
    const uniqueVals = new Set<string>();
    for (const r of rows) {
      const val = r[feat];
      if (val !== undefined && val !== null) {
        // Detect if column behaves categorically (e.g., string/boolean or numeric with low unique entries)
        const strVal = String(val);
        uniqueVals.add(strVal);
      }
    }
    mapping[feat] = Array.from(uniqueVals).sort();
  }
  return mapping;
}

// Transform a row into numerical feature vector using one-hot or numerical passthrough
export function rowToVector(
  row: Record<string, any>,
  features: string[],
  categoryMapping: Record<string, string[]>,
  means: Record<string, number>,
  stdDevs: Record<string, number>,
  standardize: boolean = true
): number[] {
  const vector: number[] = [];
  for (const feat of features) {
    const val = row[feat];
    const isCat = categoryMapping[feat] && categoryMapping[feat].length > 0;
    
    if (isCat) {
      // One-hot encode: add columns for ALL categories except the last to avoid multicollinearity,
      // or simply add 1-hot columns for all. In interactive ML, 1-hot for all categories is much simpler,
      // and gradient descent with normalization handles it beautifully!
      const cats = categoryMapping[feat];
      const activeStr = String(val);
      for (const cat of cats) {
        vector.push(activeStr === cat ? 1 : 0);
      }
    } else {
      // Numeric value
      let numericVal = Number(val);
      if (isNaN(numericVal)) numericVal = 0;
      
      if (standardize) {
        const mean = means[feat] ?? 0;
        const std = stdDevs[feat] || 1;
        vector.push((numericVal - mean) / std);
      } else {
        vector.push(numericVal);
      }
    }
  }
  return vector;
}

// Get expanded feature names (including one-hot variants)
export function getExpandedFeatureNames(
  features: string[],
  categoryMapping: Record<string, string[]>
): string[] {
  const names: string[] = [];
  for (const feat of features) {
    const cats = categoryMapping[feat];
    if (cats && cats.length > 0) {
      for (const cat of cats) {
        names.push(`${feat} = ${cat}`);
      }
    } else {
      names.push(feat);
    }
  }
  return names;
}

// Core Trainer Function
export function trainModel(
  cleanedRows: Record<string, any>[],
  config: ModelConfig
): ModelResults {
  const { type, target, features, trainRatio, hyperparameters } = config;
  
  // 1. Establish classification vs regression and determine categories
  const isClassification = 
    type === 'logistic_regression' || type === 'decision_tree_classifier';
    
  // Find target values
  const targetValues = cleanedRows.map(r => r[target]);
  const uniqueTargets = Array.from(new Set(targetValues));

  // Determine standard categories for categorical variables
  // A variable is categorical if its metadata type is categorical (which we will pass down or determine)
  // Let's determine types based on checking if values are numbers or strings
  const columnTypes: Record<string, 'numeric' | 'categorical'> = {};
  const allCols = [...features, target];
  for (const col of allCols) {
    const numericVals = cleanedRows
      .map(r => Number(r[col]))
      .filter(v => !isNaN(v));
    const isNumeric = numericVals.length > 0.5 * cleanedRows.length; // mostly numeric
    columnTypes[col] = isNumeric ? 'numeric' : 'categorical';
  }

  // Create mappings for categorical features in inputs
  const categoricalInputs = features.filter(f => columnTypes[f] === 'categorical');
  const categoryMapping = buildOneHotMapping(cleanedRows, categoricalInputs);

  // 2. Map Target Variable
  let targetClassList: any[] = [];
  let numTargetRows = targetValues;
  if (isClassification) {
    // Collect classes
    targetClassList = Array.from(new Set(targetValues.map(v => String(v)))).sort();
    if (type === 'logistic_regression' && targetClassList.length > 2) {
      throw new Error('Logistic Regression only supports binary classification. Please choose a target with exactly 2 classes, or use Decision Tree Classifier.');
    }
  }

  // 3. Train / Test Split
  // Shuffle rows with standard seed for reproducible split
  const shuffledRows = shuffleArray(cleanedRows, 1337);
  const splitIndex = Math.floor(shuffledRows.length * trainRatio);
  const trainRows = shuffledRows.slice(0, splitIndex);
  const testRows = shuffledRows.slice(splitIndex);

  if (trainRows.length === 0 || testRows.length === 0) {
    throw new Error('Dataset is too small to perform a split with the given train ratio.');
  }

  // 4. Calculate stats (mean, stdDev) on Training dataset only (prevents data leakage!)
  const means: Record<string, number> = {};
  const stdDevs: Record<string, number> = {};
  for (const feat of features) {
    if (columnTypes[feat] === 'numeric') {
      const vals = trainRows.map(r => Number(r[feat])).filter(v => !isNaN(v));
      if (vals.length > 0) {
        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = sum / vals.length;
        const sqDiffs = vals.map(v => (v - mean) * (v - mean));
        const variance = sqDiffs.reduce((a, b) => a + b, 0) / vals.length;
        const std = Math.sqrt(variance) || 1e-5; // avoid division by 0
        means[feat] = mean;
        stdDevs[feat] = std;
      } else {
        means[feat] = 0;
        stdDevs[feat] = 1;
      }
    }
  }

  // Define vector mapping configs
  // Trees don't require standardization but work fine with it. Let's standardize only for regression gradient models (Logistic/Linear).
  const isGradientModel = type === 'logistic_regression' || type === 'linear_regression';
  const standardize = isGradientModel;

  // Process features into standard numerical matrices
  const X_train = trainRows.map(r => rowToVector(r, features, categoryMapping, means, stdDevs, standardize));
  const X_test = testRows.map(r => rowToVector(r, features, categoryMapping, means, stdDevs, standardize));

  const expandedFeatureNames = getExpandedFeatureNames(features, categoryMapping);
  const numFeaturesExpanded = expandedFeatureNames.length;

  // Track important outputs
  let finalWeights: Record<string, number> = {};
  let finalIntercept = 0;
  let epochHistory: { epoch: number; loss: number; accuracy?: number }[] = [];
  let treeRoot: TreeNode | undefined = undefined;
  const featureImportances: Record<string, number> = {};
  
  // Initialize importance track
  for (const x of expandedFeatureNames) featureImportances[x] = 0;

  // ----------------------------------------------------
  // TRAIN MODEL
  // ----------------------------------------------------

  if (type === 'logistic_regression') {
    // Binary Classification target values mapped to 0 and 1
    // Class 1 = second class in sorted classes, Class 0 = first class
    const positiveClass = targetClassList[1] ?? '1';
    const negativeClass = targetClassList[0] ?? '0';

    const y_train = trainRows.map(r => String(r[target]) === positiveClass ? 1 : 0);
    const y_test = testRows.map(r => String(r[target]) === positiveClass ? 1 : 0);

    // Hyperparameters
    const lr = hyperparameters.learningRate ?? 0.1;
    const epochs = hyperparameters.epochs ?? 100;

    // Weights & bias initialization (zeros)
    const weights = new Array(numFeaturesExpanded).fill(0);
    let bias = 0;

    for (let ep = 1; ep <= epochs; ep++) {
      let gradW = new Array(numFeaturesExpanded).fill(0);
      let gradB = 0;
      let totalLoss = 0;
      let trainCorrect = 0;

      for (let i = 0; i < X_train.length; i++) {
        const xi = X_train[i];
        const yi = y_train[i];

        // Linear combination
        let z = bias;
        for (let f = 0; f < numFeaturesExpanded; f++) {
          z += xi[f] * weights[f];
        }

        const pred = sigmoid(z);
        
        // Log loss sum
        const valLoss = - (yi * Math.log(Math.max(1e-15, pred)) + (1 - yi) * Math.log(Math.max(1e-15, 1 - pred)));
        totalLoss += valLoss;

        if ((pred >= 0.5 ? 1 : 0) === yi) {
          trainCorrect++;
        }

        // Gradients calculation
        const error = pred - yi;
        for (let f = 0; f < numFeaturesExpanded; f++) {
          gradW[f] += error * xi[f];
        }
        gradB += error;
      }

      // Average gradients and apply updates with small weight decay to prevent overfitting
      const lambda = 0.01; // L2 regularizer
      for (let f = 0; f < numFeaturesExpanded; f++) {
        gradW[f] /= X_train.length;
        // GD Update
        weights[f] -= lr * (gradW[f] + lambda * weights[f]);
      }
      gradB /= X_train.length;
      bias -= lr * gradB;

      // Log progress
      const avgLoss = totalLoss / X_train.length;
      const accuracy = trainCorrect / X_train.length;
      epochHistory.push({ epoch: ep, loss: avgLoss, accuracy });
    }

    // Set outputs
    expandedFeatureNames.forEach((name, idx) => {
      finalWeights[name] = weights[idx];
      // For binary classification, coefficients are proportional to magnitude of correlation
      featureImportances[name] = Math.abs(weights[idx]);
    });
    finalIntercept = bias;

  } else if (type === 'linear_regression') {
    // Mean Squared Error Regression
    const y_train = trainRows.map(r => Number(r[target]));
    const y_test = testRows.map(r => Number(r[target]));

    // Hyperparameters
    const lr = hyperparameters.learningRate ?? 0.05;
    const epochs = hyperparameters.epochs ?? 100;

    // Weights & bias initialization
    const weights = new Array(numFeaturesExpanded).fill(0);
    let bias = y_train.reduce((a, b) => a + b, 0) / y_train.length; // start bias at average Y

    for (let ep = 1; ep <= epochs; ep++) {
      let gradW = new Array(numFeaturesExpanded).fill(0);
      let gradB = 0;
      let totalLoss = 0;

      for (let i = 0; i < X_train.length; i++) {
        const xi = X_train[i];
        const yi = y_train[i];

        // Linear prediction
        let pred = bias;
        for (let f = 0; f < numFeaturesExpanded; f++) {
          pred += xi[f] * weights[f];
        }

        const error = pred - yi;
        totalLoss += 0.5 * error * error;

        // Gradients
        for (let f = 0; f < numFeaturesExpanded; f++) {
          gradW[f] += error * xi[f];
        }
        gradB += error;
      }

      // Update Weights
      const lambda = 0.01; // L2 Ridge regularization
      for (let f = 0; f < numFeaturesExpanded; f++) {
        gradW[f] /= X_train.length;
        weights[f] -= lr * (gradW[f] + lambda * weights[f]);
      }
      gradB /= X_train.length;
      bias -= lr * gradB;

      const avgLoss = totalLoss / X_train.length;
      epochHistory.push({ epoch: ep, loss: avgLoss });
    }

    // Set Weights
    expandedFeatureNames.forEach((name, idx) => {
      finalWeights[name] = weights[idx];
      featureImportances[name] = Math.abs(weights[idx]);
    });
    finalIntercept = bias;

  } else if (type === 'decision_tree_classifier' || type === 'decision_tree_regressor') {
    // Recursive Decision Tree construction
    const maxDepth = hyperparameters.maxDepth ?? 5;
    const minSamplesSplit = hyperparameters.minSamplesSplit ?? 2;

    // We can work directly with the clean dataset values, but representing as vectors makes recursive splits easier.
    // Rather than dealing with raw strings, let's keep track of original row indices.
    interface TreeDataPoint {
      features: number[]; // original standardized/encoded vector
      originalRow: Record<string, any>;
      label: any; // regression or classification value
    }

    const initialData: TreeDataPoint[] = trainRows.map((row, rIdx) => ({
      features: X_train[rIdx],
      originalRow: row,
      label: isClassification ? String(row[target]) : Number(row[target]),
    }));

    // Recursive split function
    const buildTree = (
      dataPoints: TreeDataPoint[],
      currentDepth: number
    ): TreeNode => {
      const numSamples = dataPoints.length;
      
      // Calculate impurity of current node
      const currentImpurity = isClassification 
        ? calculateGini(dataPoints.map(p => p.label))
        : calculateVariance(dataPoints.map(p => p.label));

      // Terminal leaf checks
      if (
        currentDepth >= maxDepth ||
        numSamples < minSamplesSplit ||
        currentImpurity === 0
      ) {
        return createLeafNode(dataPoints, isClassification, currentImpurity, numSamples);
      }

      // Find best split
      let bestGain = -1;
      let bestFeatureIdx = -1;
      let bestThreshold = 0;
      let bestLeftData: TreeDataPoint[] = [];
      let bestRightData: TreeDataPoint[] = [];

      for (let fIdx = 0; fIdx < numFeaturesExpanded; fIdx++) {
        const sortedPoints = [...dataPoints].sort(
          (a, b) => a.features[fIdx] - b.features[fIdx]
        );
        
        // Test splits between adjacent values
        for (let i = 0; i < sortedPoints.length - 1; i++) {
          if (sortedPoints[i].features[fIdx] === sortedPoints[i + 1].features[fIdx]) {
            continue; // Skip identical values
          }

          const threshold = (sortedPoints[i].features[fIdx] + sortedPoints[i + 1].features[fIdx]) / 2;
          
          const left = sortedPoints.filter(p => p.features[fIdx] <= threshold);
          const right = sortedPoints.filter(p => p.features[fIdx] > threshold);

          if (left.length === 0 || right.length === 0) continue;

          // Calculate information gain / variance reduction
          const leftImp = isClassification
            ? calculateGini(left.map(p => p.label))
            : calculateVariance(left.map(p => p.label));
          const rightImp = isClassification
            ? calculateGini(right.map(p => p.label))
            : calculateVariance(right.map(p => p.label));

          const weightedChildImp = (left.length / numSamples) * leftImp + (right.length / numSamples) * rightImp;
          const gain = currentImpurity - weightedChildImp;

          if (gain > bestGain) {
            bestGain = gain;
            bestFeatureIdx = fIdx;
            bestThreshold = threshold;
            bestLeftData = left;
            bestRightData = right;
          }
        }
      }

      // If no gain was achieved, return leaf
      if (bestGain <= 0 || bestFeatureIdx === -1) {
        return createLeafNode(dataPoints, isClassification, currentImpurity, numSamples);
      }

      // Log feature importance using proportional weighted gain
      const featName = expandedFeatureNames[bestFeatureIdx];
      featureImportances[featName] = (featureImportances[featName] || 0) + (bestGain * numSamples);

      // Recursive build
      return {
        feature: featName,
        threshold: bestThreshold,
        impurity: currentImpurity,
        samples: numSamples,
        left: buildTree(bestLeftData, currentDepth + 1),
        right: buildTree(bestRightData, currentDepth + 1),
      };
    };

    const createLeafNode = (
      points: TreeDataPoint[],
      isClass: boolean,
      impurity: number,
      samples: number
    ): TreeNode => {
      if (isClass) {
        // Vote majority
        const votes: Record<string, number> = {};
        for (const p of points) {
          votes[p.label] = (votes[p.label] || 0) + 1;
        }
        let bestLabel = '';
        let maxVotes = -1;
        for (const label in votes) {
          if (votes[label] > maxVotes) {
            maxVotes = votes[label];
            bestLabel = label;
          }
        }
        return { value: bestLabel, impurity, samples };
      } else {
        // Average Y
        const avg = points.reduce((sum, p) => sum + p.label, 0) / points.length;
        return { value: avg, impurity, samples };
      }
    };

    treeRoot = buildTree(initialData, 0);

    // Normalize feature importances so they sum to 1
    const totalImportance = Object.values(featureImportances).reduce((a, b) => a + b, 0);
    if (totalImportance > 0) {
      for (const key in featureImportances) {
        featureImportances[key] = featureImportances[key] / totalImportance;
      }
    }
  }

  // ----------------------------------------------------
  // PREDICT & EVALUATE ON TEST SET
  // ----------------------------------------------------

  const predictRowVector = (vector: number[]): any => {
    if (type === 'logistic_regression') {
      let z = finalIntercept;
      for (let f = 0; f < numFeaturesExpanded; f++) {
        z += vector[f] * (finalWeights[expandedFeatureNames[f]] ?? 0);
      }
      const prob = sigmoid(z);
      // Map back to class (0 = first target class, 1 = second, usually sorted alphabetically / numerically)
      return prob >= 0.5 ? (targetClassList[1] ?? '1') : (targetClassList[0] ?? '0');
    } else if (type === 'linear_regression') {
      let pred = finalIntercept;
      for (let f = 0; f < numFeaturesExpanded; f++) {
        pred += vector[f] * (finalWeights[expandedFeatureNames[f]] ?? 0);
      }
      return pred;
    } else {
      // Decision Tree Prediction
      const traverse = (node: TreeNode, vec: number[]): any => {
        if (node.value !== undefined) {
          return node.value;
        }
        if (!node.feature) return null;
        
        // Find feature index
        const featIdx = expandedFeatureNames.indexOf(node.feature);
        if (featIdx === -1) return null;

        const val = vec[featIdx];
        if (val <= (node.threshold ?? 0)) {
          return traverse(node.left!, vec);
        } else {
          return traverse(node.right!, vec);
        }
      };

      return traverse(treeRoot!, vector);
    }
  };

  const testPredictions = testRows.map((row, idx) => {
    const vector = X_test[idx];
    const predicted = predictRowVector(vector);
    const actual = isClassification ? String(row[target]) : Number(row[target]);
    return {
      actual,
      predicted,
      features: row,
    };
  });

  // Calculate Evaluation Metrics
  let classificationMetrics: ClassificationMetrics | undefined = undefined;
  let regressionMetrics: RegressionMetrics | undefined = undefined;

  if (isClassification) {
    const positiveClass = targetClassList[1] ?? '1';
    
    // Confusion Matrix calculation
    let tp = 0; // predicted positive, actual positive
    let fp = 0; // predicted positive, actual negative
    let tn = 0; // predicted negative, actual negative
    let fn = 0; // predicted negative, actual positive
    let correct = 0;

    for (const predObj of testPredictions) {
      const actStr = String(predObj.actual);
      const predStr = String(predObj.predicted);

      if (actStr === predStr) {
        correct++;
      }

      if (predStr === positiveClass) {
        if (actStr === positiveClass) {
          tp++;
        } else {
          fp++;
        }
      } else {
        if (actStr === positiveClass) {
          fn++;
        } else {
          tn++;
        }
      }
    }

    const accuracy = correct / testPredictions.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    classificationMetrics = {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: {
        truePositive: tp,
        falsePositive: fp,
        trueNegative: tn,
        falseNegative: fn,
      },
    };
  } else {
    // Regression Metrics
    let sumSqErr = 0;
    let sumAbsErr = 0;
    const y_values = testPredictions.map(p => Number(p.actual));
    const meanY = y_values.reduce((a, b) => a + b, 0) / y_values.length;
    let sumSqTotal = 0;

    for (const predObj of testPredictions) {
      const act = Number(predObj.actual);
      const pred = Number(predObj.predicted);
      const err = pred - act;
      
      sumSqErr += err * err;
      sumAbsErr += Math.abs(err);
      
      const totDiff = act - meanY;
      sumSqTotal += totDiff * totDiff;
    }

    const mse = sumSqErr / testPredictions.length;
    const rmse = Math.sqrt(mse);
    const mae = sumAbsErr / testPredictions.length;
    const r2 = sumSqTotal > 0 ? 1 - (sumSqErr / sumSqTotal) : 1;

    regressionMetrics = {
      mse,
      rmse,
      mae,
      r2,
    };
  }

  // Pack and return results
  return {
    config,
    features,
    target,
    type,
    isClassification,
    classificationMetrics,
    regressionMetrics,
    weights: type === 'logistic_regression' || type === 'linear_regression' 
      ? { coefficients: finalWeights, intercept: finalIntercept, epochHistory } 
      : undefined,
    treeRoot,
    featureImportances,
    testPredictions,
    categoryMapping,
    means,
    stdDevs,
  };
}

// Predictor helper for deployed model inference
export function predictInteractive(
  row: Record<string, any>,
  model: ModelResults
): any {
  const { features, categoryMapping, means, stdDevs, isClassification, type, weights, treeRoot } = model;
  
  const isGradientModel = type === 'logistic_regression' || type === 'linear_regression';
  const standardize = isGradientModel;

  const vector = rowToVector(row, features, categoryMapping, means, stdDevs, standardize);
  const expandedNames = getExpandedFeatureNames(features, categoryMapping);
  
  if (type === 'logistic_regression') {
    let z = weights?.intercept ?? 0;
    for (let f = 0; f < expandedNames.length; f++) {
      z += vector[f] * (weights?.coefficients[expandedNames[f]] ?? 0);
    }
    const prob = sigmoid(z);
    
    // Categorical variables list
    const classes = Object.keys(means).length === 0 ? ['0', '1'] : undefined; // fallback classes
    // We can reconstruct binary decision targets based on positive/negative categories
    // For predictions, we map >= 0.5 to Class 1, < 0.5 to Class 0
    return {
      prediction: prob >= 0.5 ? 'Positive/Class 1' : 'Negative/Class 0', // fallback, let's map it dynamically if we have classes
      probability: prob,
    };
  } else if (type === 'linear_regression') {
    let pred = weights?.intercept ?? 0;
    for (let f = 0; f < expandedNames.length; f++) {
      pred += vector[f] * (weights?.coefficients[expandedNames[f]] ?? 0);
    }
    return {
      prediction: pred,
    };
  } else {
    // Decision Tree Predictions
    const traverse = (node: TreeNode, vec: number[]): any => {
      if (node.value !== undefined) {
        return node.value;
      }
      if (!node.feature) return null;
      
      const featIdx = expandedNames.indexOf(node.feature);
      if (featIdx === -1) return null;

      const val = vec[featIdx];
      if (val <= (node.threshold ?? 0)) {
        return traverse(node.left!, vec);
      } else {
        return traverse(node.right!, vec);
      }
    };

    const pred = traverse(treeRoot!, vector);
    return {
      prediction: pred,
    };
  }
}
