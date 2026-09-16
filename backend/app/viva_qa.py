"""
Viva Questions, Demonstration Script, and Theoretical Materials for VehicleSense
"""
from typing import List, Dict

VIVA_QUESTIONS: List[Dict[str, str]] = [
    {
        "id": "q1",
        "question": "What is the K-Nearest Neighbors (KNN) algorithm and how does it classify new samples?",
        "category": "Algorithm Fundamentals",
        "answer": (
            "KNN is a non-parametric, instance-based supervised learning algorithm (often called a 'lazy learner'). "
            "It does not learn an explicit discriminative decision boundary during training; instead, it memorizes the "
            "scaled training dataset. When predicting a new query instance, KNN calculates the distance between the query "
            "vector and every training vector across all feature dimensions, identifies the K closest neighbors, and determines "
            "the output class via voting (uniform majority or distance-weighted)."
        )
    },
    {
        "id": "q2",
        "question": "Why is feature scaling (StandardScaler) mathematically necessary for KNN?",
        "category": "Preprocessing & Distance",
        "answer": (
            "KNN relies strictly on distance metrics like Euclidean or Manhattan distance. If features have vastly different numeric scales "
            "(e.g., Scaled Variance Sc.Var.maxis ranges up to 800, whereas Aspect Ratio Max.L.Ra is around 10), the Euclidean distance "
            "would be overwhelmingly dominated by the high-magnitude feature, rendering the smaller geometric features virtually useless. "
            "StandardScaler standardizes each feature to zero mean (μ=0) and unit variance (σ=1), ensuring each geometric property contributes "
            "fairly based on variance rather than raw measurement units."
        )
    },
    {
        "id": "q3",
        "question": "What is the difference between Euclidean and Manhattan distances?",
        "category": "Distance Metrics",
        "answer": (
            "Euclidean distance is the straight-line L2 norm: d(x,y) = sqrt(sum((x_i - y_i)^2)). It penalizes large coordinate differences "
            "heavily due to squaring. Manhattan distance is the L1 norm: d(x,y) = sum(|x_i - y_i|), measuring distance along orthogonal axes. "
            "In high-dimensional spaces or when outliers exist, Manhattan distance often degrades more gracefully than Euclidean distance."
        )
    },
    {
        "id": "q4",
        "question": "How does the hyperparameter K affect the bias-variance tradeoff in KNN?",
        "category": "Hyperparameter Tuning",
        "answer": (
            "A small K (e.g., K=1) produces low bias but high variance: the decision boundary is highly complex, sensitive to individual "
            "noisy training points, and prone to overfitting. A large K (e.g., K=15) introduces higher bias and lower variance: the prediction "
            "smooths over local details, approaching the global class prior. Model selection should pick an optimal intermediate K (e.g., K=5 or K=7) "
            "evaluated via stratified cross-validation on the training set."
        )
    },
    {
        "id": "q5",
        "question": "Why must the test set remain separate from hyperparameter selection?",
        "category": "Evaluation Integrity",
        "answer": (
            "Tuning hyperparameters (such as K, distance metric, or weights) by repeatedly checking accuracy on the test set causes "
            "'test-set leakage' or snooping. The model configuration becomes indirectly fitted to the specific quirks of the test set, "
            "yielding an over-optimistic accuracy that fails to generalize. Best practice dictates that cross-validation is performed exclusively "
            "within the 80% training set to select hyperparameters, and the test set is touched only once for the final unbiased evaluation."
        )
    },
    {
        "id": "q6",
        "question": "How does distance-weighted voting work, and how are exact zero-distance matches handled?",
        "category": "Voting Schemes",
        "answer": (
            "In distance-weighted voting, each neighbor casts a vote weighted by the reciprocal of its distance: w_i = 1 / d_i. "
            "Closer neighbors have a stronger voice than distant neighbors. If an exact duplicate occurs (d_i = 0), division by zero is "
            "handled per scikit-learn's standard: 100% of the voting weight is allocated strictly to the zero-distance neighbor(s), divided equally "
            "among them, while all non-zero neighbors receive 0 weight."
        )
    },
    {
        "id": "q7",
        "question": "Why is 'neighbor vote share' not equivalent to true posterior probability or model confidence?",
        "category": "Interpretability & Calibration",
        "answer": (
            "A neighbor vote share (e.g., 4 out of 5 neighbors = 80%) merely indicates the local sample proportion among the nearest retrieved items. "
            "It is not a calibrated Bayesian posterior probability P(Class | X) because KNN does not model the underlying class density distributions, "
            "prior probabilities, or feature covariances. Calling it 'confidence' is scientifically misleading."
        )
    },
    {
        "id": "q8",
        "question": "What are the four classes in this dataset and what do they represent?",
        "category": "Dataset Domain",
        "answer": (
            "The 4 classes are Bus, Van, Saab Car, and Opel Car. They originate from the Turing Institute's benchmark study on object recognition "
            "from 2D silhouettes (JP Siebert 1987). Saab and Opel are specific sedan models, meaning the problem combines distinguishing broad "
            "functional vehicle silhouettes (Bus vs Van vs Car) with fine-grained discrimination between two car silhouettes (Saab vs Opel)."
        )
    },
    {
        "id": "q9",
        "question": "How do you detect Out-of-Distribution (OOD) inputs in KNN?",
        "category": "Reliability & Heuristics",
        "answer": (
            "KNN is a closed-world classifier: it will always predict one of its known training classes, even for an aeroplane or garbage data. "
            "To detect out-of-distribution inputs, we establish an experimental baseline by calculating the mean (μ) and standard deviation (σ) "
            "of the distances between training samples and their nearest neighbors. If an incoming query's average scaled distance exceeds a threshold "
            "(e.g., μ + 3σ), the system flags an OOD warning indicating the input lies far outside the learned feature space."
        )
    },
    {
        "id": "q10",
        "question": "What are the primary computational limitations of KNN in production?",
        "category": "Engineering Limitations",
        "answer": (
            "1. High prediction latency: Inference is O(N × D) because every prediction requires computing distances to all N training examples. "
            "2. Memory footprint: The complete training set must remain in memory. "
            "3. Curse of dimensionality: In very high dimensions, distances between points tend to become equidistant unless dimensionality "
            "reduction (e.g., PCA) is used. Fast index structures like KD-Trees or Ball-Trees help mitigate search latency for moderate dimensions."
        )
    }
]

