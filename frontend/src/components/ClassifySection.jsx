import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, Upload, Download, AlertTriangle, CheckCircle2, 
  HelpCircle, Eye, EyeOff, Layers, ArrowRight, Table, BarChart2, Compass
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, CartesianGrid, Legend
} from 'recharts';
import { FEATURE_GROUPS, CLASS_CONFIG } from '../utils/constants';
import { predictSample, predictBatch, fetchHeldOutExamples } from '../api/client';

export default function ClassifySection({ summary, modelStatus }) {
  // 18 feature values state
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  // Held-out test examples state
  const [heldOutExamples, setHeldOutExamples] = useState([]);
  const [activeHeldOut, setActiveHeldOut] = useState(null);

  // 2D projection scatter plot feature selections
  const [scatterX, setScatterX] = useState("Comp");
  const [scatterY, setScatterY] = useState("Circ");

  // Batch prediction state
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchError, setBatchError] = useState(null);

  // Active feature group accordion / tab
  const [activeGroup, setActiveGroup] = useState(FEATURE_GROUPS[0].name);

  // Quick stat map for feature min/max
  const statsMap = React.useMemo(() => {
    const map = {};
    if (summary?.features_stats) {
      summary.features_stats.forEach((s) => {
        map[s.name] = s;
      });
    }
    return map;
  }, [summary]);

  // Load held-out blind test examples on mount
  useEffect(() => {
    fetchHeldOutExamples()
      .then((data) => setHeldOutExamples(data))
      .catch((err) => console.error("Error loading held-out examples:", err));
  }, []);

  // Update feature input
  const handleFeatureChange = (key, val) => {
    const num = val === '' ? '' : parseFloat(val);
    setFeatures((prev) => ({
      ...prev,
      [key]: num
    }));
    // If user manually modifies, clear active held-out tracking
    if (activeHeldOut) {
      setActiveHeldOut(null);
    }
  };

  // Load a blind held-out example
  const handleLoadBlindExample = (example) => {
    setFeatures({ ...example.features });
    setActiveHeldOut(example);
    setPrediction(null);
    setError(null);
  };

  // Load a random blind test example
  const handleLoadRandomExample = () => {
    if (heldOutExamples.length === 0) return;
    const randomIdx = Math.floor(Math.random() * heldOutExamples.length);
    handleLoadBlindExample(heldOutExamples[randomIdx]);
  };

  // Clear all features
  const handleClear = () => {
    setFeatures({});
    setActiveHeldOut(null);
    setPrediction(null);
    setError(null);
  };

  // Predict
  const handleClassify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictSample(features, true);
      setPrediction(res);
    } catch (err) {
      setError(err.message || 'Failed to classify vehicle.');
    } finally {
      setLoading(false);
    }
  };

  // Handle batch CSV upload
  const handleBatchUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchLoading(true);
    setBatchError(null);
    try {
      const res = await predictBatch(file);
      setBatchResults(res);
    } catch (err) {
      setBatchError(err.message || 'Batch prediction failed.');
    } finally {
      setBatchLoading(false);
    }
  };

  // Download batch CSV
  const downloadBatchCSV = () => {
    if (!batchResults?.results) return;
    const headers = ["Row", "Predicted_Class", "Predicted_Display", "Bus_VoteShare", "Van_VoteShare", "Saab_VoteShare", "Opel_VoteShare"];
    const rows = batchResults.results.map((r) => [
      r.row_id,
      r.predicted_class,
      r.predicted_display,
      r.vote_shares?.bus || 0,
      r.vote_shares?.van || 0,
      r.vote_shares?.saab || 0,
      r.vote_shares?.opel || 0
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `batch_predictions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare chart data for vote shares
  const voteShareData = prediction ? Object.entries(prediction.vote_shares).map(([key, val]) => ({
    classKey: key,
    name: CLASS_CONFIG[key]?.label || key,
    share: val,
    color: CLASS_CONFIG[key]?.color || '#4F46E5',
    count: prediction.vote_counts?.[key] || 0
  })) : [];

  // Scatter data preparation
  const scatterData = React.useMemo(() => {
    if (!prediction?.neighbors) return [];
    // Neighbor points
    const neighborsPoints = prediction.neighbors.map((n) => ({
      x: n.features[scatterX] ?? 0,
      y: n.features[scatterY] ?? 0,
      name: `${n.display_name} (Rank #${n.rank})`,
      distance: n.distance,
      classKey: n.class_name,
      type: 'neighbor'
    }));

    // Query point
    const queryPoint = [{
      x: features[scatterX] ?? 0,
      y: features[scatterY] ?? 0,
      name: 'Query Vehicle (Input)',
      type: 'query'
    }];

    return { neighborsPoints, queryPoint };
  }, [prediction, features, scatterX, scatterY]);

  const allFeaturesList = summary?.features_stats?.map(s => s.name) || [
    "Comp", "Circ", "D.Circ", "Rad.Ra", "Pr.Axis.Ra", "Max.L.Ra", "Scat.Ra", "Elong",
    "Pr.Axis.Rect", "Max.L.Rect", "Sc.Var.Maxis", "Sc.Var.maxis", "Ra.Gyr",
    "Skew.Maxis", "Skew.maxis", "Kurt.maxis", "Kurt.Maxis", "Holl.Ra"
  ];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Classify Vehicle & Explain Prediction
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter 18 geometric silhouette features or load blind held-out classroom test samples.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadRandomExample}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Load Random Blind Test Sample</span>
          </button>
          <button
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            Clear Form
          </button>
        </div>
      </div>

      {/* Blind Test Presets Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Classroom Demonstration Presets (Held-Out Test Set)</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Answers masked until classification
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {heldOutExamples.slice(0, 4).map((ex, idx) => {
            const isSelected = activeHeldOut?.example_id === ex.example_id;
            return (
              <button
                key={ex.example_id}
                onClick={() => handleLoadBlindExample(ex)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{ex.sample_label}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form (Left) & Prediction Result (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: 18 Feature Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Numerical Silhouette Features</h2>
                <p className="text-xs text-slate-500">18 geometric attributes extracted from 2D silhouette</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono">
                {Object.values(features).filter(v => v !== '' && v !== null && v !== undefined).length} / 18 Filled
              </span>
            </div>

            {/* Feature Groups Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/70 rounded-xl">
              {FEATURE_GROUPS.map((grp) => (
                <button
                  key={grp.name}
                  onClick={() => setActiveGroup(grp.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeGroup === grp.name
                      ? 'bg-white text-indigo-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {grp.name}
                </button>
              ))}
            </div>

            {/* Active Group Inputs */}
            {FEATURE_GROUPS.filter(g => g.name === activeGroup).map((grp) => (
              <div key={grp.name} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {grp.features.map((feat) => {
                  const stat = statsMap[feat.key];
                  const currentVal = features[feat.key] ?? '';
                  return (
                    <div key={feat.key} className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 hover:border-indigo-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                          <span>{feat.key}</span>
                          <span className="text-[11px] font-normal text-slate-400">({feat.label})</span>
                        </label>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={currentVal}
                          onChange={(e) => handleFeatureChange(feat.key, e.target.value)}
                          placeholder={stat ? `e.g. ${stat.median}` : 'Value'}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span title={feat.desc} className="truncate max-w-[150px] cursor-help">
                          {feat.desc}
                        </span>
                        {stat && (
                          <span className="text-slate-400 shrink-0 font-mono">
                            [{stat.min} - {stat.max}]
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                onClick={handleClassify}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying KNN Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Classify Vehicle & Retrieve Neighbors</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Batch CSV Upload Accordion */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Batch CSV Prediction
                </span>
                <span className="text-[11px] text-slate-400">Classify multiple rows at once</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors flex items-center space-x-2">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{batchLoading ? 'Processing Batch...' : 'Upload CSV for Batch Prediction'}</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleBatchUpload}
                    disabled={batchLoading}
                    className="hidden"
                  />
                </label>
                {batchResults && (
                  <button
                    onClick={downloadBatchCSV}
                    className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Results ({batchResults.total_processed} rows)</span>
                  </button>
                )}
              </div>
              {batchError && (
                <p className="text-xs text-rose-600 mt-2">{batchError}</p>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Prediction Result & Explanation (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {prediction ? (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Prediction Hero Card */}
              {(() => {
                const cfg = CLASS_CONFIG[prediction.predicted_class] || CLASS_CONFIG.bus;
                const Icon = cfg.icon;
                const isMatch = activeHeldOut ? activeHeldOut.true_class === prediction.predicted_class : null;

                return (
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-5">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Predicted Category
                      </span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                        Latency: {prediction.latency_ms}ms
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-2xl ${cfg.bgLight} ${cfg.textClass} flex items-center justify-center shadow-inner`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                          {prediction.predicted_display}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Active Model: K={prediction.model_config_used?.k} • {prediction.model_config_used?.metric} • {prediction.model_config_used?.weights} voting
                        </p>
                      </div>
                    </div>

                    {/* Held-out comparison banner */}
                    {activeHeldOut && (
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                        isMatch 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className={`w-4 h-4 ${isMatch ? 'text-emerald-600' : 'text-amber-600'}`} />
                          <span>
                            <strong>Held-Out Ground Truth:</strong> {activeHeldOut.true_display}
                          </span>
                        </div>
                        <span className="font-bold px-2 py-0.5 rounded bg-white/80">
                          {isMatch ? 'Match!' : 'Mismatched'}
                        </span>
                      </div>
                    )}

                    {/* Plain Language Explanation */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-700 space-y-1.5">
                      <span className="font-bold text-slate-900 block">Explanation:</span>
                      <p className="leading-relaxed">{prediction.explanation}</p>
                    </div>

                    {/* Out of distribution alert */}
                    {prediction.is_ood && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Out-of-Distribution Warning:</strong>
                          <p className="mt-0.5 leading-relaxed">{prediction.ood_reason}</p>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}

              {/* Neighbor Vote Share Chart */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Neighbor Vote Share</h3>
                    <p className="text-xs text-slate-400">Proportion of votes among K nearest training instances</p>
                  </div>
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={voteShareData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => [`${value}% vote share`, 'Share']} />
                      <Bar dataKey="share" radius={[0, 6, 6, 0]}>
                        {voteShareData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start space-x-2">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Academic Disclaimer:</strong> "Neighbor vote share" represents local neighbor frequency/weight. It is <em>not</em> a calibrated posterior probability of correctness.
                  </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-card text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Awaiting Vehicle Input</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Fill the 18 geometric features on the left or click <strong>"Load Random Blind Test Sample"</strong> above to see instant explainable KNN predictions.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Full-Width Section: Nearest Neighbors Table & 2D Projection Scatter */}
      {prediction && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Actual K Nearest Neighbors Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Actual K Nearest Training Neighbors ({prediction.neighbors.length} Retrieved)
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated from fitted training partition using {prediction.model_config_used?.metric} distance across all 18 standardized dimensions.
                </p>
              </div>
              <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Weights: {prediction.model_config_used?.weights}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Train Index</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Scaled Distance</th>
                    <th className="py-2.5 px-3">Vote Weight</th>
                    <th className="py-2.5 px-3">Vote Share</th>
                    <th className="py-2.5 px-3">Comp</th>
                    <th className="py-2.5 px-3">Circ</th>
                    <th className="py-2.5 px-3">Scat.Ra</th>
                    <th className="py-2.5 px-3">Elong</th>
                    <th className="py-2.5 px-3">Sc.Var.maxis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prediction.neighbors.map((n) => {
                    const cfg = CLASS_CONFIG[n.class_name] || CLASS_CONFIG.bus;
                    const isZero = n.distance <= 1e-5;
                    return (
                      <tr key={n.rank} className="hover:bg-slate-50/80 transition-colors font-mono">
                        <td className="py-2.5 px-3 font-bold text-slate-700">#{n.rank}</td>
                        <td className="py-2.5 px-3 text-slate-400">row_{n.train_index}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${cfg.badgeClass}`}>
                            {n.display_name}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-bold">
                          {n.distance}
                          {isZero && <span className="ml-1 text-[10px] text-amber-600 font-sans font-bold">(Exact Match)</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{n.vote_weight}</td>
                        <td className="py-2.5 px-3 text-indigo-600 font-bold">{n.vote_share_pct}%</td>
                        <td className="py-2.5 px-3 text-slate-600">{n.features.Comp}</td>
                        <td className="py-2.5 px-3 text-slate-600">{n.features.Circ}</td>
                        <td className="py-2.5 px-3 text-slate-600">{n.features["Scat.Ra"]}</td>
                        <td className="py-2.5 px-3 text-slate-600">{n.features.Elong}</td>
                        <td className="py-2.5 px-3 text-slate-600">{n.features["Sc.Var.maxis"]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2D Feature Projection Scatter Plot */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">2D Feature Projection Visualization</h3>
                <p className="text-xs text-slate-500">
                  Explore how the query instance relates to its actual K nearest neighbors along any two chosen features.
                </p>
              </div>

              {/* Axis Selectors */}
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-500">X-Axis:</span>
                  <select
                    value={scatterX}
                    onChange={(e) => setScatterX(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700"
                  >
                    {allFeaturesList.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-500">Y-Axis:</span>
                  <select
                    value={scatterY}
                    onChange={(e) => setScatterY(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700"
                  >
                    {allFeaturesList.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2D Scatter Plot Display */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" dataKey="x" name={scatterX} label={{ value: scatterX, position: 'insideBottomRight', offset: -10, fontSize: 12 }} />
                  <YAxis type="number" dataKey="y" name={scatterY} label={{ value: scatterY, angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  
                  {/* Neighbors */}
                  <Scatter 
                    name="K Nearest Neighbors" 
                    data={scatterData.neighborsPoints} 
                    fill="#4F46E5"
                    shape="circle"
                  />

                  {/* Query input */}
                  <Scatter 
                    name="Query Vehicle (Input)" 
                    data={scatterData.queryPoint} 
                    fill="#F59E0B" 
                    shape="star"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Prominent Scientific Notice */}
            <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 text-xs text-amber-950 flex items-start space-x-2">
              <Compass className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Crucial Scientific Note:</strong> This chart shows a 2D projection on the two selected features (<code>{scatterX}</code> and <code>{scatterY}</code>). The KNN classifier calculates distances and selects nearest neighbors in the full <strong>18-dimensional standardized space</strong>, which is why neighbors may not appear closest strictly in this 2D view.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
