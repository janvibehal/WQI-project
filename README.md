# EcoDrop AI — Water Quality Prediction
https://githubcard.com/janvibehal/WQI-project.git.svg

EcoDrop AI is a water-quality assessment project that combines data analysis, machine learning experiments, and an interactive web interface. It allows users to enter water-quality parameters and view a calculated Water Quality Index (WQI), a corresponding quality grade, visualizations, and recommendations.

## Features

- **Interactive Interface:** Enter water-quality measurements through a web-based form.
- **WQI Calculation:** Calculate a WQI score using the website's JavaScript-based prediction logic.
- **Water Quality Grading:** Map the calculated WQI to predefined grades from A to E.
- **Visualizations:** Display water-quality results and charts to help users interpret the output.
- **Recommendations:** Present descriptive recommendations based on the predicted quality grade.
- **Machine Learning Experiments:** Explore Multiple Linear Regression for numerical WQI prediction and Random Forest classification for predicting water-quality grades.

## Water Quality Parameters

The project works with eight parameters:

| Parameter | Description |
|---|---|
| Temperature (Temp) | Water temperature |
| Dissolved Oxygen (DO) | Oxygen dissolved in water |
| pH | Measure of acidity or alkalinity |
| Biochemical Oxygen Demand (BOD) | Oxygen required by microorganisms to break down organic matter |
| Nitrate | Nitrate concentration |
| Faecal Coliform (FC) | Indicator of possible faecal contamination |
| Total Coliform (TC) | Indicator group used to assess possible microbial contamination |
| Conductivity | Measure related to the water's ability to conduct electricity |

## Technology Stack

**Machine Learning and Data Analysis**
- Python
- Pandas
- NumPy
- Scikit-learn
- Matplotlib
- Seaborn

**Frontend**
- HTML
- CSS
- JavaScript

## Machine Learning Workflow

The Python notebook explores the following workflow:

1. Load the water-quality dataset using Pandas.
2. Inspect the dataset, data types, missing values, and distributions.
3. Handle missing numerical values using mean imputation.
4. Perform exploratory data analysis using histograms, pairplots, and correlation heatmaps.
5. Train a Multiple Linear Regression model to predict numerical WQI values from the eight water parameters.
6. Experiment with a Random Forest classifier that predicts water-quality grades from WQI values.
7. Evaluate model performance using regression metrics and examine relationships between water-quality variables.

### Multiple Linear Regression

Multiple Linear Regression is used to predict a numerical WQI value based on the eight input parameters. The notebook evaluates the regression model using R² and mean squared error (MSE).

### Random Forest Classification

The notebook also experiments with a Random Forest classifier that maps WQI values to water-quality grades. The classifier uses WQI as its input feature and the grade as its target.

The website's current grading logic, however, uses predefined WQI ranges rather than directly invoking the trained Random Forest classifier.

## Water Quality Grades

The website maps WQI scores to five grades:

| WQI Range | Grade | Label |
|---|---|---|
| 0–25 | A | Excellent |
| 25–50 | B | Good |
| 50–75 | C | Poor |
| 75–100 | D | Very Poor |
| 100 and above | E | Extremely Poor |

These ranges reflect the current website implementation. They should be interpreted according to the grading scheme used by the project and validated against an appropriate water-quality standard before being used for real-world safety decisions.

## Project Structure

The repository contains the web interface files and the Python machine-learning notebook.

- `index.html` — Web interface structure and input form.
- `style.css` — Layout, styling, and responsive design.
- `script.js` — Input handling, WQI calculation, grade assignment, and result visualization.
- `WQI-project.ipynb` — Data preprocessing, exploratory analysis, and machine-learning experiments.
- `Results_MADE.csv` — Water-quality dataset used for analysis.

*Note: File names may differ depending on the version of the repository.*

## How to Run

### Run the Web Interface

1. Clone or download the repository.
2. Open the project folder.
3. Open `index.html` in a web browser.
4. Enter the required water-quality measurements.
5. View the calculated WQI, assigned grade, and corresponding visualizations.

The current frontend uses JavaScript-based prediction logic and does not directly load the trained Python models.

### Run the Machine Learning Notebook

1. Install Python and Jupyter Notebook, or use Google Colab.
2. Install the required packages:

   ```bash
   pip install pandas numpy scikit-learn matplotlib seaborn
   ```

3. Open the Jupyter notebook.
4. Ensure `Results_MADE.csv` is available at the path referenced in the notebook.
5. Run the cells sequentially to perform data analysis, train the models, and evaluate the results.

## Limitations

- The website's WQI calculation uses hard-coded approximate coefficients and is separate from the trained Python regression model.
- The Random Forest classifier is an experimental component of the notebook and is not directly integrated into the website's prediction flow.
- Model performance depends on dataset quality, preprocessing, evaluation methodology, and the representativeness of the samples.
- A predicted WQI or grade does not independently establish whether water is safe to drink.

## Future Improvements

- Integrate the trained regression model into the website through a model-serving backend or an equivalent validated implementation.
- Evaluate the Random Forest classifier using appropriate classification metrics, including accuracy, precision, recall, macro F1-score, and a confusion matrix.
- Explore predicting water-quality grades directly from all eight parameters, provided reliable grade labels are available.
- Improve input validation and handling of missing or out-of-range measurements.
- Validate the WQI formula and grading thresholds against an appropriate water-quality standard.
- Add automated tests and document model performance on unseen data.

## Disclaimer

EcoDrop AI is an educational water-quality assessment project. Its outputs are model predictions and should not be used as the sole basis for determining drinking-water safety. Appropriate laboratory testing and applicable water-quality standards are required for real-world safety decisions.
