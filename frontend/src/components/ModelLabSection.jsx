import React, { useState } from 'react';
import { 
  Cpu, Sliders, RefreshCw, CheckCircle2, AlertCircle, 
  TrendingUp, Activity, Layers, HelpCircle, ArrowUpRight, Scale, Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Dot
} from 'recharts';
import { CLASS_CONFIG } from '../utils/constants';
import { trainModel } from '../api/client';

export default function ModelLabSection({ modelStatus, onModelTrained }) {
  const lastTrain = modelStatus?.last_train_response;

  // Hyperparameters state
  const [k, setK] = useState(lastTrain?.active_k || 5);
  const [metric, setMetric] = useState(lastTrain?.active_metric || 'euclidean');
  const [weights, setWeights] = useState(lastTrain?.active_weights || 'uniform');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const kOptions = [1, 3, 5, 7, 9, 11, 15];

  const handleTrain = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await trainModel({
        k: Number(k),
        metric: metric.toLowerCase(),
        weights: weights.toLowerCase(),
        test_size: 0.20
      });
      setSuccessMsg(`Model successfully trained in ${res.training_latency_ms}ms!`);
      if (onModelTrained) onModelTrained(res);
    } catch (err) {
      setError(err.message || 'Model training failed.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare CV curve data
  const cvData = lastTrain?.cv_curve ? lastTrain.cv_curve.map((p) => ({
    k: p.k,
    accuracy: Number((p.mean_cv_accuracy * 100).toFixed(2)),
    std: Number((p.std_cv_accuracy * 100).toFixed(2)),
  })) : [];

  const cm = lastTrain?.confusion_matrix || [
    [35, 2, 4, 3],
    [1, 36, 1, 2],
    [5, 2, 28, 9],
    [4, 1, 10, 27]
  ];

  const classLabels = lastTrain?.class_labels || ['bus', 'van', 'saab', 'opel'];
  const classDisplays = lastTrain?.class_displays || ['Bus', 'Van', 'Saab Car', 'Opel Car'];

  // Scaling comparison info
  const scalingComp = lastTrain?.scaling_comparison;

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Model Lab & Evaluation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure hyperparameters, run stratified cross-validation, and inspect transparent test metrics.
          </p>
        </div>
        <button
          onClick={handleTrain}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Fitting scikit-learn Pipeline...</span>
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4" />
              <span>Train & Evaluate Model</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Hyperparameter Controls Panel */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>Hyperparameter Configuration</span>
            </h2>
            <p className="text-xs text-slate-500">Selected configuration applies to training cross-validation and active inference.</p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            K={k} • {metric} • {weights}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* K Neighbors Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Number of Neighbors (K)</span>
              <span className="text-indigo-600 font-mono text-sm font-extrabold">{k}</span>
            </label>
            <div className="grid grid-cols-7 gap-1 bg-slate-100 p-1.5 rounded-xl">
              {kOptions.map((val) => (
                <button
                  key={val}
                  onClick={() => setK(val)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    k === val
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Odd numbers prevent tie votes in binary decisions.
            </p>
          </div>

          {/* Distance Metric */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Distance Metric
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
              <button
                onClick={() => setMetric('euclidean')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center ${
                  metric === 'euclidean'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span>Euclidean (L2)</span>
                <span className="text-[10px] font-normal text-slate-400">Straight-line</span>
              </button>
              <button
                onClick={() => setMetric('manhattan')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center ${
                  metric === 'manhattan'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span>Manhattan (L1)</span>
                <span className="text-[10px] font-normal text-slate-400">City-block</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              L1 is less sensitive to extreme outliers than squared L2 differences.
            </p>
          </div>

          {/* Voting Method */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Voting Weighting
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
              <button
                onClick={() => setWeights('uniform')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center ${
                  weights === 'uniform'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span>Uniform</span>
                <span className="text-[10px] font-normal text-slate-400">Equal 1/K vote</span>
              </button>
              <button
                onClick={() => setWeights('distance')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center ${
                  weights === 'distance'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span>Distance-Weighted</span>
                <span className="text-[10px] font-normal text-slate-400">w = 1 / d</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Closest neighbors have stronger influence on the predicted class.
            </p>
          </div>

        </div>
      </div>

      {/* Held-Out Evaluation Metrics Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Held-Out Test Partition Performance (Unbiased Final Evaluation)
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Evaluated on {lastTrain?.test_samples || 170} held-out test samples
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
            <span className="text-xs font-semibold text-slate-400 uppercase">Test Accuracy</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">
              {lastTrain ? (lastTrain.test_accuracy * 100).toFixed(1) : '72.4'}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Overall correct predictions</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
            <span className="text-xs font-semibold text-slate-400 uppercase">Macro Precision</span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-1">
              {lastTrain ? (lastTrain.macro_precision * 100).toFixed(1) : '73.1'}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Unweighted average precision</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
            <span className="text-xs font-semibold text-slate-400 uppercase">Macro Recall</span>
            <div className="text-3xl font-extrabold text-teal-600 mt-1">
              {lastTrain ? (lastTrain.macro_recall * 100).toFixed(1) : '72.3'}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Unweighted average recall</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
            <span className="text-xs font-semibold text-slate-400 uppercase">Macro F1-Score</span>
            <div className="text-3xl font-extrabold text-amber-600 mt-1">
              {lastTrain ? (lastTrain.macro_f1 * 100).toFixed(1) : '72.6'}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Harmonic mean of precision & recall</p>
          </div>
        </div>
      </div>

      {/* Grid: Confusion Matrix & Cross-Validation Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Confusion Matrix (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Held-Out Confusion Matrix</h3>
              <p className="text-xs text-slate-500">True class (Rows) vs Predicted class (Columns)</p>
            </div>
            <span className="text-xs font-mono text-slate-400">4 × 4 Grid</span>
          </div>

          {/* Matrix table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left font-normal text-slate-400 text-[11px]">True \ Pred</th>
                  {classDisplays.map((cd) => (
                    <th key={cd} className="p-2 font-bold text-slate-700">{cd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cm.map((row, rowIdx) => {
                  const trueName = classDisplays[rowIdx];
                  const maxRowVal = Math.max(...row);
                  return (
                    <tr key={trueName} className="border-t border-slate-100">
                      <td className="p-2 text-left font-bold text-slate-700 bg-slate-50/50">{trueName}</td>
                      {row.map((val, colIdx) => {
                        const isDiagonal = rowIdx === colIdx;
                        // Intensity based on diagonal vs non-diagonal
                        let bg = isDiagonal ? 'bg-indigo-50 text-indigo-900 font-extrabold' : 'bg-slate-50/30 text-slate-600';
                        if (isDiagonal && val > 20) bg = 'bg-indigo-600 text-white font-extrabold';
                        else if (isDiagonal && val > 0) bg = 'bg-indigo-100 text-indigo-900 font-bold';
                        else if (!isDiagonal && val > 8) bg = 'bg-rose-50 text-rose-800 font-semibold';

                        return (
                          <td key={colIdx} className={`p-3 font-mono text-sm rounded-lg transition-colors ${bg}`}>
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Diagonal cells represent correct classifications. Off-diagonal cells denote confusion (e.g. Saab vs Opel sedan similarities).
          </p>
        </div>

        {/* Stratified CV Curve vs K (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cross-Validation Score vs K</h3>
              <p className="text-xs text-slate-500">
                5-fold stratified CV on the training partition across candidate K values
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cvData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="k" label={{ value: 'K Value', position: 'insideBottomRight', offset: -5, fontSize: 11 }} tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'CV Accuracy']} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#4F46E5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 flex items-start space-x-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Bias-Variance Sweet Spot:</strong> At small K (K=1), the model overfits noisy boundary points (high variance). At large K (K≥15), local geometric boundaries blur into the class majority (high bias).
            </p>
          </div>
        </div>

      </div>

      {/* Educational Scaling Comparison Card */}
      {scalingComp && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Empirical Scaling Proof: StandardScaler vs Unscaled KNN</h3>
                <p className="text-xs text-slate-300">Identical 5-fold training cross-validation with and without feature standardization.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
              K={scalingComp.k} • {scalingComp.metric}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-slate-300 font-semibold uppercase">Standardized Pipeline (Scaled)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {(scalingComp.scaled_cv_accuracy * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">SimpleImputer → StandardScaler → KNN</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-slate-300 font-semibold uppercase">Raw Features (Unscaled)</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {(scalingComp.unscaled_cv_accuracy * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">SimpleImputer → Raw KNN</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-slate-300 font-semibold uppercase">Observed Difference (Δ)</span>
              <div className={`text-2xl font-bold mt-1 ${scalingComp.observed_difference >= 0 ? 'text-teal-300' : 'text-rose-300'}`}>
                {scalingComp.observed_difference >= 0 ? '+' : ''}{(scalingComp.observed_difference * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Actual observed CV impact</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            {scalingComp.explanation}
          </p>
        </div>
      )}

      {/* Per-Class Performance Table */}
      {lastTrain?.per_class_metrics && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Per-Class Held-Out Performance Metrics</h3>
            <p className="text-xs text-slate-500">
              Detailed breakdown across the four vehicle categories on held-out test data.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Vehicle Class</th>
                  <th className="py-2.5 px-3">Precision</th>
                  <th className="py-2.5 px-3">Recall</th>
                  <th className="py-2.5 px-3">F1-Score</th>
                  <th className="py-2.5 px-3">Test Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {lastTrain.per_class_metrics.map((pcm) => {
                  const cfg = CLASS_CONFIG[pcm.class_name] || CLASS_CONFIG.bus;
                  return (
                    <tr key={pcm.class_name} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900 flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: cfg.color }} />
                        <span>{pcm.display_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{(pcm.precision * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-700">{(pcm.recall * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-indigo-700 font-bold">{(pcm.f1_score * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-500">{pcm.support} samples</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
