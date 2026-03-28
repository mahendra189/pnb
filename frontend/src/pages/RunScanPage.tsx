import React, { useEffect, useRef, useState } from 'react';
import { assetsAPI, buildWebSocketUrl } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import type { AssetMatrixRow } from '../types';

interface AssetOption {
  id: string;
  asset: string;
  asset_type: string;
  status?: string;
}

const RunScanPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>(['[01:25:01] Initializing scan engine v2.4.0...']);
  const [scanSummary, setScanSummary] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    assetsAPI.getMatrix()
      .then((response: any) => {
        const items = response.items ?? [];
        const mappedAssets = items.map((item: any) => ({
          id: item.id,
          asset: item.asset,
          asset_type: item.asset_type,
          status: item.status,
        }));
        setAssets(mappedAssets);
        if (mappedAssets.length > 0) setSelectedAssetId(mappedAssets[0].id);
      })
      .catch((err) => console.error('Failed to fetch assets', err));
  }, []);

  useWebSocket<{ type: string; data?: { items?: AssetMatrixRow[] } }>({
    url: buildWebSocketUrl('/api/v1/assets/ws/matrix'),
    onMessage: (message) => {
      if (message.type !== 'asset_matrix_updated' || !message.data?.items) return;
      const selected = message.data.items.find((item) => item.id === selectedAssetId);
      if (!selected || !isScanning || selected.status !== 'scanned') return;
      setProgress(100);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Scan completed with ${selected.tls_version ?? 'unknown TLS'} / ${selected.cipher ?? 'unknown cipher'}.`,
        `[${new Date().toLocaleTimeString()}] PQC status ${selected.pqc_status ?? 'unknown'} and risk ${(selected.risk_score ?? 0).toFixed(1)} recorded in the asset matrix.`,
      ]);
      setScanSummary(`Asset matrix refreshed for ${selected.asset} at ${new Date(selected.last_scanned_at ?? Date.now()).toLocaleString()}.`);
      setIsScanning(false);
    },
    reconnectDelay: 3000,
  });

  const startScan = async () => {
    if (isScanning || !selectedAssetId) return;
    setIsScanning(true);
    setProgress(25);
    setScanSummary('');
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Triggering Celery full scan pipeline for asset ${selectedAssetId}...`]);
    try {
      const response: any = await assetsAPI.triggerScan(selectedAssetId, ['tls'], 7);
      setProgress(50);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Scan task ${response.scan_task_id ?? 'created'} queued as Celery job ${response.task_id}.`,
        `[${new Date().toLocaleTimeString()}] Waiting for real-time matrix update from websocket...`,
      ]);
    } catch {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] FAILED to trigger scan.`]);
      setIsScanning(false);
      setProgress(0);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 font-display dark:bg-background-dark">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h3 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Initiate Security Assessment</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Execute the unified full-scan pipeline with history, drift detection, CBOM versioning, and live matrix refresh.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-primary/20 dark:bg-panel-dark">
              <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-500">Asset Selection</label>
              <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none ring-primary/30 focus:ring-2 dark:border-primary/20 dark:bg-primary/5 dark:text-slate-100">
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.asset}</option>
                ))}
              </select>

              <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-100/50 p-4 dark:border-primary/20 dark:bg-primary/5 md:flex-row">
                <div className="flex-1 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-400">Live Context</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">dns</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedAsset?.asset || 'Loading...'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono"><span className="material-symbols-outlined text-[14px]">public</span>{selectedAsset?.asset_type}</span>
                    <span className="rounded bg-slate-200 px-2 py-1 text-[10px] uppercase dark:bg-slate-800">{selectedAsset?.status ?? 'unknown'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-primary/20 dark:bg-panel-dark">
              <label className="mb-4 block text-xs font-black uppercase tracking-widest text-slate-500">Pipeline Modules</label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {['Nmap service discovery', 'SSLyze TLS analysis', 'HTTP header inspection', 'History + change tracking'].map((option) => (
                  <label key={option} className="cursor-pointer rounded border border-slate-200 bg-slate-50 p-3 transition-all hover:border-primary/40 dark:border-primary/10 dark:bg-primary/5">
                    <div className="flex items-center gap-3">
                      <input defaultChecked className="rounded border-slate-300 bg-transparent text-primary focus:ring-primary dark:border-primary/30" type="checkbox" />
                      <span className="text-xs font-bold uppercase tracking-tight">{option}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <p className="max-w-xs text-[10px] italic leading-relaxed text-slate-500">
                  Each scan writes TLS results, historical snapshots, daily summaries, and drift records before broadcasting the new matrix state.
                </p>
                <button onClick={startScan} disabled={isScanning} className={`rounded-lg bg-primary px-10 py-3 text-xs font-black tracking-tighter text-white shadow-lg shadow-primary/30 transition-all hover:brightness-110 ${isScanning ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}>
                  <span className="material-symbols-outlined mr-2 align-middle">{isScanning ? 'sync' : 'bolt'}</span>
                  {isScanning ? 'ASSESSING...' : 'INITIALIZE SCAN'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-1">
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-primary/20 dark:bg-panel-dark">
              <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-primary/10 dark:bg-primary/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Assessment Terminal</h4>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-6">
                  <div className="mb-2 flex items-end justify-between">
                    <span className={`text-[10px] font-black uppercase ${isScanning ? 'text-primary' : 'text-slate-500'}`}>{isScanning ? 'Assessors Active' : progress === 100 ? 'Analysis Closed' : 'Standby'}</span>
                    <span className="font-mono text-[10px] text-slate-400">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-primary/10">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                <div className="h-[300px] flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/95 p-5 font-mono text-[10px] leading-relaxed text-emerald-400/90 shadow-inner dark:bg-black/40">
                  <div className="space-y-1.5">
                    {logs.map((log, index) => (
                      <p key={index} className="flex gap-2">
                        <span className="font-bold tracking-tighter text-slate-600">[{new Date().getHours()}:{new Date().getMinutes()}]</span>
                        <span>{log}</span>
                      </p>
                    ))}
                    {isScanning && <p className="animate-pulse text-primary">█</p>}
                    <div ref={logEndRef} />
                  </div>
                </div>
                {scanSummary && <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-300">{scanSummary}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunScanPage;
