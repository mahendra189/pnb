import React, { useEffect, useState } from 'react';
import { assetsAPI } from '../api/client';
import type { AssetChangeRecord, AssetHistoryEntry, AssetMatrixRow } from '../types';

const ScanResultsPage: React.FC = () => {
  const [results, setResults] = useState<AssetMatrixRow[]>([]);
  const [selectedResult, setSelectedResult] = useState<AssetMatrixRow | null>(null);
  const [history, setHistory] = useState<AssetHistoryEntry[]>([]);
  const [changes, setChanges] = useState<AssetChangeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    assetsAPI.getMatrix()
      .then((response: any) => {
        const items = response.items ?? [];
        setResults(items);
        setSelectedResult(items[0] ?? null);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedResult) return;
    Promise.all([assetsAPI.getHistory(selectedResult.id), assetsAPI.getChanges(selectedResult.id)])
      .then(([historyRows, changeRows]: any) => {
        setHistory(historyRows ?? []);
        setChanges(changeRows ?? []);
      })
      .catch((err) => setError(err.message));
  }, [selectedResult]);

  const getStatusColor = (status: string) => {
    if (status === 'scanned') return 'bg-primary/20 text-primary';
    if (status === 'scanning') return 'bg-yellow-500/20 text-yellow-500';
    if (status === 'failed') return 'bg-red-500/20 text-red-500';
    return 'bg-slate-500/20 text-slate-500';
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-6 bg-background-light p-8 dark:bg-background-dark">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Historical Scan Results</h2>
        <button onClick={() => window.location.reload()} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-primary dark:border-slate-700">REFRESH</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="font-bold text-sm">Current Matrix Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Asset ID</th>
                  <th className="px-6 py-3 font-semibold">Asset</th>
                  <th className="px-6 py-3 font-semibold">TLS</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {results.map((result) => (
                  <tr key={result.id} onClick={() => setSelectedResult(result)} className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${selectedResult?.id === result.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                    <td className="px-6 py-4 font-medium">{result.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{result.asset}</td>
                    <td className="px-6 py-4">{result.tls_version ?? 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${getStatusColor(result.status)}`}>{result.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-primary px-6 py-4 text-white">
              <h3 className="font-bold text-sm">Asset Detailed Analysis</h3>
            </div>
            {selectedResult ? (
              <div className="space-y-4 p-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Asset</label>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedResult.asset}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TLS Version</label>
                    <p className="text-sm">{selectedResult.tls_version ?? 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PQC Status</label>
                    <p className="text-sm capitalize">{selectedResult.pqc_status ?? 'unknown'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cipher Suite</label>
                  <p className="rounded border border-slate-200 bg-slate-100 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">{selectedResult.cipher ?? 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observed At</label>
                  <p className="text-sm text-slate-500">{selectedResult.last_scanned_at ? new Date(selectedResult.last_scanned_at).toLocaleString() : 'Not scanned yet'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">History Timeline</label>
                  <div className="mt-2 space-y-2">
                    {history.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded border border-slate-200 p-2 text-xs dark:border-slate-700">
                        <div className="font-semibold">{entry.tls_version ?? 'Unknown'} • {entry.cipher ?? 'Unknown'}</div>
                        <div className="text-slate-500">{new Date(entry.recorded_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detected Changes</label>
                  <div className="mt-2 space-y-2">
                    {changes.slice(0, 5).map((change) => (
                      <div key={change.id} className={`rounded border px-3 py-2 text-xs ${change.change_type === 'downgrade' ? 'border-red-500/30 bg-red-500/5 text-red-500' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div className="font-semibold uppercase">{change.field_name}</div>
                        <div>{change.old_value ?? 'none'} → {change.new_value ?? 'none'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-slate-500">No scan result available yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanResultsPage;
