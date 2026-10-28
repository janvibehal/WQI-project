"""
EcoDrop-AI backend  —  /WQI-project-main/app.py

Reproduces the pipeline of WQI_prediction.ipynb exactly:
  * mean-imputation of nulls (Results_MADE.csv)
  * 80/20 split, random_state=0
  * LinearRegression  : 8 water parameters -> WQI
  * RandomForestClassifier(n_estimators=5000) : WQI -> grade (A-E)

The browser only sends raw inputs; every number it displays comes from here.
"""
import os

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FEATURES = ["temp", "do", "ph", "bod", "nitrate", "fc", "tc", "conductivity"]
CSV_COLUMNS = ["Temperature", "Dissolved Oxygen", "pH",
               "Bio-Chemical Oxygen Demand (mg/L)", "Nitrate (mg/ L)",
               "Faecal Coliform (MPN/ 100 mL)", "Total Coliform (MPN/ 100 mL)",
               "Conductivity (mho/ Cm)"]
# FC / TC are ~69% null in the training CSV, so they may be left blank
# (they are then mean-imputed, exactly as the notebook did for training).
OPTIONAL = {"fc", "tc"}
GRADE_BY_CLASS = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}
CLASS_BY_GRADE = {"E": 5, "D": 4, "C": 3, "B": 2, "A": 1}


# --------------------------------------------------------------------------
# Training (runs once at startup)
# --------------------------------------------------------------------------
def train():
    df = pd.read_csv(os.path.join(BASE_DIR, "Results_MADE.csv"))
    df = df.rename(columns=dict(zip(CSV_COLUMNS, FEATURES)))
    df[FEATURES] = df[FEATURES].fillna(df[FEATURES].mean())      # notebook cell 17
    means = df[FEATURES].mean()

    X = df[FEATURES].values
    y = df["WQI"].values
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=0)
    reg = LinearRegression().fit(X_tr, y_tr)
    r2_test = r2_score(y_te, reg.predict(X_te))

    grade_num = df["Potability"].map(CLASS_BY_GRADE).values
    A_tr, _, B_tr, _ = train_test_split(y.reshape(-1, 1), grade_num,
                                        test_size=0.2, random_state=0)
    rfc = RandomForestClassifier(n_estimators=5000, oob_score=True,
                                 random_state=0, n_jobs=-1).fit(A_tr, B_tr)

    return dict(df=df, means=means, reg=reg, rfc=rfc, r2_test=r2_test,
                wqi_std=float(df["WQI"].std()), n_samples=len(df))


M = train()
app = Flask(__name__)


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
# Static frontend (whitelisted so app.py / the CSV are not exposed)
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:name>")
def assets(name):
    if name in {"script.js", "style.css", "EcoDrop.webp"}:
        return send_from_directory(BASE_DIR, name)
    return jsonify(error="Not found"), 404


@app.get("/api/model-info")
def model_info():
    return jsonify(samples=M["n_samples"], r2_test=round(M["r2_test"] * 100, 1))


@app.post("/api/predict")
def predict():
    body = request.get_json(silent=True) or {}
    values, imputed = [], []
    for f in FEATURES:
        raw = body.get(f)
        if raw in (None, ""):
            if f not in OPTIONAL:
                return jsonify(error=f"'{f}' is required"), 400
            values.append(float(M["means"][f]))
            imputed.append(f)
            continue
        try:
            values.append(float(raw))
        except (TypeError, ValueError):
            return jsonify(error=f"'{f}' must be a number"), 400
    if not (0 <= values[FEATURES.index("ph")] <= 14):
        return jsonify(error="pH must be between 0 and 14"), 400

    x = np.array([values])
    wqi = float(M["reg"].predict(x)[0])                       # Model 1: regression
    wqi_in = np.array([[wqi]])
    cls = int(M["rfc"].predict(wqi_in)[0])                    # Model 2: classifier
    proba = M["rfc"].predict_proba(wqi_in)[0]
    probs = {GRADE_BY_CLASS[int(c)]: float(p) for c, p in zip(M["rfc"].classes_, proba)}

    params = []
    for i, f in enumerate(FEATURES):
        # push this value exerts on the WQI relative to an average sample
        contrib = float(M["reg"].coef_[i] * (values[i] - M["means"][f]))
        z = contrib / M["wqi_std"]
        status = ("excellent" if z <= -0.15 else "good" if z < 0
                  else "moderate" if z < 0.15 else "poor")
        pct = float((M["df"][f] <= values[i]).mean() * 100)   # position in training data
        params.append(dict(key=f, value=values[i], imputed=f in imputed,
                           contribution=round(contrib, 2), status=status,
                           percentile=round(pct, 1)))

    return jsonify(wqi=round(wqi, 2), grade=GRADE_BY_CLASS[cls],
                   grade_probabilities=probs, parameters=params,
                   imputed=imputed)


if __name__ == "__main__":
    app.run(debug=False, port=5000)