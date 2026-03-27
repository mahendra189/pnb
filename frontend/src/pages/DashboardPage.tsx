import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildWebSocketUrl, dashboardAPI, devAPI } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

type DashboardSnapshot = {
  source: string;
  generated_at: string;
  summary: {
    total: number;
    scanned: number;
    critical: number;
    pqc_ready: number;
    non_ready: number;
    cert_expiring: number;
    coverage_percent: number;
    last_scan_at: string | null;
  };
  alerts: Array<{
    title: string;
    target: string;
    severity: string;
    message: string;
  }>;
  recent_activity: Array<{
    asset_id: string;
    host: string;
    score: number;
    delta: number;
    status: string;
    trend: 'up' | 'down' | 'even';
    last_scanned: string | null;
  }>;
  risk_summary: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
  inventory_distribution: {
    algorithms: Array<{ label: string; count: number }>;
    protocols: Array<{ label: string; count: number }>;
  };
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardAPI.getOverview()
      .then((response: any) => setSnapshot(response))
      .catch((err) => setError(err.message));
  }, []);

  useWebSocket<{ type: string; data?: DashboardSnapshot }>({
    url: buildWebSocketUrl('/api/v1/dashboard/ws'),
    onMessage: (message) => {
      if (message.type === 'snapshot' && message.data) {
        setSnapshot(message.data);
        setError(null);
      }
    },
    reconnectDelay: 3000,
  });

  const widgets = useMemo(() => {
    const summary = snapshot?.summary;
    return [
      { label: 'Total Assets', value: summary?.total ?? '...', icon: 'devices', color: 'text-primary' },
      { label: 'Scanned', value: summary?.scanned ?? '...', icon: 'biotech', color: 'text-primary' },
      { label: 'High Risk', value: summary?.critical ?? '...', icon: 'warning', color: 'text-red-500' },
      { label: 'PQC-Ready', value: summary?.pqc_ready ?? '...', icon: 'verified_user', color: 'text-green-500' },
      { label: 'Non-Ready', value: summary?.non_ready ?? '...', icon: 'gpp_maybe', color: 'text-amber-500' },
      { label: 'Cert Expiring', value: summary?.cert_expiring ?? '...', icon: 'timer', color: 'text-amber-500' },
    ];
  }, [snapshot]);

  const formatTime = (value: string | null | undefined) => {
    if (!value) return 'No completed scan yet';
    return new Date(value).toLocaleString();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Live PQC Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Source: <span className="font-semibold">{snapshot?.source ?? 'loading'}</span>
            {' '}• Last generated: {snapshot ? formatTime(snapshot.generated_at) : 'Loading...'}
          </p>
        </div>
        <button
          onClick={async () => {
            await devAPI.simulateScan();
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs hover:brightness-110 transition-colors"
        >
          SIMULATE LIVE UPDATE
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {widgets.map((widget) => (
          <div key={widget.label} className="bg-white dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="mb-2 flex items-start justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{widget.label}</p>
              <span className={`material-symbols-outlined text-xl ${widget.color}`}>{widget.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{widget.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm">Recent Scan Activity</h3>
            <button onClick={() => navigate('/scan-results')} className="text-[11px] font-bold text-primary hover:underline">VIEW RESULTS</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-[11px] font-bold uppercase text-slate-500">Host</th>
                  <th className="p-3 text-[11px] font-bold uppercase text-slate-500">Current Score</th>
                  <th className="p-3 text-[11px] font-bold uppercase text-slate-500">Delta</th>
                  <th className="p-3 text-[11px] font-bold uppercase text-slate-500">Result</th>
                  <th className="p-3 text-[11px] font-bold uppercase text-slate-500">Scanned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {snapshot?.recent_activity.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3 text-xs font-mono">{asset.host}</td>
                    <td className="p-3 text-xs font-bold">{asset.score.toFixed(1)}</td>
                    <td className={`p-3 text-xs font-bold ${asset.delta > 0 ? 'text-red-500' : asset.delta < 0 ? 'text-green-500' : 'text-slate-500'}`}>
                      {asset.delta > 0 ? '+' : ''}{asset.delta.toFixed(1)}
                    </td>
                    <td className="p-3 text-xs capitalize">{asset.status.replace(/_/g, ' ')}</td>
                    <td className="p-3 text-xs text-slate-500">{formatTime(asset.last_scanned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-sm mb-6">Risk Level Summary</h3>
          <div className="space-y-4">
            {snapshot?.risk_summary.map((risk) => (
              <div key={risk.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium capitalize">{risk.label}</span>
                  <span className="text-xs font-bold">{risk.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${risk.label === 'critical' ? 'bg-red-500' : risk.label === 'high' ? 'bg-orange-500' : risk.label === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${risk.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-center">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Scan Coverage</p>
            <p className="text-3xl font-bold text-primary">{snapshot?.summary.coverage_percent.toFixed(1) ?? '0.0'}%</p>
            <p className="text-[10px] text-slate-400 mt-1">Last scan: {formatTime(snapshot?.summary.last_scan_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-sm mb-6">Critical Security Alerts</h3>
          <div className="space-y-3">
            {snapshot?.alerts.map((alert, index) => (
              <div key={`${alert.target}-${index}`} className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{alert.title}</p>
                    <p className="text-[10px] text-slate-500">Target: <span className="font-mono">{alert.target}</span></p>
                    <p className="mt-1 text-[11px] text-red-500">{alert.message}</p>
                  </div>
                  <span className="rounded bg-red-500 px-2 py-1 text-[10px] font-black text-white">{alert.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-sm mb-6">Inventory Distribution</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Algorithms</p>
              <div className="space-y-2">
                {snapshot?.inventory_distribution.algorithms.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Protocols</p>
              <div className="space-y-2">
                {snapshot?.inventory_distribution.protocols.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