DEMO_SCRIPT_STEPS = [
    {
        "step": "Step 1: Introduction & Architecture (30 seconds)",
        "action": "Start on the Overview page.",
        "script": (
            "\"Good morning/afternoon, evaluators. Today I present VehicleSense, an explainable machine learning system that classifies vehicles "
            "into Bus, Van, Saab Car, and Opel Car using 18 extracted silhouette geometric features and the K-Nearest Neighbors algorithm. "
            "Notice our pipeline: 18 Features -> Median Imputer -> StandardScaler -> KNN with L1/L2 distance -> Voting Scheme -> Predicted Class.\""
        )
    },
    {
        "step": "Step 2: Transparent Model Lab & Scaling Proof (40 seconds)",
        "action": "Navigate to Model Lab. Point to the Scaled vs Unscaled comparison card.",
        "script": (
            "\"In Model Lab, notice our scientific rigor. Hyperparameters are selected strictly through 5-fold stratified cross-validation on the "
            "80% training set to prevent test-set leakage. Our Scaled vs Unscaled comparison proves why standardization is essential: without scaling, "
            "features with large variance like Sc.Var.maxis swamp smaller aspect ratios. Watch how changing K from 1 to 5 to 15 navigates the "
            "classic bias-variance tradeoff.\""
        )
    },
    {
        "step": "Step 3: Blind Held-out Demonstration & Explainability (35 seconds)",
        "action": "Navigate to Classify Vehicle. Click 'Load Blind Test Example #1' and then click 'Classify Vehicle'.",
        "script": (
            "\"To demonstrate without bias, I click 'Load Blind Test Example'. Notice the true label is masked until prediction. "
            "When I click 'Classify', the backend transforms the features and queries the fitted training space. "
            "The model predicts the vehicle, reveals the held-out ground truth label for comparison, and provides an explainable breakdown: "
            "we see the exact neighbor vote shares, distance-weighted contributions, and a table of the actual K nearest training examples with scaled distances!\""
        )
    },
    {
        "step": "Step 4: 2D Feature Projection & Conclusion (15 seconds)",
        "action": "Show the 2D scatter plot below the prediction table.",
        "script": (
            "\"Finally, our 2D feature projection clearly plots the query vehicle alongside its actual K nearest neighbors, with an honest note "
            "clarifying that neighbors are calculated across all 18 dimensions, not just the 2 selected visual axes. "
            "Thank you, I am now ready for your questions.\""
        )
    }
]
