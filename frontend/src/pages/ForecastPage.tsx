import React, { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '../api/client';
import ForecastChart from '../components/visualizations/ForecastChart';
import type { ForecastScenario } from '../types';

type ForecastResponse = {
  source: string;
  bands: Array<{ date: string; p10: number; p50: number; p90: number }>;
  monte_carlo: {
    median_exposure_year: number;
    p10_exposure_year: number;
    p90_exposure_year: number;
    prob_breach_before_2030: number;
    prob_breach_before_2035: number;
  };
};

function scaleBands(
  bands: ForecastResponse['bands'],
  transform: (band: ForecastResponse['bands'][number], index: number) => { p10: number; p50: number; p90: number },
) {
  return bands.map((band, index) => ({
    date: band.date,
    ...transform(band, index),
  }));
}

const ForecastPage: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardAPI.getForecast()
      .then((response: any) => setForecast(response))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const scenarios = useMemo<ForecastScenario[]>(() => {
    if (!forecast) return [];
    return [
      {
        label: 'Do Nothing',
        color: 'rgb(239,68,68)',
        bands: forecast.bands,
      },
      {
        label: 'Phased Migration',
        color: 'rgb(249,115,22)',
        bands: scaleBands(forecast.bands, (band, index) => ({
          p10: Math.max(0, +(band.p10 * (0.94 - index * 0.015)).toFixed(1)),
          p50: Math.max(0, +(band.p50 * (0.9 - index * 0.018)).toFixed(1)),
          p90: Math.max(0, +(band.p90 * (0.92 - index * 0.016)).toFixed(1)),
        })),
      },
      {
        label: 'Emergency Migration',
        color: 'rgb(34,197,94)',
        bands: scaleBands(forecast.bands, (band, index) => ({
          p10: Math.max(0, +(band.p10 * Math.max(0.24, 0.72 - index * 0.05)).toFixed(1)),
          p50: Math.max(0, +(band.p50 * Math.max(0.2, 0.66 - index * 0.052)).toFixed(1)),
          p90: Math.max(0, +(band.p90 * Math.max(0.28, 0.74 - index * 0.047)).toFixed(1)),
        })),
      },
    ];
  }, [forecast]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">HNDL Exposure Forecast</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Live forecast modules driven by backend risk data and scenario projections.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 text-sm">
        {[
          { label: 'Median exposure year', value: forecast?.monte_carlo.median_exposure_year },
          { label: 'P10 (optimistic)', value: forecast?.monte_carlo.p10_exposure_year },
          { label: 'P90 (pessimistic)', value: forecast?.monte_carlo.p90_exposure_year },
          { label: 'P(breach ≤ 2030)', value: forecast ? `${(forecast.monte_carlo.prob_breach_before_2030 * 100).toFixed(0)}%` : '...' },
          { label: 'P(breach ≤ 2035)', value: forecast ? `${(forecast.monte_carlo.prob_breach_before_2035 * 100).toFixed(0)}%` : '...' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <p className="mb-1 text-xs text-slate-500">{label}</p>
            <p className="text-xl font-bold text-primary">{loading ? '...' : value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-transparent">
        <ForecastChart
          scenarios={scenarios}
          crqcArrivalYear={Math.round(forecast?.monte_carlo.median_exposure_year ?? new Date().getFullYear() + 8)}
          riskThreshold={7}
          height={460}
        />
      </div>
    </div>
  );
};

export default ForecastPage;
