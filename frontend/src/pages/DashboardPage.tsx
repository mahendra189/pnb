import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Summary {
  total: number;
  critical: number;
  pqcReady: number;
  safe: number;
}

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch summary and assets from backend (using existing logic)
    fetch('/api/v1/assets')
      .then(r => r.json())
      .then((d: { items: any[] }) => {
        const items = d.items ?? [];
        setAssets(items);
        setSummary({
          total: items.length,
          critical: items.filter((a: any) => a.risk_band === 'critical').length,
          pqcReady: items.filter((a: any) => a.quantum_label === 'pqc_ready').length,
          safe: items.filter((a: any) => a.quantum_label === 'fully_quantum_safe').length,
        });
      })
      .catch((err) => console.error("Error fetching assets:", err));
  }, []);

  const RISK_COLOR: Record<string, string> = {
    critical: 'text-red-500', 
    high: 'text-orange-500',
    medium: 'text-amber-500', 
    low: 'text-green-500',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Status Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Assets', value: summary?.total ?? '...', icon: 'devices', color: 'text-primary' },
          { label: 'Scanned', value: summary?.total ?? '...', icon: 'biotech', color: 'text-primary' },
          { label: 'High Risk', value: summary?.critical ?? '...', icon: 'warning', color: 'text-red-500' },
          { label: 'PQC-Ready', value: summary?.pqcReady ?? '...', icon: 'verified_user', color: 'text-green-500' },
          { label: 'Non-Ready', value: (summary?.total ?? 0) - (summary?.pqcReady ?? 0) - (summary?.safe ?? 0), icon: 'gpp_maybe', color: 'text-amber-500' },
          { label: 'Cert Expiring', value: '12', icon: 'timer', color: 'text-amber-500' },
        ].map((widget, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800 swing-border">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{widget.label}</p>
              <span className={`material-symbols-outlined ${widget.color} text-xl`}>{widget.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${widget.label === 'High Risk' ? 'text-red-500' : ''}`}>{widget.value}</p>
            <p className={`text-[11px] ${widget.label === 'High Risk' || widget.label === 'Cert Expiring' ? 'text-red-500' : 'text-green-500'} mt-1 flex items-center font-medium`}>
              <span className="material-symbols-outlined text-[14px]">
                {widget.label === 'High Risk' || widget.label === 'Cert Expiring' ? 'arrow_downward' : 'arrow_upward'}
              </span> 5.2%
            </p>
          </div>
        ))}
      </div>

      {/* Main Grid: Activity & Risk */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Scan Activity */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              <h3 className="font-bold text-sm">Recent Scan Activity</h3>
            </div>
            <button className="text-[11px] font-bold text-primary hover:underline">VIEW ALL</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Host / Target</th>
                  <th className="p-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Algorithm</th>
                  <th className="p-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">HNDL Score</th>
                  <th className="p-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Result</th>
                  <th className="p-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.slice(0, 5).map((asset, i) => (
                  <tr key={asset.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-xs font-mono">{asset.host}</td>
                    <td className="p-3 text-xs">{asset.algo}</td>
                    <td className={`p-3 text-xs font-bold ${RISK_COLOR[asset.risk_band] || ''}`}>{asset.hndl_score}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        asset.quantum_label === 'pqc_ready' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {asset.quantum_label?.replace(/_/g, ' ') || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors">visibility</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Level Summary */}
        <div className="bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">donut_large</span>
            <h3 className="font-bold text-sm">Risk Level Summary</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col gap-6">
              {[
                { label: 'Critical Risk', value: '8%', color: 'bg-red-500', textColor: 'text-red-500' },
                { label: 'High Risk', value: '14%', color: 'bg-orange-500', textColor: 'text-orange-500' },
                { label: 'Medium Risk', value: '22%', color: 'bg-amber-500', textColor: 'text-amber-500' },
                { label: 'Safe / PQC Ready', value: '56%', color: 'bg-green-500', textColor: 'text-green-500' },
              ].map((risk, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium">{risk.label}</span>
                    <span className={`text-xs font-bold ${risk.textColor}`}>{risk.value}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${risk.color} rounded-full`} style={{ width: risk.value }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">SCAN COVERAGE</p>
              <p className="text-3xl font-bold text-primary">82.8%</p>
              <p className="text-[10px] text-slate-400 mt-1 italic">Scan completed 14 minutes ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: PQC Classification & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800/40 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">analytics</span>
            <h3 className="font-bold text-sm">PQC Transition Readiness</h3>
          </div>
          <div className="h-40 flex items-end justify-between gap-4 px-2">
            {[30, 45, 65, 80, 95].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/40 cursor-default" 
                  style={{ height: `${h}%`, opacity: 0.2 + (i * 0.2) }}
                ></div>
                <span className="text-[10px] text-slate-500 font-bold">Q{((i + 2) % 4) + 1} {23 + Math.floor((i + 2) / 4)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-primary text-white p-6 rounded-lg border border-primary relative overflow-hidden group">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Initialize Global Scan</h3>
              <p className="text-white/80 text-xs opacity-90 leading-relaxed max-w-sm">
                Run a comprehensive quantum-risk assessment across all registered endpoints and cloud assets in your organization.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/scan')}
                className="px-4 py-2 bg-white text-primary rounded font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                START NEW SCAN
              </button>
              <button className="px-4 py-2 bg-primary/20 border border-white/30 rounded font-bold text-xs hover:bg-white/10 transition-colors">CONFIGURE PARAMETERS</button>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -bottom-10 -right-10 text-[180px] opacity-10 pointer-events-none group-hover:scale-110 transition-transform">bolt</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
