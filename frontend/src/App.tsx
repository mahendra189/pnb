// App.tsx — Enterprise Dashboard shell for the Quantum-Proof Systems Scanner
//
// Layout:
//   Top nav → active nav tab → render page component
//
// Pages (lazy-loaded):
//   Dashboard   — live metrics overview cards + mini heatmap + forecast
//   SOC Queue   — real-time TLS anomaly alert stream (WebSocket)
//   Risk Map    — full D3 treemap heatmap
//   Forecast    — full P10/P50/P90 Chart.js panel
//   API Docs    — embedded Swagger iframe

import { useEffect, useState } from 'react'
import { ShieldCheck, Radio, Map, TrendingUp, BookOpen, Activity } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type Page = 'dashboard' | 'soc' | 'heatmap' | 'forecast' | 'docs'

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard' as Page, label: 'Dashboard',  Icon: Activity    },
  { id: 'soc'       as Page, label: 'SOC Queue',  Icon: Radio       },
  { id: 'heatmap'   as Page, label: 'Risk Map',   Icon: Map         },
  { id: 'forecast'  as Page, label: 'Forecast',   Icon: TrendingUp  },
  { id: 'docs'      as Page, label: 'API Docs',   Icon: BookOpen    },
]

// ── Mock summary data (fetched from /api/v1/assets, /health etc.) ─────────────
interface Summary {
  total:     number
  critical:  number
  pqcReady:  number
  safe:      number
}

export default function App() {
  const [page, setPage]         = useState<Page>('dashboard')
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  // Fetch summary from backend
  useEffect(() => {
    fetch('/api/v1/assets')
      .then(r => r.json())
      .then((d: { items: any[] }) => {
        const items = d.items ?? []
        setSummary({
          total:    items.length,
          critical: items.filter((a: any) => a.risk_band === 'critical').length,
          pqcReady: items.filter((a: any) => a.quantum_label === 'pqc_ready').length,
          safe:     items.filter((a: any) => a.quantum_label === 'fully_quantum_safe').length,
        })
        setApiStatus('ok')
      })
      .catch(() => setApiStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <ShieldCheck className="h-6 w-6 text-cyan-400" />
          <span className="font-bold text-white tracking-tight text-sm leading-tight">
            Quantum-Proof<br />
            <span className="text-cyan-400">Systems Scanner</span>
          </span>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                page === id
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* API status pill */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${
            apiStatus === 'ok'       ? 'bg-emerald-400 animate-pulse' :
            apiStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-500'
          }`} />
          <span className="text-gray-400">
            {apiStatus === 'ok' ? 'API Connected' : apiStatus === 'checking' ? 'Connecting…' : 'API Offline'}
          </span>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-6">
        {page === 'dashboard' && <DashboardPage summary={summary} />}
        {page === 'soc'       && <SOCPage />}
        {page === 'heatmap'   && <HeatmapPage />}
        {page === 'forecast'  && <ForecastPage />}
        {page === 'docs'      && <DocsPage />}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 px-6 py-3 text-xs text-gray-600 flex justify-between">
        <span>PSB Hackathon 2026 — Quantum-Proof Systems Scanner</span>
        <span>v0.1.0 dev-stub · API on :8000</span>
      </footer>
    </div>
  )
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="glass p-5 flex flex-col gap-1 animate-fade-in">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-4xl font-bold ${color}`}>{value}</span>
    </div>
  )
}

function DashboardPage({ summary }: { summary: Summary | null }) {
  const [assets, setAssets] = useState<any[]>([])
  const [hndl, setHndl]     = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/assets').then(r => r.json()).then(d => setAssets(d.items ?? []))
    fetch('/api/v1/hndl/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algo: 'rsa-2048', key_bits: 2048 }),
    }).then(r => r.json()).then(setHndl)
  }, [])

  const RISK_COLOR: Record<string, string> = {
    critical: 'text-red-400', high: 'text-orange-400',
    medium: 'text-yellow-400', low: 'text-green-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">PQC Readiness Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Post-Quantum Cryptography exposure overview for PNB banking assets</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Assets"     value={summary?.total    ?? '…'} color="text-white"       />
        <StatCard label="Critical Risk"    value={summary?.critical ?? '…'} color="text-red-400"     />
        <StatCard label="PQC-Ready"        value={summary?.pqcReady ?? '…'} color="text-orange-400"  />
        <StatCard label="Fully Safe"       value={summary?.safe     ?? '…'} color="text-emerald-400" />
      </div>

      {/* Sample HNDL score */}
      {hndl && (
        <div className="glass p-5 animate-fade-in">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Example HNDL Score — RSA-2048
          </h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Score </span>
              <span className="text-3xl font-bold text-red-400">{hndl.hndl_score}</span>
              <span className="text-gray-500 text-xs"> / 10</span>
            </div>
            <div><span className="text-gray-500">Risk band </span><span className={`font-semibold capitalize ${RISK_COLOR[hndl.risk_band]}`}>{hndl.risk_band}</span></div>
            <div><span className="text-gray-500">Quantum safe </span><span className={hndl.quantum_safe ? 'text-green-400' : 'text-red-400'}>{hndl.quantum_safe ? '✓ Yes' : '✗ No'}</span></div>
            <div><span className="text-gray-500">MOSCA risk </span><span className={hndl.mosca?.mosca_risk ? 'text-red-400 font-bold' : 'text-green-400'}>{hndl.mosca?.mosca_risk ? '⚠ EXPOSED' : '✓ Safe'}</span></div>
          </div>
        </div>
      )}

      {/* Asset list */}
      <div className="glass overflow-hidden animate-fade-in">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Asset Inventory</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
              <th className="text-left px-5 py-2">Host</th>
              <th className="text-left px-5 py-2">Algorithm</th>
              <th className="text-left px-5 py-2">HNDL</th>
              <th className="text-left px-5 py-2">Risk</th>
              <th className="text-left px-5 py-2">PQC Label</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-2.5 font-mono text-cyan-300">{a.host}</td>
                <td className="px-5 py-2.5 font-mono text-gray-300">{a.algo}</td>
                <td className="px-5 py-2.5">
                  <span className={`font-bold ${RISK_COLOR[a.risk_band]}`}>{a.hndl_score}</span>
                </td>
                <td className="px-5 py-2.5">
                  <span className={`badge capitalize ${
                    a.risk_band === 'critical' ? 'bg-red-900/50 text-red-300' :
                    a.risk_band === 'high'     ? 'bg-orange-900/50 text-orange-300' :
                    a.risk_band === 'medium'   ? 'bg-yellow-900/50 text-yellow-300' :
                    'bg-green-900/50 text-green-300'
                  }`}>{a.risk_band}</span>
                </td>
                <td className="px-5 py-2.5 text-xs text-gray-400">{a.quantum_label?.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SOCPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">SOC Analyst Queue</h1>
      <p className="text-sm text-gray-400">Real-time TLS anomaly alert stream — connect WebSocket to <code className="text-cyan-400 bg-gray-800 px-1 rounded">/api/v1/compliance/ws/alerts</code></p>
      <div className="glass p-8 text-center text-gray-500">
        <Radio className="h-12 w-12 mx-auto mb-3 text-gray-700" />
        <p>SOCAnalystQueue component renders here.</p>
        <p className="text-xs mt-1">Import <code className="text-cyan-400">SOCAnalystQueue</code> from <code className="text-cyan-400">./components/soc/SOCAnalystQueue</code></p>
      </div>
    </div>
  )
}

function HeatmapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">PQC Risk Heatmap</h1>
      <p className="text-sm text-gray-400">D3.js squarify treemap — cell size = HNDL score, color = risk band</p>
      <div className="glass p-8 text-center text-gray-500">
        <Map className="h-12 w-12 mx-auto mb-3 text-gray-700" />
        <p>RiskHeatmap (D3) component renders here.</p>
        <p className="text-xs mt-1">Import <code className="text-cyan-400">RiskHeatmap</code> from <code className="text-cyan-400">./components/visualizations/RiskHeatmap</code></p>
      </div>
    </div>
  )
}

function ForecastPage() {
  const [forecast, setForecast] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/forecast').then(r => r.json()).then(setForecast)
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">HNDL Exposure Forecast</h1>
      <p className="text-sm text-gray-400">P10/P50/P90 Prophet + Monte Carlo bands across migration scenarios</p>

      {forecast && (
        <div className="glass p-5 animate-fade-in space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Monte Carlo Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Median exposure year', value: forecast.monte_carlo.median_exposure_year },
              { label: 'P10 (optimistic)',     value: forecast.monte_carlo.p10_exposure_year    },
              { label: 'P90 (pessimistic)',    value: forecast.monte_carlo.p90_exposure_year    },
              { label: 'P(breach ≤ 2030)',     value: `${(forecast.monte_carlo.prob_breach_before_2030 * 100).toFixed(0)}%` },
              { label: 'P(breach ≤ 2035)',     value: `${(forecast.monte_carlo.prob_breach_before_2035 * 100).toFixed(0)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800/50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-cyan-400">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 pt-2">ForecastChart (Chart.js P10/P50/P90 bands) component renders here once D3/Chart dependencies are loaded.</p>
        </div>
      )}
    </div>
  )
}

function DocsPage() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-bold text-white">API Documentation</h1>
      <iframe
        src="http://localhost:8000/api/v1/docs"
        className="flex-1 rounded-2xl border border-gray-800 bg-white"
        style={{ minHeight: '80vh' }}
        title="Swagger UI"
      />
    </div>
  )
}
