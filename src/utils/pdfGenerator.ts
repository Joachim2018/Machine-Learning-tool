/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ModelResults, ColumnSummary } from '../types';

export function generatePDFReport(
  datasetName: string,
  rowCount: number,
  cleandRowCount: number,
  columnsSummary: Record<string, ColumnSummary>,
  modelResults: ModelResults | null
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette - Sophisticated Slate Theme
  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const secondaryColor: [number, number, number] = [71, 85, 105]; // slate-600
  const accentColor: [number, number, number] = [14, 116, 144]; // cyan-700
  const lightBgColor: [number, number, number] = [248, 250, 252]; // slate-50

  const drawHeader = (title: string, pageNum: number) => {
    // Top colored banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("MACHINE LEARNING STUDIO | EXECUTIVE DATA REPORT", 15, 9);

    doc.setTextColor(148, 163, 184); // light grey
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 155, 9);

    // Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 280, 195, 280);
    doc.setTextColor(100, 116, 139);
    doc.text("Interactive AutoML Workbench Report", 15, 285);
    doc.text(`Page ${pageNum}`, 190, 285);
  };

  // --- PAGE 1: EXECUTIVE SUMMARY & DATASET PROFILE ---
  drawHeader("Executive Summary", 1);

  // Title Block
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text("DATA SUMMARY & ANALYTICAL PROFILE", 15, 30);

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Dataset Source: ${datasetName}`, 15, 37);

  // Decorative thick divider
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(15, 41, 180, 1, 'F');

  // Overview Paragraph
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  const introTxt = `This automated executive report contains a comprehensive profile of the data quality, exploratory statistics, and predictive modeling performance for the dataset under analysis. A total of ${rowCount} raw records were parsed containing ${Object.keys(columnsSummary).length} fields, resulting in a synthesized training dataset of ${cleandRowCount} pristine records following missing value corrections and automatic formatting.`;
  doc.text(doc.splitTextToSize(introTxt, 180), 15, 48);

  // Section: Data Statistics Cards
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(15, 68, 180, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 68, 180, 22, 'S');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("DATASET PROFILE METRICS", 20, 74);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Records: ${rowCount}`, 20, 82);
  doc.text(`Preprocessed Rows: ${cleandRowCount}`, 80, 82);
  doc.text(`Total Column Fields: ${Object.keys(columnsSummary).length}`, 140, 82);

  // Section: Data Columns & Summaries
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text("EXPLORATORY DATA FIELD SUMMARY STATISTICS", 15, 100);

  const tableHeaders = [["Field/Column", "Type", "Missing Rows", "Unique Values", "Mean", "Std Dev", "Min", "Max"]];
  const tableData = Object.values(columnsSummary).map(sum => {
    return [
      sum.name,
      sum.type.toUpperCase(),
      String(sum.missingCount),
      String(sum.uniqueValues.length),
      sum.type === 'numeric' && sum.mean !== undefined ? sum.mean.toFixed(2) : '-',
      sum.type === 'numeric' && sum.stdDev !== undefined ? sum.stdDev.toFixed(2) : '-',
      sum.type === 'numeric' && sum.min !== undefined ? sum.min.toFixed(2) : '-',
      sum.type === 'numeric' && sum.max !== undefined ? sum.max.toFixed(2) : '-',
    ];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 105,
    margin: { left: 15, right: 15 },
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // primaryColor slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
    }
  });


  // --- PAGE 2: MACHINE LEARNING EVALUATION (if available) ---
  if (modelResults) {
    doc.addPage();
    drawHeader("Machine Learning Evaluation", 2);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text("SUPERVISED MACHINE LEARNING REPORT", 15, 30);

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Model Algorithm: ${modelResults.type.toUpperCase().replace(/_/g, ' ')}`, 15, 36);

    // Divider
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(15, 40, 180, 0.8, 'F');

    // Model Setup Details
    doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
    doc.rect(15, 45, 180, 32, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 45, 180, 32, 'S');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("MODEL DEFINITION & EXPERIMENTAL SETUP", 20, 51);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Target Variable (To Predict): ${modelResults.target}`, 20, 58);
    doc.text(`• Input Selected Features: ${modelResults.features.join(', ')}`, 20, 64);
    doc.text(`• Split Settings: ${(modelResults.config.trainRatio * 100).toFixed(0)}% Train / ${((1 - modelResults.config.trainRatio) * 100).toFixed(0)}% Test Split`, 20, 70);

    // Evaluation Metrics Section
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("HOLDOUT TEST-SET PERFORMANCE METRICS", 15, 86);

    if (modelResults.isClassification && modelResults.classificationMetrics) {
      const met = modelResults.classificationMetrics;
      const metricsData = [
        ["Metric Title", "Formula Expression", "Model Performance Score"],
        ["Model Accuracy", "(TP + TN) / (TP + TN + FP + FN)", `${(met.accuracy * 100).toFixed(2)}%`],
        ["Precision Score (PPV)", "TP / (TP + FP)", `${(met.precision * 100).toFixed(2)}%`],
        ["Recall Sensitivity (TPR)", "TP / (TP + FN)", `${(met.recall * 100).toFixed(2)}%`],
        ["F1-Score Harmonic", "2 * (Precision * Recall) / (Precision + Recall)", `${(met.f1Score * 100).toFixed(2)}%`],
      ];

      autoTable(doc, {
        head: [metricsData[0]],
        body: metricsData.slice(1),
        startY: 91,
        theme: 'striped',
        headStyles: { fillColor: accentColor },
        styles: { fontSize: 8.5 }
      });

      // Confusion Matrix Drawer
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("CONGRUENCY CONFUSION MATRIX", 15, 142);

      const cm = met.confusionMatrix;
      const cmData = [
        ["", "Predicted Positive", "Predicted Negative"],
        ["Actual Positive", `True Positive (TP): ${cm.truePositive}`, `False Negative (FN): ${cm.falseNegative}`],
        ["Actual Negative", `False Positive (FP): ${cm.falsePositive}`, `True Negative (TN): ${cm.trueNegative}`],
      ];

      autoTable(doc, {
        head: [cmData[0]],
        body: cmData.slice(1),
        startY: 147,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 9, halign: 'center' },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
      });

    } else if (modelResults.regressionMetrics) {
      const met = modelResults.regressionMetrics;
      const metricsData = [
        ["Metric Title", "Error Evaluation Meaning", "Score Value"],
        ["Mean Squared Error (MSE)", "Average squared error loss", met.mse.toFixed(4)],
        ["Root Mean Squared Error (RMSE)", "Standard deviation of residuals", met.rmse.toFixed(4)],
        ["Mean Absolute Error (MAE)", "Average absolute prediction error", met.mae.toFixed(4)],
        ["R-Squared (R² Coefficient)", "Ratio of variance explained by model", `${(met.r2 * 100).toFixed(2)}%`],
      ];

      autoTable(doc, {
        head: [metricsData[0]],
        body: metricsData.slice(1),
        startY: 91,
        theme: 'striped',
        headStyles: { fillColor: accentColor },
        styles: { fontSize: 8.5 }
      });
    }

    // Feature Importance Table
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const dynamicY = modelResults.isClassification ? 180 : 138;
    doc.text("FEATURE RELEVANCE / MODEL PARAMETER WEIGHTS", 15, dynamicY);

    const impHeaders = [["Feature Name", "Relative Importance Weight", "Interpretation / Direction"]];
    const impData = Object.entries(modelResults.featureImportances)
      .sort((a, b) => b[1] - a[1])
      .map(([name, imp]) => {
        let weightStr = (imp * 100).toFixed(1) + "%";
        let direction = "Influences prediction positively";
        
        // Extract coefficient weights direction if linear model
        if (modelResults.weights && modelResults.weights.coefficients[name] !== undefined) {
          const coef = modelResults.weights.coefficients[name];
          weightStr = `${coef.toFixed(4)} (coef)`;
          direction = coef >= 0 
            ? "Increases objective target likelihood" 
            : "Decreases objective target likelihood";
        } else {
          direction = `Contributed ${(imp * 100).toFixed(1)}% to tree decisions`;
        }

        return [name, weightStr, direction];
      });

    autoTable(doc, {
      head: impHeaders,
      body: impData,
      startY: dynamicY + 5,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 }
    });
  }

  return doc;
}
