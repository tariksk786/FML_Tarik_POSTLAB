import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OverviewSection from './components/OverviewSection';
import ClassifySection from './components/ClassifySection';
import DatasetExplorer from './components/DatasetExplorer';
import ModelLabSection from './components/ModelLabSection';
import LearnVivaSection from './components/LearnVivaSection';
import { fetchHealth, fetchDatasetSummary, getModelStatus } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [summary, setSummary] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Poll backend health and status
  const refreshState = async () => {
    try {
      await fetchHealth();
      setIsBackendOnline(true);

      const [sumData, statusData] = await Promise.all([
        fetchDatasetSummary(),
        getModelStatus(),
      ]);
      setSummary(sumData);
      setModelStatus(statusData);
    } catch (err) {
      console.warn('Backend unavailable:', err);
      setIsBackendOnline(false);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    refreshState();
    // Re-check periodically
    const interval = setInterval(refreshState, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#172033] flex flex-col font-sans">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        modelStatus={modelStatus}
        isBackendOnline={isBackendOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'overview' && (
          <OverviewSection
            summary={summary}
            modelStatus={modelStatus}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'classify' && (
          <ClassifySection
            summary={summary}
            modelStatus={modelStatus}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetExplorer
            summary={summary}
            onDatasetUpdated={refreshState}
          />
        )}

        {activeTab === 'modellab' && (
          <ModelLabSection
            modelStatus={modelStatus}
            onModelTrained={(trainRes) => {
              setModelStatus({ is_trained: true, last_train_response: trainRes });
            }}
          />
        )}

        {activeTab === 'learn' && (
          <LearnVivaSection />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-bold text-slate-800">VehicleSense</span> — Fundamentals of Machine Learning Problem-Based Learning (PBL) Project
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>scikit-learn • StandardScaler • KNN Pipeline</span>
            <span>•</span>
            <span>Turing Institute / Kaggle Benchmark</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
