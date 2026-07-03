# Liberty Model: Algorithmic Triage for Bail Applications ⚖️📊

## Overview
This repository contains the source code and methodology for the "Liberty Model," a data-driven framework designed to evaluate the judicial efficiency of bail applications. The project applies advanced text analytics to public legal datasets from the Indore Bench of the Madhya Pradesh High Court.

## Project Objectives
* **Algorithmic Triage:** To develop a framework that categorizes and analyzes bail applications based on extracted legal entities.
* **Efficiency Metrics:** To measure and visualize judicial processing timelines and case outcome trends.
* **Custom Logic:** Implements specialized boolean filtering tailored to specific legal parameters, moving beyond generic frequency sorting.

## Tech Stack & Tools
* **Language:** Python
* **Data Manipulation:** `pandas`, `numpy`
* **Text Analytics:** NLP techniques, Named Entity Recognition (NER)
* **Environment:** Anaconda, VS Code
* **Version Control:** Git & GitHub

## Methodology
1. **Data Extraction:** Ingesting unstructured public legal datasets.
2. **Preprocessing:** Cleaning legal jargon and standardizing text formats.
3. **Entity Recognition:** Utilizing NER to identify key legal entities (e.g., charge types, dates, case statuses).
4. **Custom Filtering:** Applying specific boolean logic to filter data relevant to operational efficiency.
5. **Analysis:** Generating actionable insights regarding judicial bottlenecks.

## How to Run
1. Clone the repository: `git clone [Your Repository URL]`
2. Navigate to the directory: `cd liberty-model`
3. Install required dependencies: `pip install -r requirements.txt`
4. Run the main analysis script: `python main_analysis.py`

## Future Scope
Expanding the dataset to include broader jurisdictions and integrating interactive dashboards using Plotly Dash for real-time visualization of judicial trends.
