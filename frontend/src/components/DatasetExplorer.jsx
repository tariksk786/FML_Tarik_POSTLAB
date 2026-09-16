import React, { useState, useEffect } from 'react';
import { 
  Database, Upload, Download, Search, Filter, RefreshCw, 
  ChevronLeft, ChevronRight, BarChart2, PieChart, Info, ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, CartesianGrid, Legend
} from 'recharts';
import { CLASS_CONFIG } from '../utils/constants';
import { fetchDatasetRows, uploadDatasetFile, getDatasetDownloadUrl } from '../api/client';

export default function DatasetExplorer({ summary, onDatasetUpdated }) {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loadingRows, setLoadingRows] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Scatter feature selectors
  const [scatterX, setScatterX] = useState('Scat.Ra');
  const [scatterY, setScatterY] = useState('Elong');

  // Load rows when pagination/filters change
  useEffect(() => {
    loadRows();
  }, [page, pageSize, classFilter, search]);

  const loadRows = async () => {
    setLoadingRows(true);
    try {
      const data = await fetchDatasetRows(page, pageSize, classFilter, search);
      setRows(data.rows || []);
      setTotalRows(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load dataset rows:', err);
    } finally {
      setLoadingRows(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg(null);
    setUploadError(null);
    try {
      const res = await uploadDatasetFile(file);
      setUploadMsg(`Successfully loaded ${res.report?.total_rows} rows. Existing model invalidated.`);
      if (onDatasetUpdated) onDatasetUpdated();
      setPage(1);
      loadRows();
    } catch (err) {
      setUploadError(err.message || 'Dataset upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const classDistData = summary?.class_distribution ? Object.entries(summary.class_distribution).map(([k, count]) => ({
    key: k,
    name: CLASS_CONFIG[k]?.label || k,
    count,
    color: CLASS_CONFIG[k]?.color || '#4F46E5'
  })) : [];

  const featureList = summary?.features_stats?.map(s => s.name) || [];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dataset Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, inspect feature statistics, and manage vehicle silhouette records.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 cursor-pointer transition-colors flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Validating CSV...' : 'Upload Custom CSV'}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>

          <a
            href={getDatasetDownloadUrl(false)}
            download="vehicle_dataset.csv"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Active CSV</span>
          </a>

          <a
            href={getDatasetDownloadUrl(true)}
            download="vehicle_input_template.csv"
            className="px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs transition-colors flex items-center space-x-1.5"
            title="Download blank template with correct headers"
          >
            <span>Template CSV</span>
          </a>
        </div>
      </div>

      {/* Upload alerts */}
      {uploadMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{uploadMsg}</span>
        </div>
      )}
      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Overview Cards: Provenance & Class Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dataset Provenance & Scope (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Provenance & Experimental Scope</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
              Fingerprint: {summary?.dataset_fingerprint || 'e89c372f'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {summary?.data_source}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Records</span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">{summary?.total_rows || 846}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Features</span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">18 numeric</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Missing Values</span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">{summary?.missing_values_count || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Duplicate Rows</span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">{summary?.duplicate_count || 0}</div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-indigo-600">
            <a
              href="https://www.kaggle.com/datasets/anairamcosta/vehicle-csv"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 hover:underline font-semibold"
            >
              <span>Kaggle Dataset Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://archive.ics.uci.edu/dataset/149/statlog+vehicle+silhouettes"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 hover:underline text-slate-500 hover:text-slate-800"
            >
              <span>UCI Statlog Archive (Siebert 1987)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Class Distribution Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Class Distribution</h3>
            <span className="text-xs text-slate-400">4 Categories</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDistData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} instances`, 'Count']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {classDistData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            {classDistData.map((c) => (
              <div key={c.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="font-medium text-slate-700">{c.name}</span>
                </div>
                <span className="font-bold font-mono text-slate-900">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Searchable Paginated Dataset Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
        
        {/* Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Dataset Records Table</h3>
            <p className="text-xs text-slate-500">Showing {rows.length} of {totalRows} records</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search class or value..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48"
              />
            </div>

            {/* Class filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => { setClassFilter(''); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  classFilter === '' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                All
              </button>
              {['bus', 'van', 'saab', 'opel'].map((k) => (
                <button
                  key={k}
                  onClick={() => { setClassFilter(k); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    classFilter === k ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  {CLASS_CONFIG[k]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Comp</th>
                <th className="py-3 px-3">Circ</th>
                <th className="py-3 px-3">D.Circ</th>
                <th className="py-3 px-3">Rad.Ra</th>
                <th className="py-3 px-3">Pr.Axis.Ra</th>
                <th className="py-3 px-3">Max.L.Ra</th>
                <th className="py-3 px-3">Scat.Ra</th>
                <th className="py-3 px-3">Elong</th>
                <th className="py-3 px-3">Sc.Var.Maxis</th>
                <th className="py-3 px-3">Sc.Var.maxis</th>
                <th className="py-3 px-3">Ra.Gyr</th>
                <th className="py-3 px-3">Holl.Ra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loadingRows ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading dataset rows...</span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const cfg = CLASS_CONFIG[row.Class] || CLASS_CONFIG.bus;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-sans">{row.id + 1}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${cfg.badgeClass}`}>
                          {row.ClassDisplay}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{row.Comp}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row.Circ}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["D.Circ"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Rad.Ra"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Pr.Axis.Ra"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Max.L.Ra"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Scat.Ra"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row.Elong}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Sc.Var.Maxis"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Sc.Var.maxis"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Ra.Gyr"]}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row["Holl.Ra"]}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between text-xs pt-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-slate-500">
              Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong>
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Feature Summaries & Statistical Distribution Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900">18 Feature Summaries & Statistical Moments</h3>
          <p className="text-xs text-slate-500">
            Observed values across the dataset showing mean, dispersion, and range for each geometric property.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Feature Key</th>
                <th className="py-2.5 px-3">Label</th>
                <th className="py-2.5 px-3">Group</th>
                <th className="py-2.5 px-3">Mean</th>
                <th className="py-2.5 px-3">Std Dev</th>
                <th className="py-2.5 px-3">Median</th>
                <th className="py-2.5 px-3">Min</th>
                <th className="py-2.5 px-3">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {summary?.features_stats?.map((stat) => (
                <tr key={stat.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-bold text-indigo-700">{stat.name}</td>
                  <td className="py-2 px-3 font-sans text-slate-800">{stat.label}</td>
                  <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">{stat.group}</td>
                  <td className="py-2 px-3 text-slate-700">{stat.mean}</td>
                  <td className="py-2 px-3 text-slate-700">{stat.std}</td>
                  <td className="py-2 px-3 text-slate-700">{stat.median}</td>
                  <td className="py-2 px-3 text-slate-500">{stat.min}</td>
                  <td className="py-2 px-3 text-slate-500">{stat.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
