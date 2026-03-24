import React, { useState, useEffect, useRef } from 'react';

const RunScanPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    '[09:22:01] Initializing scan engine v2.4.0...',
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const startScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setProgress(0);
    setLogs(['[09:22:01] Initializing scan engine v2.4.0...']);
  };

  useEffect(() => {
    if (isScanning && progress < 100) {
      const timer = setTimeout(() => {
        const nextProgress = Math.min(progress + Math.floor(Math.random() * 10) + 2, 100);
        setProgress(nextProgress);
        
        // Add some mock logs
        const mockLogs = [
          `Establishing handshake with 10.0.0.45`,
          `OK Connection established.`,
          `Starting TLS version detection...`,
          `Detected: TLS 1.3, TLS 1.2 supported.`,
          `Beginning cipher suite analysis...`,
          `Analyzing ECDHE-RSA-AES256-GCM-SHA384...`,
          `Testing certificate revocation status...`,
          `Finalizing security assessment report...`,
        ];
        
        if (nextProgress % 15 === 0 || nextProgress === 100) {
          const logIdx = Math.min(Math.floor(nextProgress / 15), mockLogs.length - 1);
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${mockLogs[logIdx]}`]);
        }
        
        if (nextProgress === 100) {
          setIsScanning(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isScanning, progress]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Initiate Security Assessment</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure and execute automated vulnerability scanning on designated network assets.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Asset Selection & Config */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Selection Card */}
            <div className="bg-white dark:bg-panel-dark border border-slate-200 dark:border-border-accent rounded-lg p-6 shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Asset Selection</label>
              <select className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-accent rounded-lg p-3 text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary outline-none">
                <option>Production Edge Server - 192.168.1.120</option>
                <option>Internal DB Cluster - 10.0.4.15</option>
                <option>Legacy Web Portal - 172.16.0.44</option>
              </select>

              <div className="mt-6 flex flex-col md:flex-row gap-4 p-4 bg-slate-100 dark:bg-background-dark/50 rounded-lg border border-slate-200 dark:border-border-accent">
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Summary Details</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">dns</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Asset: Web Server Alpha</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">public</span> 10.0.0.45</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">terminal</span> Ubuntu 22.04 LTS</span>
                  </div>
                </div>
                <div className="md:w-32 h-20 bg-slate-200 dark:bg-panel-dark rounded border border-slate-300 dark:border-border-accent overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/20 text-4xl">memory</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Config Panel */}
            <div className="bg-white dark:bg-panel-dark border border-slate-200 dark:border-border-accent rounded-lg p-6 shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Scan Configuration</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'TLS Vulnerability Scan',
                  'Certificate Integrity Scan',
                  'Cipher Suite Analysis',
                  'PQC Compatibility Check'
                ].map((option, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded border border-slate-200 dark:border-border-accent hover:bg-slate-50 dark:hover:bg-background-dark/30 cursor-pointer transition-colors">
                    <input defaultChecked={i < 3} className="rounded border-slate-300 dark:border-border-accent bg-transparent text-primary focus:ring-primary" type="checkbox"/>
                    <span className="text-sm font-medium">{option}</span>
                  </label>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <p className="text-xs text-slate-500 italic flex items-center">
                  <span className="material-symbols-outlined text-sm mr-1">info</span>
                  This project uses rule-based scan simulation.
                </p>
                <button 
                  onClick={startScan}
                  disabled={isScanning}
                  className={`bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all ${isScanning ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                >
                  <span className="material-symbols-outlined">{isScanning ? 'sync' : 'bolt'}</span>
                  {isScanning ? 'Scanning...' : 'Run Scan'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Status & Progress */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-panel-dark border border-slate-200 dark:border-border-accent rounded-lg flex flex-col h-full shadow-sm">
              <div className="p-6 flex flex-col h-full">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Live Scan Status</label>
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-sm font-bold ${isScanning ? 'text-primary' : 'text-slate-500'}`}>
                      {isScanning ? 'Scanning...' : progress === 100 ? 'Scan Complete' : 'Idle'}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{progress}% Complete</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-background-dark rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {/* Log Terminal */}
                <div className="flex-1 bg-slate-900/90 dark:bg-slate-950/50 rounded-lg p-4 font-mono text-[11px] leading-relaxed overflow-y-auto text-emerald-500/80 min-h-[200px] border border-slate-800">
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <p key={i}>{log}</p>
                    ))}
                    {isScanning && <p className="animate-pulse">_</p>}
                    <div ref={logEndRef} />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-background-dark/40 rounded border border-slate-200 dark:border-border-accent">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-lg">warning</span>
                      <span className="text-xs font-medium">Vulnerabilities</span>
                    </div>
                    <span className="text-xs font-bold">{progress > 50 ? '2' : '0'} Detected</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-background-dark/40 rounded border border-slate-200 dark:border-border-accent">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                      <span className="text-xs font-medium">Tests Passed</span>
                    </div>
                    <span className="text-xs font-bold">{Math.floor(progress / 7)} Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunScanPage;
