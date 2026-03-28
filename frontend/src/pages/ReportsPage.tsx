import React, { useEffect, useState } from 'react';
import { reportsAPI } from '../api/client';
import type { PeriodReport } from '../types';

const ReportsPage: React.FC = () => {
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [report, setReport] = useState<PeriodReport | null>(null);

  useEffect(() => {
    const loader = mode === 'daily' ? reportsAPI.getDaily : mode === 'weekly' ? reportsAPI.getWeekly : reportsAPI.getMonthly;
    loader().then((response: any) => setReport(response));
  }, [mode]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 p-6 font-display dark:bg-background-dark">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-end justify-between">
          <div className="text-slate-900 dark:text-slate-100">
            <h1 className="text-2xl font-bold">Historical Reports</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daily, weekly, and monthly analytics powered by the asset scan summary table.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">History</button>
            <button className="rounded bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90">Run Batch</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide opacity-80 text-slate-900 dark:text-slate-100">
                <span className="material-symbols-outlined text-lg text-primary">tune</span>
                Report Parameters
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Time Range</label>
                  <select value={mode} onChange={(e) => setMode(e.target.value as 'daily' | 'weekly' | 'monthly')} className="w-full rounded border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <button className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-primary py-3 font-bold text-white transition-all hover:bg-primary/90">
                  <span className="material-symbols-outlined">refresh</span>
                  Generate Preview
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-4 text-slate-900 dark:text-slate-100">
                <h3 className="px-2 text-sm font-bold tracking-wider">PREVIEW</h3>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                <span className="text-xs font-medium uppercase text-slate-500">{mode}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="mr-2 text-[10px] font-bold uppercase opacity-40 text-slate-500">Export as</span>
                <button className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-500/20 dark:text-red-400">PDF</button>
                <button className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400">CSV</button>
              </div>
            </div>

            <div className="flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex-1 space-y-8 overflow-y-auto p-8">
                <div className="flex items-start justify-between border-b border-slate-100 pb-6 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-slate-900 dark:text-slate-100">Asset Scan Summary Report</h2>
                    <p className="mt-1 text-xs text-slate-500">Generated on {report ? new Date(report.generated_at).toLocaleString() : 'Loading...'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">SCAN-{mode.toUpperCase()}</div>
                    <div className="text-[10px] font-bold uppercase opacity-40 text-slate-500">Classification: Internal</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="rounded border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Total Scans</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{report?.summary.total_scans ?? 0}</p>
                    <p className="mt-1 text-[10px] text-emerald-500">Recorded snapshots in this window</p>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Average Risk</p>
                    <p className="text-2xl font-bold text-amber-500">{(report?.summary.average_risk ?? 0).toFixed(1)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Mean risk across summary buckets</p>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Downgrades</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{report?.summary.downgrades ?? 0}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Drift events flagged as downgrade</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">Risk Trend</h4>
                  <div className="space-y-3">
                    {(report?.points ?? []).map((row) => (
                      <div key={row.period_start}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                          <span>{new Date(row.period_start).toLocaleDateString()}</span>
                          <span className="font-bold">{row.average_risk.toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, row.average_risk * 10)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">TLS Downgrade Trend</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(report?.points ?? []).map((row) => (
                      <div key={`${row.period_start}-downgrades`} className="rounded border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold">{new Date(row.period_start).toLocaleDateString()}</span>
                          <span className="text-sm font-bold text-red-500">{row.downgrade_count}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{row.changed_assets} assets changed, max risk {row.max_risk.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-center border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SUMMARY TABLE POWERING DAILY / WEEKLY / MONTHLY REPORTS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
