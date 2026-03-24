import React from 'react';

const PQCClassificationPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6 font-display">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Post-Quantum Classification</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Inventory ID: PRJ-992-SEC • Last scan: 2 hours ago</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">refresh</span> Re-scan
            </button>
            <button className="bg-primary hover:bg-primary/90 px-4 py-2 rounded text-sm font-medium text-white flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
              <span className="material-symbols-outlined text-sm">download</span> Export Data
            </button>
          </div>
        </div>

        {/* Classification Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'PQC-Ready', color: 'emerald', icon: 'check_circle', value: '42', desc: 'Assets using Crystals-Kyber or Dilithium', trend: '+12%', trendLabel: 'GROWTH FROM LAST SCAN' },
            { label: 'Partially Ready', color: 'amber', icon: 'hourglass_empty', value: '18', desc: 'Hybrid schemes with legacy fallback', trend: '0%', trendLabel: 'STABLE STATUS' },
            { label: 'Non-Ready', color: 'rose', icon: 'dangerous', value: '104', desc: 'Standard RSA, Elliptic Curve, or AES-128', trend: '+4 assets', trendLabel: 'HIGH RISK ASSETS' },
          ].map((panel, i) => (
            <div key={i} className={`bg-white dark:bg-panel-dark p-5 rounded-lg border border-slate-200 dark:border-border-dark border-l-4 border-l-${panel.color}-500 shadow-sm`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold text-${panel.color}-500 uppercase tracking-widest`}>{panel.label}</span>
                <span className={`material-symbols-outlined text-${panel.color}-500/50`}>{panel.icon}</span>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{panel.value}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{panel.desc}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-border-dark flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>{panel.trendLabel}</span>
                <span className={panel.trend.includes('+') ? `text-${panel.color}-500` : ''}>{panel.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Algorithm Comparison Table */}
          <div className="lg:col-span-2 bg-white dark:bg-panel-dark rounded-lg border border-slate-200 dark:border-border-dark flex flex-col shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-black/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Algorithm Comparison View</h3>
              <div className="flex gap-1">
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-black/40 text-[10px] text-slate-600 dark:text-slate-500 border border-slate-300 dark:border-border-dark">Filtered: Critical Only</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-black/20 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-border-dark">Service / Asset</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-border-dark">Current Algorithm</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-border-dark">Recommended PQC</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-border-dark">Complexity</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100 dark:divide-border-dark text-slate-700 dark:text-slate-300">
                  {[
                    { asset: 'User Authentication (API)', current: 'RSA-2048', recommend: 'ML-KEM (Kyber-768)', complexity: 'MEDIUM', complexityColor: 'amber' },
                    { asset: 'Database Encryption (At Rest)', current: 'AES-128-GCM', recommend: 'AES-256-XTS', complexity: 'LOW', complexityColor: 'emerald' },
                    { asset: 'Internal Microservices TLS', current: 'ECDH (P-256)', recommend: 'X25519 + Kyber Hybrid', complexity: 'HIGH', complexityColor: 'rose' },
                    { asset: 'Firmware Digital Signatures', current: 'RSA-4096', recommend: 'ML-DSA (Dilithium3)', complexity: 'MEDIUM', complexityColor: 'amber' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-900 dark:text-slate-100">{row.asset}</td>
                      <td className="px-4 py-4"><span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${row.current.includes('RSA') || row.current.includes('ECDH') ? 'bg-rose-500' : 'bg-amber-500'}`}></span> {row.current}</span></td>
                      <td className="px-4 py-4 text-emerald-600 dark:text-emerald-500 font-bold">{row.recommend}</td>
                      <td className="px-4 py-4"><span className={`px-2 py-1 rounded bg-${row.complexityColor}-500/10 text-${row.complexityColor}-600 dark:text-${row.complexityColor}-500 text-[10px] font-bold border border-${row.complexityColor}-500/20`}>{row.complexity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-black/10 border-t border-slate-200 dark:border-border-dark flex items-center justify-between">
              <span className="text-xs text-slate-500 italic">Showing 4 of 164 detected cryptographic assets</span>
              <button className="text-xs text-primary font-bold hover:underline">View All Assets →</button>
            </div>
          </div>

          {/* Migration Suggestion Panel */}
          <div className="bg-white dark:bg-panel-dark rounded-lg border border-slate-200 dark:border-border-dark flex flex-col h-full shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-border-dark bg-primary/5">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">lightbulb</span>
                Intelligent Suggestions
              </h3>
            </div>
            <div className="p-4 flex-1 space-y-4">
              <div className="p-3 rounded border border-slate-200 dark:border-border-dark/50 bg-slate-50 dark:bg-black/30">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-sm">priority_high</span>
                  Immediate Priority: TLS 1.2
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  14 endpoints are still using TLS 1.2 with RSA-2048 key exchange. Transition to TLS 1.3 with Hybrid ECDH + Kyber768 to mitigate "Store Now, Decrypt Later" risks.
                </p>
                <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold py-1.5 rounded transition-all">
                  VIEW MIGRATION PATH
                </button>
              </div>
              <div className="p-3 rounded border border-slate-200 dark:border-border-dark/50 bg-slate-50 dark:bg-black/30">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                  FIPS 140-3 Compliance
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  Detected 6 non-compliant hash functions (SHA-1). Upgrade to SHA-3 (Keccak) recommended for quantum resistance in signature schemes.
                </p>
                <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold py-1.5 rounded transition-all">
                  PATCH DOCUMENTATION
                </button>
              </div>
              <div className="bg-slate-100 dark:bg-black/20 p-3 rounded border border-dashed border-slate-300 dark:border-border-dark text-center">
                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">auto_awesome</span>
                <p className="text-[10px] text-slate-500 italic">Analyzing traffic patterns for more suggestions...</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-border-dark">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-border-dark">
                  <span className="material-symbols-outlined text-slate-500">robot_2</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">AI Security Auditor</div>
                  <div className="text-[9px] text-slate-500">Models: GPT-4o Crypto-Specialist</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="bg-white dark:bg-panel-dark rounded-lg border border-slate-200 dark:border-border-dark p-4 flex flex-wrap gap-8 items-center justify-between shadow-sm">
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average Transition Cost</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200">$14,200 <span className="text-xs font-normal text-slate-500">/ project</span></div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mean Time To Compliance</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200">14.2 Days</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scan Accuracy</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200">99.8%</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 font-medium">Version 2.4.0-Stable</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              <span className="w-2 h-2 rounded-full bg-primary"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PQCClassificationPage;
