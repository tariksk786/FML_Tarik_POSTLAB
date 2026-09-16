import React, { useState, useEffect } from 'react';
import { 
  BookOpen, HelpCircle, ChevronDown, ChevronUp, UserCheck, 
  GraduationCap, Award, Video, Compass, CheckCircle2, Save, FileText, Cpu, AlertCircle
} from 'lucide-react';
import { fetchVivaContent } from '../api/client';

export default function LearnVivaSection() {
  const [vivaQuestions, setVivaQuestions] = useState([]);
  const [demoSteps, setDemoSteps] = useState([]);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [activeTab, setActiveTab] = useState('viva'); // 'viva' | 'demo' | 'theory' | 'student'

  // Editable Student Details with localStorage persistence
  const [studentDetails, setStudentDetails] = useState(() => {
    const saved = localStorage.getItem('vehiclesense_student_details');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      studentName: 'Tarik',
      usn: '1MS22AI001',
      department: 'Dept. of Artificial Intelligence & Machine Learning',
      college: 'College of Engineering & Technology',
      facultyGuide: 'Dr. Faculty Guide, Ph.D.',
      academicYear: '2025 - 2026'
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchVivaContent()
      .then((data) => {
        setVivaQuestions(data.viva_questions || []);
        setDemoSteps(data.demo_steps || []);
      })
      .catch((err) => console.error('Failed to load viva content:', err));
  }, []);

  const handleSaveStudentDetails = (e) => {
    e.preventDefault();
    localStorage.setItem('vehiclesense_student_details', JSON.stringify(studentDetails));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const toggleQuestion = (id) => {
    setOpenQuestion(openQuestion === id ? null : id);
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Learn & Project Details</h1>
        <p className="text-sm text-slate-500 mt-1">
          Academic project documentation, ML theory, 2-minute demonstration guide, and 10 FML viva questions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl">
        {[
          { id: 'viva', label: '10 FML Viva Q&A', icon: HelpCircle },
          { id: 'demo', label: '2-Min Demo Walkthrough', icon: Video },
          { id: 'theory', label: 'Machine Learning Theory', icon: BookOpen },
          { id: 'student', label: 'Student & Project Info', icon: GraduationCap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content: 10 Viva Q&A */}
      {activeTab === 'viva' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>College Viva Preparation:</strong> These 10 questions cover essential FML theoretical concepts, mathematical rationale, distance metrics, bias-variance tradeoffs, and production limitations for K-Nearest Neighbors.
            </p>
          </div>

          <div className="space-y-3">
            {vivaQuestions.map((q, idx) => {
              const isOpen = openQuestion === q.id;
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft transition-all"
                >
                  <button
                    onClick={() => toggleQuestion(q.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start space-x-3 pr-4">
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                        Q{idx + 1}
                      </span>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          {q.category}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">{q.question}</h3>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
                      <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-slate-700 font-sans">
                        {q.answer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content: 2-Minute Demonstration Script */}
      {activeTab === 'demo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">2-Minute Classroom Demonstration Guide</h2>
              <p className="text-xs text-slate-500">
                A structured, timed script designed for college viva evaluators and lab presentations.
              </p>
            </div>

            <div className="space-y-4">
              {demoSteps.map((step, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 font-mono">{step.step}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{step.action}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans italic bg-white p-3.5 rounded-xl border border-slate-200">
                    {step.script}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: ML Theory */}
      {activeTab === 'theory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                <span>Instance-Based Learning (Lazy Learner)</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unlike eager algorithms such as Logistic Regression or Neural Networks that construct an explicit internal model before receiving queries, KNN simply memorizes the training data. Generalization is deferred until classification time. This makes training virtually instantaneous ($O(1)$), but prediction computationally expensive ($O(N \times D)$).
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-teal-600" />
                <span>Feature Scaling (StandardScaler)</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Distance functions sum coordinate differences: <code>d(x,y) = sqrt(sum((x_i - y_i)^2))</code>. If feature A has range [100, 800] and feature B has range [1, 10], differences in A will overpower differences in B by orders of magnitude. <code>StandardScaler</code> computes <code>z = (x - μ) / σ</code>, placing all 18 dimensions on an equal statistical footing.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span>Distance Metrics: Euclidean vs Manhattan</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Euclidean (L2 norm):</strong> The straight-line Pythagorean distance: <code>d(x,y) = sqrt(sum((x_i - y_i)^2))</code>. Quadratic penalty makes it sensitive to extreme values.<br />
                <strong>Manhattan (L1 norm):</strong> Sum of absolute coordinate distances: <code>d(x,y) = sum(|x_i - y_i|)</code>. It represents grid-like travel and often performs more robustly in higher-dimensional geometric spaces.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Bias-Variance Tradeoff in KNN</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Small K (e.g. K=1):</strong> Highly flexible decision boundary. Prone to capturing noise and training outliers (low bias, high variance).<br />
                <strong>Large K (e.g. K=15):</strong> Extremely smooth boundary. May miss local clusters and simply predict the majority class (high bias, low variance).
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Tab Content: Student & Project Info */}
      {activeTab === 'student' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6 max-w-2xl">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Student & College Information</h2>
            <p className="text-xs text-slate-500">
              Customize these details for your lab report, project submission, or evaluator presentation.
            </p>
          </div>

          <form onSubmit={handleSaveStudentDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Student Name</label>
                <input
                  type="text"
                  value={studentDetails.studentName}
                  onChange={(e) => setStudentDetails({ ...studentDetails, studentName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">USN / Roll Number</label>
                <input
                  type="text"
                  value={studentDetails.usn}
                  onChange={(e) => setStudentDetails({ ...studentDetails, usn: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Department</label>
              <input
                type="text"
                value={studentDetails.department}
                onChange={(e) => setStudentDetails({ ...studentDetails, department: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">College / University</label>
              <input
                type="text"
                value={studentDetails.college}
                onChange={(e) => setStudentDetails({ ...studentDetails, college: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Faculty Guide</label>
                <input
                  type="text"
                  value={studentDetails.facultyGuide}
                  onChange={(e) => setStudentDetails({ ...studentDetails, facultyGuide: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Academic Year</label>
                <input
                  type="text"
                  value={studentDetails.academicYear}
                  onChange={(e) => setStudentDetails({ ...studentDetails, academicYear: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center space-x-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Details</span>
              </button>
              {savedSuccess && (
                <span className="text-xs text-emerald-600 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved to local storage!</span>
                </span>
              )}
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
