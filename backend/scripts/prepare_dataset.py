"""
Dataset Preparation and Verification Script
Downloads and compiles the authentic Statlog (Vehicle Silhouettes) dataset
(Turing Institute / JP Siebert 1987) matching the exact schema published for
Kaggle's 'anairamcosta/vehicle-csv'.
"""
import urllib.request
import zipfile
import io
import os
import pandas as pd

UCI_ZIP_URL = "https://archive.ics.uci.edu/static/public/149/statlog+vehicle+silhouettes.zip"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "vehicle.csv")

FEATURE_COLUMNS = [
    "Comp", "Circ", "D.Circ", "Rad.Ra", "Pr.Axis.Ra", "Max.L.Ra",
    "Scat.Ra", "Elong", "Pr.Axis.Rect", "Max.L.Rect",
    "Sc.Var.Maxis", "Sc.Var.maxis", "Ra.Gyr",
    "Skew.Maxis", "Skew.maxis", "Kurt.maxis", "Kurt.Maxis",
    "Holl.Ra"
]
ALL_COLUMNS = FEATURE_COLUMNS + ["Class"]

def prepare_vehicle_dataset():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"Fetching Statlog Vehicle Silhouettes dataset from {UCI_ZIP_URL}...")
    req = urllib.request.Request(UCI_ZIP_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response:
        archive_bytes = response.read()
    
    z = zipfile.ZipFile(io.BytesIO(archive_bytes))
    dat_files = [f"xa{c}.dat" for c in ["a", "b", "c", "d", "e", "f", "g", "h", "i"]]
    
    rows = []
    for dat in dat_files:
        content = z.read(dat).decode("latin1").strip()
        for line in content.split("\n"):
            parts = line.strip().split()
            if len(parts) == 19:
                # Convert 18 features to numeric integers, keep class as lowercase string
                numeric_parts = [float(x) if "." in x else int(x) for x in parts[:18]]
                cls = parts[18].lower().strip()
                rows.append(numeric_parts + [cls])
    
    df = pd.DataFrame(rows, columns=ALL_COLUMNS)
    
    # Verification checks
    print(f"Total instances parsed: {len(df)}")
    print(f"Class counts:\n{df['Class'].value_counts().to_dict()}")
    print(f"Feature count: {len(FEATURE_COLUMNS)}")
    assert len(df) == 846, f"Expected 846 instances, got {len(df)}"
    assert set(df["Class"].unique()) == {"bus", "van", "saab", "opel"}, "Unexpected classes"
    
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Successfully saved verified vehicle dataset to: {OUTPUT_CSV}")
    return df

if __name__ == "__main__":
    prepare_vehicle_dataset()
