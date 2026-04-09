import React, { useEffect, useState } from 'react';
import { buildWebSocketUrl } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

interface CBOMRecord {
  id: string;
  asset_id: string;
  algorithm_name: string;
  category: string;
  pqc_status: string;
  usage_context: string;
  quantum_risk_score?: number;
  replacement_algorithm?: string;
  last_confirmed?: string;
  discovery_methods?: string[];
  asset_name?: string;
}

const CBOMRecordsPage: React.FC = () => {
  const [records, setRecords] = useState<CBOMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/v1/cbom/');
      if (!response.ok) throw new Error('Failed to fetch CBOM records');
      const data = await response.json();
      setRecords(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Auto-refresh when scans complete via WebSocket
  useWebSocket<{ type: string; data?: any }>({
    url: buildWebSocketUrl('/api/v1/assets/ws/matrix'),
    onMessage: (message) => {
      if (message.type === 'asset_matrix_updated') {
        fetchRecords();
      }
    },
    reconnectDelay: 3000,
  });

  const getReadinessStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
      case 'safe': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'hybrid': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'at risk':
      case 'classical': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'critical':
      case 'deprecated': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark overflow-hidden font-display">
      {/* Page Header & Filters */}
      <div className="p-6 shrink-0 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cryptographic Bill of Materials</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Inventory and post-quantum readiness status derived from Network, Source Code, and Container scans.</p>
          </div>
          {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <div className="text-[10px] font-black uppercase text-slate-400 mr-2">Discovery Filters:</div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-green-900/10 text-green-600 dark:text-green-400 rounded text-xs font-bold border border-green-900/20">
            <span className="material-symbols-outlined text-sm">network_check</span>
            <span>Network</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded text-xs font-bold border border-blue-900/20">
            <span className="material-symbols-outlined text-sm">code</span>
            <span>Source Repos</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/10 text-purple-600 dark:text-purple-400 rounded text-xs font-bold border border-purple-900/20">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            <span>Containers</span>
          </button>
        </div>
      </div>

      {error && <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">{error}</div>}

      {/* Table Container */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-panel-dark shadow-sm">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-panel-dark shadow-[0_1px_0_0_rgba(203,213,225,1)] dark:shadow-[0_1px_0_0_rgba(36,54,71,1)]">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">Algorithm / Identity</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">Category</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">Usage Context</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">Replacement</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">Discovery Methods</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">PQC Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {records.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">No CBOM records found. Run a hybrid scan to populate this inventory.</td>
                  </tr>
                )}
                {records.map((record, i) => (
                  <tr key={record.id || i} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-4 py-4 border-r border-slate-100 dark:border-slate-800">
                      <div className="text-sm font-bold">{record.algorithm_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{record.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono border-r border-slate-100 dark:border-slate-800 uppercase text-slate-500 dark:text-slate-400">
                      {record.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-4 text-xs border-r border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      {record.usage_context.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-4 text-xs font-bold border-r border-slate-100 dark:border-slate-800 text-primary">
                      {record.replacement_algorithm || 'Pending AI Playbook'}
                    </td>
                    <td className="px-4 py-4 border-r border-slate-100 dark:border-slate-800">
                      <div className="flex gap-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-tighter">Hybrid Scan</span>
                        {record.discovery_methods?.map(m => (
                           <span key={m} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-tighter">{m.split('_')[0]}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-tighter ${getReadinessStyle(record.pqc_status)}`}>
                        {record.pqc_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Table Footer */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-panel-dark border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">SHOWING {records.length} RECORDS</p>
            <div className="text-[10px] text-slate-400">Auto-refresh active via WebSocket</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CBOMRecordsPage;
