import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../api/client';

interface ScanResult {
  id: string;
  host: string;
  protocol: string;
  status: 'Secure' | 'Weak' | 'Expired' | 'PQC-Ready' | 'Non-Ready';
  tlsVersion: string;
  cipherSuite: string;
  keyAlgo: string;
  expiry: string;
  timestamp: string;
}

const ScanResultsPage: React.FC = () => {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardAPI.getScanResults()
      .then((response: any) => {
        const items = response.items ?? [];
        setResults(items);
        setSelectedResult(items[0] ?? null);
      })
      .catch((err) => setError(err.message));
  }, []);

  const getStatusColor = (status: ScanResult['status']) => {
    switch (status) {
      case 'Secure': return 'bg-green-500/20 text-green-500';
      case 'Weak': return 'bg-yellow-500/20 text-yellow-500';
      case 'Expired': return 'bg-red-500/20 text-red-500';
      case 'PQC-Ready': return 'bg-primary/20 text-primary';
      default: return 'bg-slate-500/20 text-slate-500';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-background-light dark:bg-background-dark">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Security Audit Results</h2>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-primary dark:border-slate-700"
        >
          REFRESH
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="font-bold text-sm">Live Scan Inventory</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Asset ID</th>
                  <th className="px-6 py-3 font-semibold">Address</th>
                  <th className="px-6 py-3 font-semibold">Protocol</th>
                  <th className="px-6 py-3 font-semibold">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {results.map((result) => (
                  <tr
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${selectedResult?.id === result.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium">{result.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{result.host}</td>
                    <td className="px-6 py-4">{result.protocol}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
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
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Host</label>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedResult.host}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">TLS Version</label>
                    <p className="text-sm">{selectedResult.tlsVersion}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Expiry</label>
                    <p className="text-sm">{selectedResult.expiry}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cipher Suite</label>
                  <p className="rounded border border-slate-200 bg-slate-100 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">
                    {selectedResult.cipherSuite}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Key Algorithm</label>
                  <p className="text-sm">{selectedResult.keyAlgo}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Observed At</label>
                  <p className="text-sm text-slate-500">{new Date(selectedResult.timestamp).toLocaleString()}</p>
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
