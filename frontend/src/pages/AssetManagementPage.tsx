import React, { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '../api/client';
import type { Asset } from '../types';

type NodePosition = { x: number; y: number };

const getRiskColor = (score: number | null) => {
  if ((score ?? 0) < 4) return '#10b981';
  if ((score ?? 0) < 7) return '#f59e0b';
  return '#ef4444';
};

const getStatusColor = (status: Asset['status']) => {
  if (status === 'scanned') return '#06b6d4';
  if (status === 'pending') return '#eab308';
  if (status === 'scanning') return '#8b5cf6';
  return '#6b7280';
};

const TopologicalAssetView: React.FC<{ assets: Asset[] }> = ({ assets }) => {
  const positions = useMemo(() => {
    const pos: Record<string, NodePosition> = {};
    const centerX = 400;
    const centerY = 300;
    const radius = 180;

    assets.forEach((asset, index) => {
      const angle = (index / Math.max(assets.length, 1)) * 2 * Math.PI;
      pos[asset.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    return pos;
  }, [assets]);

  const connections = useMemo(() => {
    return assets.slice(1).map((asset, index) => ({
      from: assets[index].id,
      to: asset.id,
    }));
  }, [assets]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-primary/5 overflow-hidden">
      <svg className="h-[600px] w-full" viewBox="0 0 800 600">
        {connections.map((conn, index) => {
          const fromPos = positions[conn.from];
          const toPos = positions[conn.to];
          if (!fromPos || !toPos) return null;
          return (
            <line
              key={`${conn.from}-${conn.to}-${index}`}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="#cbd5e1"
              strokeWidth="2"
            />
          );
        })}

        {assets.map((asset) => {
          const pos = positions[asset.id];
          if (!pos) return null;
          return (
            <g key={asset.id}>
              <circle cx={pos.x} cy={pos.y} r="45" fill={getRiskColor(asset.risk_score)} opacity="0.16" stroke={getRiskColor(asset.risk_score)} strokeWidth="2" />
              <circle cx={pos.x} cy={pos.y} r="40" fill="none" stroke={getStatusColor(asset.status)} strokeWidth="3" opacity="0.8" />
              <circle cx={pos.x} cy={pos.y} r="32" fill="white" stroke={getRiskColor(asset.risk_score)} strokeWidth="2" />
              <text x={pos.x} y={pos.y - 8} textAnchor="middle" fontSize="11" fontWeight="bold">
                {asset.asset_type[0].toUpperCase()}
              </text>
              <text x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize="11" fontWeight="bold">
                {asset.asset_value.split('.')[0]}
              </text>
              <text x={pos.x} y={pos.y + 22} textAnchor="middle" fontSize="9" fill={getRiskColor(asset.risk_score)}>
                Risk {(asset.risk_score ?? 0).toFixed(1)}
              </text>
              <title>{`${asset.asset_value}\nStatus: ${asset.status}\nRisk: ${(asset.risk_score ?? 0).toFixed(1)}\nQuantum: ${asset.quantum_label ?? 'unknown'}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AssetManagementPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'topological'>('table');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardAPI.listAssets(1, 200)
      .then((response: any) => {
        setAssets(response.items ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, []);

  const totals = useMemo(() => ({
    total: assets.length,
    ready: assets.filter((asset) => asset.quantum_label === 'pqc_ready' || asset.quantum_label === 'fully_quantum_safe').length,
    critical: assets.filter((asset) => (asset.risk_score ?? 0) >= 7).length,
  }), [assets]);

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black tracking-tight">Assets</h1>
          <span className="rounded bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">{totals.total} Total</span>
          <span className="rounded bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-600">{totals.ready} PQC-Ready</span>
          <span className="rounded bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500">{totals.critical} Critical</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-primary/10">
          <button
            onClick={() => setViewMode('table')}
            className={`rounded px-4 py-2 text-sm font-bold transition-colors ${viewMode === 'table' ? 'bg-white text-primary shadow-sm dark:bg-primary/20' : 'text-slate-500'}`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('topological')}
            className={`rounded px-4 py-2 text-sm font-bold transition-colors ${viewMode === 'topological' ? 'bg-white text-primary shadow-sm dark:bg-primary/20' : 'text-slate-500'}`}
          >
            Topology
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {viewMode === 'topological' ? (
        <TopologicalAssetView assets={assets} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Host</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Owner / Org</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Quantum</th>
                <th className="px-6 py-4 font-semibold">Risk</th>
                <th className="px-6 py-4 font-semibold">Last Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-xs">{asset.asset_value}</td>
                  <td className="px-6 py-4 capitalize">{asset.asset_type.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4">{asset.organization ?? 'Unassigned'}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase dark:bg-slate-800">
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize">{(asset.quantum_label ?? 'unknown').replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded border px-2 py-1 text-xs font-bold ${getRiskColor(asset.risk_score) === '#ef4444' ? 'border-red-500/20 bg-red-500/10 text-red-500' : getRiskColor(asset.risk_score) === '#f59e0b' ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'}`}>
                      {(asset.risk_score ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {asset.last_scanned ? new Date(asset.last_scanned).toLocaleString() : 'Not scanned yet'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AssetManagementPage;
