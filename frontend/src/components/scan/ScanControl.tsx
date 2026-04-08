import React, { useEffect, useState } from 'react';
import { assetsAPI } from '../../api/client';
import { 
  Play, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Shield,
  Activity,
  Calendar,
  Zap
} from 'lucide-react';

interface ScanControlProps {
  assetId: string;
  assetName?: string;
  onScanComplete?: () => void;
}

interface ScanStatus {
  asset_id: string;
  status: string;
  current_step: 'tls' | 'port' | 'pqc' | 'cbom' | null;
  progress: number;
  last_scanned_at: string | null;
  next_scan_at: string | null;
  scan_frequency_minutes: number | null;
  is_scanning: boolean;
}

const STEPS = [
  { id: 'tls', label: 'TLS Analysis', icon: Shield },
  { id: 'port', label: 'Port Discovery', icon: Activity },
  { id: 'pqc', label: 'PQC Checker', icon: Zap },
  { id: 'cbom', label: 'CBOM Matrix', icon: CheckCircle2 },
];

const FREQUENCY_OPTIONS = [
  { value: 5, label: '5m' },
  { value: 10, label: '10m' },
  { value: 30, label: '30m' },
];

export const ScanControl: React.FC<ScanControlProps> = ({ assetId, assetName, onScanComplete }) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);

  // Poll scan status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchStatus = async () => {
      try {
        const response = (await assetsAPI.getScanStatus(assetId)) as ScanStatus;
        setScanStatus(response);
        
        // Map current_step to index
        if (response.current_step) {
          const index = STEPS.findIndex(s => s.id === response.current_step);
          setActiveStepIndex(index);
        } else if (response.status === 'scanned') {
          setActiveStepIndex(4); // All complete
        } else {
          setActiveStepIndex(-1);
        }
        
        // Stop polling if scan is complete
        if (!response.is_scanning && response.status !== 'scanning' && interval) {
          // Keep polling for one more cycle if we just finished to show 100%
          if (response.status === 'scanned') {
             if (onScanComplete) onScanComplete();
          }
        }
      } catch (err) {
        console.error('Failed to fetch scan status:', err);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling interval (2s as requested)
    interval = setInterval(fetchStatus, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assetId, onScanComplete]);

  const handleStartScan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await assetsAPI.startScan(assetId);
      setScanStatus((prev) => prev ? { ...prev, is_scanning: true, status: 'scanning' } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetFrequency = async (frequency: number) => {
    try {
      await assetsAPI.setScanSchedule(assetId, frequency);
      // Status will update on next poll
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set scan schedule');
    }
  };

  const getTimeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`;
      return `${Math.round(diffMins / 1440)}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  const getNextScanLabel = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not scheduled';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins <= 0) return 'Any moment';
      if (diffMins < 60) return `in ${diffMins}m`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-[80px]" />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px]" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30">
              <Activity size={20} className={scanStatus?.is_scanning ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">System Scan</h3>
              <p className="text-xs text-slate-400 font-medium">{assetName || 'Target Asset'}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
               scanStatus?.is_scanning 
                 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                 : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
             }`}>
               <span className={`h-1.5 w-1.5 rounded-full ${scanStatus?.is_scanning ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
               {scanStatus?.is_scanning ? 'Scanning' : 'Standby'}
             </div>
          </div>
        </div>

        {/* Scan Button Section */}
        <div className="group relative">
          <button
            onClick={handleStartScan}
            disabled={scanStatus?.is_scanning || isLoading}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all duration-300 ${
              scanStatus?.is_scanning || isLoading
                ? 'cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700'
                : 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]'
            }`}
          >
            {scanStatus?.is_scanning ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Processing Infrastructure...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Execute Quantum Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="space-y-4 rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Scan Pipeline</span>
            {scanStatus?.is_scanning && (
               <span className="text-[11px] font-bold text-primary">{scanStatus.progress}%</span>
            )}
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((step, idx) => {
              const isCompleted = activeStepIndex > idx || (!scanStatus?.is_scanning && scanStatus?.status === 'scanned');
              const isActive = activeStepIndex === idx && scanStatus?.is_scanning;
              
              return (
                <div key={step.id} className="relative flex flex-col items-center gap-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40' 
                      : isActive 
                        ? 'bg-primary/20 text-primary ring-2 ring-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' 
                        : 'bg-slate-800/50 text-slate-500 ring-1 ring-white/5'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={18} /> : <step.icon size={18} className={isActive ? 'animate-pulse' : ''} />}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors duration-300 ${
                    isCompleted || isActive ? 'text-slate-200' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                  
                  {/* Connector Line */}
                  {idx < 3 && (
                    <div className="absolute left-[calc(100%-10px)] top-5 z-0 h-[1px] w-[calc(100%-20px)] bg-white/5">
                        <div className={`h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000 ${
                          activeStepIndex > idx ? 'w-full opaicty-100' : 'w-0 opacity-0'
                        }`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall Progress Bar */}
          {scanStatus?.is_scanning && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-primary via-blue-500 to-indigo-500 transition-all duration-700 ease-out"
                style={{ width: `${scanStatus.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
               <Clock size={16} />
             </div>
             <div>
               <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Last Run</p>
               <p className="text-xs font-semibold text-slate-200">{getTimeAgo(scanStatus?.last_scanned_at)}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
               <Calendar size={16} />
             </div>
             <div>
               <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Next Scan</p>
               <p className="text-xs font-semibold text-slate-200">{getNextScanLabel(scanStatus?.next_scan_at)}</p>
             </div>
          </div>
        </div>

        {/* Scheduling Dropdown Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span>Scan Frequency</span>
            <span className="text-primary/80">Auto-Update</span>
          </div>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSetFrequency(option.value)}
                className={`flex-1 group relative overflow-hidden rounded-xl border py-2.5 text-xs font-bold transition-all duration-300 ${
                  scanStatus?.scan_frequency_minutes === option.value
                    ? 'border-primary/50 bg-primary/20 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]'
                    : 'border-white/5 bg-white/2 backdrop-blur-sm text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                {option.label}
                {scanStatus?.scan_frequency_minutes === option.value && (
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} />
            <p className="flex-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanControl;
