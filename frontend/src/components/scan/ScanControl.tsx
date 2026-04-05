import React, { useEffect, useState } from 'react';
import { assetsAPI } from '../../api/client';

interface ScanControlProps {
  assetId: string;
  assetName?: string;
  onScanComplete?: () => void;
}

interface ScanStatus {
  asset_id: string;
  status: string;
  current_step: string | null;
  progress: number;
  last_scanned_at: string | null;
  next_scan_at: string | null;
  scan_frequency_minutes: number | null;
  is_scanning: boolean;
}

const STEP_LABELS: Record<string, string> = {
  tls: 'TLS/Certificate Analysis',
  port: 'Port Discovery',
  pqc: 'PQC Checker',
  cbom: 'CBOM Generation',
};

const FREQUENCY_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 30, label: '30 min' },
];

export const ScanControl: React.FC<ScanControlProps> = ({ assetId, assetName, onScanComplete }) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<number | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Poll scan status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await assetsAPI.getScanStatus(assetId);
        setScanStatus(response);
        
        // Stop polling if scan is complete
        if (!response.is_scanning && pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
          if (onScanComplete) onScanComplete();
        }
      } catch (err) {
        console.error('Failed to fetch scan status:', err);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling interval only if scanning
    const interval = setInterval(fetchStatus, 2000);
    setPollInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assetId, onScanComplete]);

  const handleStartScan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await assetsAPI.startScan(assetId);
      console.log('Scan started:', response);
      setScanStatus({
        asset_id: assetId,
        status: 'scanning',
        current_step: 'tls',
        progress: 0,
        last_scanned_at: scanStatus?.last_scanned_at || null,
        next_scan_at: scanStatus?.next_scan_at || null,
        scan_frequency_minutes: scanStatus?.scan_frequency_minutes || null,
        is_scanning: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetFrequency = async (frequency: number) => {
    try {
      const response = await assetsAPI.setScanSchedule(assetId, frequency);
      setSelectedFrequency(frequency);
      setScanStatus((prev) =>
        prev
          ? {
              ...prev,
              scan_frequency_minutes: frequency,
              next_scan_at: response.next_scan_at,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set scan schedule');
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      
      const diffHours = Math.round(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return dateStr;
    }
  };

  const getProgressColor = () => {
    const progress = scanStatus?.progress || 0;
    if (progress < 50) return 'bg-blue-500';
    if (progress < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-primary/20 dark:bg-panel-dark">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Security Scan
          </h3>
          {assetName && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{assetName}</p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Scan button */}
        <button
          onClick={handleStartScan}
          disabled={scanStatus?.is_scanning || isLoading}
          className={`w-full rounded-lg px-4 py-2 font-medium transition ${
            scanStatus?.is_scanning || isLoading
              ? 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
          }`}
        >
          {scanStatus?.is_scanning ? 'Scanning...' : 'Run Scan'}
        </button>

        {/* Progress bar and step indicator */}
        {scanStatus?.is_scanning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {scanStatus.current_step ? STEP_LABELS[scanStatus.current_step] : 'Starting scan...'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {scanStatus.progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${scanStatus.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Last scan timestamp */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">Last scan:</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatDate(scanStatus?.last_scanned_at)}
          </span>
        </div>

        {/* Next scan (if scheduled) */}
        {scanStatus?.scan_frequency_minutes && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Next scan:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatDate(scanStatus?.next_scan_at)}
            </span>
          </div>
        )}

        {/* Auto-scan frequency dropdown */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Auto-scan frequency
          </label>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSetFrequency(option.value)}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
                  selectedFrequency === option.value || scanStatus?.scan_frequency_minutes === option.value
                    ? 'bg-primary text-white'
                    : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-primary/20 dark:bg-primary/5 dark:text-slate-300 dark:hover:bg-primary/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status badge */}
        {scanStatus && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-primary/5">
            <span className="text-xs text-slate-600 dark:text-slate-400">Status</span>
            <span
              className={`text-xs font-semibold uppercase ${
                scanStatus.is_scanning
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {scanStatus.is_scanning ? 'Scanning' : 'Ready'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanControl;
