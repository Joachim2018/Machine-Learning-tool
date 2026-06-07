/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SampleDataset {
  name: string;
  description: string;
  csvContent: string;
}

export const defaultDatasets: SampleDataset[] = [
  {
    name: "Student Performance Dataset",
    description: "Predict student final exam scores (Regression) or whether they pass (Classification) based on study hours, attendance, sleep, and extra-curricular activities.",
    csvContent: `StudyHours,AttendanceRate,SleepDuration,ExtraCurriculars,ParentEducation,ExamScore,PassExam
12.5,95,7.5,Yes,College,85,Passed
4.2,72,6.0,No,High School,52,Failed
15.0,98,8.0,Yes,Post-Grad,92,Passed
8.0,85,7.0,No,College,74,Passed
3.0,60,5.5,No,High School,45,Failed
14.2,94,7.0,Yes,Post-Grad,88,Passed
6.5,80,6.5,No,College,62,Failed
9.0,88,7.5,Yes,High School,76,Passed
11.5,91,7.2,No,College,81,Passed
2.5,55,5.0,No,High School,38,Failed
16.5,99,8.5,Yes,Post-Grad,96,Passed
7.2,82,6.8,Yes,High School,68,Passed
13.0,93,7.0,No,College,83,Passed
5.0,75,6.0,No,High School,55,Failed
10.0,89,7.5,Yes,College,78,Passed
14.8,96,8.1,Yes,Post-Grad,91,Passed
4.5,70,6.2,No,College,56,Failed
12.0,92,7.0,Yes,High School,80,Passed
8.5,84,7.3,No,College,72,Passed
3.5,65,5.8,No,High School,48,Failed
15.5,97,8.0,Yes,College,94,Passed
7.0,80,6.5,No,High School,64,Passed
11.0,90,7.0,Yes,Post-Grad,79,Passed
5.5,74,6.0,No,College,58,Failed
9.5,87,7.2,No,College,75,Passed
13.5,95,7.8,Yes,Post-Grad,87,Passed
3.8,68,5.5,No,High School,50,Failed
12.8,93,7.5,Yes,College,84,Passed
6.8,81,6.7,No,College,65,Passed
8.2,83,7.0,No,High School,71,Passed
16.0,98,8.2,Yes,Post-Grad,95,Passed
4.0,71,6.0,No,College,54,Failed
10.5,90,7.3,Yes,Post-Grad,82,Passed
14.0,96,7.9,Yes,College,89,Passed
2.8,58,5.2,No,High School,40,Failed
11.8,92,7.1,No,College,80,Passed
7.5,85,6.9,Yes,High School,70,Passed
13.2,94,7.4,No,College,84,Passed
5.2,76,6.1,No,High School,57,Failed
9.2,88,7.3,Yes,College,77,Passed
14.5,95,8.0,Yes,Post-Grad,90,Passed
4.8,73,6.3,No,College,59,Failed
12.2,91,7.2,Yes,High School,82,Passed
8.8,86,7.0,No,College,73,Passed
3.2,62,5.6,No,High School,46,Failed
15.2,97,8.1,Yes,College,92,Passed
7.1,81,6.6,No,High School,66,Passed
10.8,91,7.1,Yes,Post-Grad,81,Passed
5.8,75,5.9,No,College,60,Failed
9.6,87,7.4,No,College,76,Passed
13.8,94,7.7,Yes,Post-Grad,88,Passed
3.6,66,5.4,No,High School,49,Failed
12.6,93,7.4,Yes,College,83,Passed
6.6,80,6.8,No,College,63,Failed
8.0,84,7.1,No,High School,70,Passed
16.2,99,8.4,Yes,Post-Grad,97,Passed
4.1,72,5.9,No,College,53,Failed
10.2,89,7.2,Yes,Post-Grad,80,Passed
14.1,95,7.8,Yes,College,89,Passed
2.9,59,5.1,No,High School,41,Failed`
  },
  {
    name: "Heart Disease Health Sample",
    description: "Classify potential heart disease risk state based on AGE, resting BP, cholesterol levels, max heart rate, and presence of exercise induced angina.",
    csvContent: `Age,RestingBP,Cholesterol,MaxHR,Angina,SeverePain,RiskCode
45,120,220,170,No,No,Normal
58,140,280,140,Yes,Yes,AtRisk
65,150,290,125,Yes,No,AtRisk
38,115,200,185,No,No,Normal
52,135,250,150,No,No,Normal
62,138,285,135,Yes,Yes,AtRisk
49,124,240,162,No,No,Normal
55,145,260,145,Yes,No,AtRisk
68,148,310,118,Yes,Yes,AtRisk
41,118,210,178,No,No,Normal
50,132,235,160,No,No,Normal
60,142,275,138,Yes,Yes,AtRisk
47,126,225,168,No,No,Normal
54,136,245,155,No,No,Normal
64,146,295,122,Yes,Yes,AtRisk
43,122,215,172,No,No,Normal
56,134,255,148,No,No,Normal
61,141,280,132,Yes,No,AtRisk
46,125,230,165,No,No,Normal
51,130,240,158,No,No,Normal
63,144,300,128,Yes,Yes,AtRisk
39,116,198,180,No,No,Normal
53,137,252,152,No,No,Normal
66,147,305,120,Yes,Yes,AtRisk
44,121,218,175,No,No,Normal
57,133,258,146,No,No,Normal
67,149,315,115,Yes,Yes,AtRisk
40,117,205,182,No,No,Normal
42,120,212,176,No,No,Normal
59,139,270,142,Yes,No,AtRisk`
  }
];
