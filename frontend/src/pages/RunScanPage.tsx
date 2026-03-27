import React, { useState, useEffect, useRef } from 'react';
import { assetsAPI, devAPI } from '../api/client';

interface Asset {
  id: string;
  asset_value: string;
  asset_type: string;
}

const RunScanPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([
    '[01:25:01] Initializing scan engine v2.4.0...',
  ]);
  const [scanSummary, setScanSummary] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch real assets from backend via API client
    assetsAPI.listAssets(1, 100)
      .then((response: any) => {
        const items = response.items ?? [];
        const mappedAssets = items.map((a: any) => ({
          id: a.id,
          asset_value: a.asset_value,
          asset_type: a.asset_type,
        }));
        setAssets(mappedAssets);
        if (mappedAssets.length > 0) setSelectedAssetId(mappedAssets[0].id);
      })
      .catch(err => console.error("Failed to fetch assets", err));
  }, []);

  const startScan = async () => {
    if (isScanning || !selectedAssetId) return;
    
    setIsScanning(true);
    setProgress(0);
    setScanSummary('');
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Triggering on-demand scan for asset ${selectedAssetId}...`]);

    try {
      const response = await devAPI.realScan(selectedAssetId);
      setProgress(100);
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Real scan completed using ${(response as any).scan_tool}.`,
        `[${new Date().toLocaleTimeString()}] ${(response as any).summary}`,
      ]);
      const ports = ((response as any).open_ports ?? []).map((port: any) => `${port.port}/${port.protocol} ${port.service}`).join(', ');
      if (ports) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Open ports: ${ports}`]);
      }
      setScanSummary((response as any).summary ?? '');
      setIsScanning(false);
    } catch (e) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] FAILED to trigger scan.`]);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark font-display">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">Initiate Security Assessment</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Execute automated vulnerability scanning and PQC-readiness validation on enterprise assets.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-panel-dark border border-slate-200 dark:border-primary/20 rounded-xl p-6 shadow-sm">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Asset Selection</label>
              <select 
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-lg p-3 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-primary/30"
              >
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.asset_value}</option>
                ))}
              </select>

              <div className="mt-6 flex flex-col md:flex-row gap-4 p-4 bg-slate-100/50 dark:bg-primary/5 rounded-lg border border-slate-200 dark:border-primary/20">
                <div className="flex-1 space-y-2">
                  <p className="text-[10px] text-slate-400 font-black uppercase">Live Context</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">dns</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedAsset?.asset_value || 'Loading...'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono"><span className="material-symbols-outlined text-[14px]">public</span> {selectedAsset?.asset_type}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-panel-dark border border-slate-200 dark:border-primary/20 rounded-xl p-6 shadow-sm">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Core Modules</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'NIST-Standard PQC Checker',
                  'TLS 1.3 Compliance Validation',
                  'OID/Primitive CBOM Extraction',
                  'GNN Attack Path Analysis'
                ].map((option, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/10 hover:border-primary/40 cursor-pointer transition-all">
                    <input defaultChecked className="rounded border-slate-300 dark:border-primary/30 bg-transparent text-primary focus:ring-primary" type="checkbox"/>
                    <span className="text-xs font-bold uppercase tracking-tight">{option}</span>
                  </label>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 italic max-w-xs leading-relaxed">
                  Real scans now use backend `nmap` port discovery, then refresh the live dashboard and scan results views with observed ports and recalculated risk.
                </p>
                <button 
                  onClick={startScan}
                  disabled={isScanning}
                  className={`bg-primary hover:brightness-110 text-white px-10 py-3 rounded-lg font-black text-xs tracking-tighter shadow-lg shadow-primary/30 transition-all ${isScanning ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                >
                  <span className="material-symbols-outlined mr-2 align-middle">{isScanning ? 'sync' : 'bolt'}</span>
                  {isScanning ? 'ASSESSING...' : 'INITIALIZE SCAN'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-panel-dark border border-slate-200 dark:border-primary/20 rounded-xl flex flex-col h-full shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 dark:border-primary/10 bg-slate-50/50 dark:bg-primary/5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Assessment Terminal</h4>
               </div>
               <div className="p-6 flex flex-col flex-1">
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-[10px] font-black uppercase ${isScanning ? 'text-primary' : 'text-slate-500'}`}>
                      {isScanning ? 'Assessors Active' : progress === 100 ? 'Analysis Closed' : 'Standby'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                <div className="flex-1 bg-slate-900/95 dark:bg-black/40 rounded-lg p-5 font-mono text-[10px] leading-relaxed overflow-y-auto text-emerald-400/90 shadow-inner border border-slate-800 h-[300px]">
                  <div className="space-y-1.5">
                    {logs.map((log, i) => (
                      <p key={i} className="flex gap-2">
                        <span className="text-slate-600 font-bold tracking-tighter">[{new Date().getHours()}:{new Date().getMinutes()}]</span>
                        <span>{log}</span>
                      </p>
                    ))}
                    {isScanning && <p className="animate-pulse text-primary">█</p>}
                    <div ref={logEndRef} />
                  </div>
                </div>
                {scanSummary && (
                  <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-300">
                    {scanSummary}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunScanPage;
