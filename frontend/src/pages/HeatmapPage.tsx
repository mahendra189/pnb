import React, { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '../api/client';
import RiskHeatmap from '../components/visualizations/RiskHeatmap';
import type { Asset, HeatmapNode, RiskBand } from '../types';

function bandForAsset(asset: Asset): RiskBand {
  const score = asset.hndl_score ?? asset.risk_score ?? 0;
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 3.5) return 'medium';
  return 'low';
}

function toHeatmapTree(assets: Asset[]): HeatmapNode {
  const groups: Record<RiskBand, HeatmapNode[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const asset of assets) {
    const riskBand = bandForAsset(asset);
    groups[riskBand].push({
      id: asset.id,
      host: asset.asset_value,
      tier: riskBand,
      hndl_score: asset.hndl_score ?? asset.risk_score ?? 0,
      risk_band: riskBand,
      quantum_label: asset.quantum_label,
      value: asset.hndl_score ?? asset.risk_score ?? 0,
    });
  }

  return {
    id: 'root',
    host: 'All Assets',
    tier: 'portfolio',
    hndl_score: assets.reduce((sum, asset) => sum + (asset.hndl_score ?? asset.risk_score ?? 0), 0),
    risk_band: 'medium',
    quantum_label: null,
    children: (Object.keys(groups) as RiskBand[]).map((band) => ({
      id: band,
      host: `${band} risk`,
      tier: band,
      hndl_score: groups[band].reduce((sum, item) => sum + item.hndl_score, 0),
      risk_band: band,
      quantum_label: null,
      children: groups[band],
    })),
  };
}

const HeatmapPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<HeatmapNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardAPI.listAssets(1, 250)
      .then((response: any) => {
        setAssets(response.items ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, []);

  const tree = useMemo(() => toHeatmapTree(assets), [assets]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PQC Risk Heatmap</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Live D3 treemap using backend HNDL and risk data, grouped by severity tier.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-transparent">
        <RiskHeatmap data={tree} onAssetClick={setSelected} />
      </div>

      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Selected Asset</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase text-slate-400">Host</p>
              <p className="font-mono text-sm">{selected.host}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Tier</p>
              <p className="text-sm capitalize">{selected.tier}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">HNDL</p>
              <p className="text-sm font-bold">{selected.hndl_score.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Quantum Label</p>
              <p className="text-sm capitalize">{(selected.quantum_label ?? 'unknown').replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatmapPage;
