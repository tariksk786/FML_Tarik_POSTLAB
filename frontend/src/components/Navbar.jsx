import React, { useState } from 'react';
import { Layers, Activity, Sparkles, Database, Cpu, BookOpen, Menu, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, modelStatus, isBackendOnline }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'classify', label: 'Classify Vehicle', icon: Sparkles },
    { id: 'dataset', label: 'Dataset Explorer', icon: Database },
    { id: 'modellab', label: 'Model Lab', icon: Cpu },
    { id: 'learn', label: 'Learn & Viva', icon: BookOpen },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">VehicleSense</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  FML PBL
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Explainable KNN Classification</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 shadow-xs border border-indigo-100 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Model Status Badge */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
              <span className="font-medium">
                {isBackendOnline ? (
                  modelStatus?.is_trained ? (
                    <>Active: <span className="text-indigo-600 font-semibold">K={modelStatus.last_train_response?.active_k}</span> ({modelStatus.last_train_response?.active_metric}) • Test Acc: <span className="text-emerald-600 font-semibold">{(modelStatus.last_train_response?.test_accuracy * 100).toFixed(1)}%</span></>
                  ) : (
                    'Model Untrained'
                  )
                ) : (
                  'Backend Offline'
                )}
              </span>
            </div>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100 px-4 text-xs text-slate-500 flex items-center justify-between">
            <span>Status:</span>
            <span className={isBackendOnline ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {isBackendOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
