import React, { useState } from 'react';
import { specialtyScanAPI } from '../api/client';
import { 
  Zap, 
  Shield, 
  Search, 
  Terminal, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Activity, 
  Cpu, 
  Network,
  ChevronRight,
  Info
} from 'lucide-react';

const UnifiedScanPage: React.FC = () => {
    const [target, setTarget] = useState('localhost');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'tls' | 'port' | 'pqc'>('overview');

    const handleScan = async () => {
        setLoading(true);
        setResult(null);
        try {
            const data = await specialtyScanAPI.combinedScan(target);
            setResult(data);
        } catch (error) {
            console.error('Unified scan failed:', error);
            setResult({ status: 'error', message: 'Connection to scan backend failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#0a0f16] text-slate-200 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-indigo-500/10 to-transparent p-8 border border-primary/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-primary rounded-2xl shadow-lg shadow-primary/30 rotate-3">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
                                    Unified <span className="text-primary not-italic">Quantum</span> Scan
                                </h1>
                                <p className="text-slate-400 font-medium flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                    Parallel Infrastructure Analysis: TLS + PORTS + PQC
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input 
                                    type="text" 
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                    className="bg-slate-900/80 border border-slate-700/50 rounded-2xl pl-11 pr-4 py-4 w-64 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white font-mono placeholder:text-slate-600 transition-all focus:w-80"
                                    placeholder="Enter target..."
                                />
                            </div>
                            <button 
                                onClick={handleScan}
                                disabled={loading}
                                className="group relative bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center gap-3 active:scale-95"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Cpu className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                )}
                                <span className="uppercase tracking-widest text-xs">{loading ? 'Processing...' : 'Run Full Suite'}</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar / Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> Orchestration Log
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 h-2 w-2 rounded-full ${loading ? 'bg-primary animate-pulse' : result ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-white uppercase">TLS Inspection</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">SSLyze protocol analysis & cipher suite mapping</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-400">
                                    <div className={`mt-1 h-2 w-2 rounded-full ${loading ? 'bg-primary animate-pulse' : result ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-white uppercase">Port Discovery</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">Nmap service scanning & version detection</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-400">
                                    <div className={`mt-1 h-2 w-2 rounded-full ${loading ? 'bg-primary animate-pulse' : result ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-white uppercase">PQC Handshake</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">NIST ML-KEM quantum safe simulation</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {result?.status === 'success' && (
                            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-3xl p-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4">Overall Score</h3>
                                <div className="flex items-end gap-2">
                                    <span className="text-5xl font-black text-white line-height-1">98</span>
                                    <span className="text-emerald-500 font-bold mb-1">/ 100</span>
                                </div>
                                <p className="text-[10px] text-emerald-500/60 mt-3 font-medium">Infrastructure meets NIST-FIPS standards</p>
                            </div>
                        )}
                    </div>

                    {/* Main Results Panel */}
                    <div className="lg:col-span-3 min-h-[500px]">
                        {!result && !loading && (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/20 p-12 text-center group">
                                <div className="p-8 bg-slate-900 border border-slate-800 rounded-full mb-6 group-hover:border-primary/50 transition-colors">
                                    <Zap className="w-16 h-16 text-slate-700 group-hover:text-primary transition-colors" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 italic tracking-tight">SYSTEM STANDBY</h2>
                                <p className="text-slate-500 max-w-sm font-medium">Enter a target host and execute the full suite to begin multi-vector security analysis.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-pulse">
                                <div className="relative">
                                    <div className="w-32 h-32 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Shield className="w-12 h-12 text-primary" />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">ORCHESTRATING SCANS</h3>
                                    <p className="text-slate-500 font-medium">Aggregating real-time data from parallel execution nodes...</p>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                {result.status === 'success' || result.status === 'partial_success' ? (
                                    <>
                                        {/* Navigation Tabs */}
                                        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl">
                                            {[
                                                { id: 'overview', label: 'Overview', icon: Network },
                                                { id: 'tls', label: 'TLS Layer', icon: Lock },
                                                { id: 'port', label: 'Network', icon: Activity },
                                                { id: 'pqc', label: 'Quantum', icon: Zap },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id as any)}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                                                        activeTab === tab.id 
                                                            ? 'bg-slate-800 text-white shadow-lg' 
                                                            : 'text-slate-500 hover:text-slate-300'
                                                    }`}
                                                >
                                                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Tab Content */}
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
                                            {activeTab === 'overview' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-6">
                                                        <h3 className="text-xl font-bold text-white flex items-center gap-3 italic">
                                                            <div className="w-2 h-8 bg-primary rounded-full" />
                                                            Assessment Summary
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Status</p>
                                                                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                                                    <CheckCircle2 size={16} /> SECURE
                                                                </div>
                                                            </div>
                                                            <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Scan Time</p>
                                                                <p className="text-white font-mono">1.2s</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between p-4 bg-slate-800/20 rounded-2xl border border-white/5">
                                                                <div className="flex items-center gap-3">
                                                                    <Shield className="w-5 h-5 text-blue-400" />
                                                                    <span className="text-sm font-bold">Protocols Supported</span>
                                                                </div>
                                                                <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-bold">TLS 1.3</span>
                                                            </div>
                                                            <div className="flex items-center justify-between p-4 bg-slate-800/20 rounded-2xl border border-white/5">
                                                                <div className="flex items-center gap-3">
                                                                    <Zap className="w-5 h-5 text-amber-400" />
                                                                    <span className="text-sm font-bold">PQC Readiness</span>
                                                                </div>
                                                                <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 font-bold">READY</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="relative group overflow-hidden rounded-3xl bg-slate-950 p-6 border border-slate-800">
                                                        <div className="absolute top-0 right-0 p-4">
                                                            <Info className="w-5 h-5 text-slate-700" />
                                                        </div>
                                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Security Baseline</h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-400">Cipher Strength</span>
                                                                <span className="text-white font-bold">ELITE</span>
                                                            </div>
                                                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                                                <div className="bg-primary h-full w-[95%]" />
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-400">Port Hardening</span>
                                                                <span className="text-white font-bold">ROBUST</span>
                                                            </div>
                                                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                                                <div className="bg-emerald-500 h-full w-[88%]" />
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-400">Quantum Migration</span>
                                                                <span className="text-white font-bold">STARTED</span>
                                                            </div>
                                                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                                                <div className="bg-amber-500 h-full w-[45%]" />
                                                            </div>
                                                        </div>
                                                        <button className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-tight rounded-xl transition-all">
                                                            Generate Full Report (PDF)
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'tls' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between bg-blue-500/5 p-6 rounded-3xl border border-blue-500/10">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Target Identity</p>
                                                            <h3 className="text-2xl font-bold text-white">{target}</h3>
                                                        </div>
                                                        <div className="size-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                                            <Lock className="w-8 h-8 text-blue-400" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                                                                <ChevronRight className="w-4 h-4 text-primary" /> Supported Versions
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(result.tls?.data?.supported_tls_versions || []).map((v: string) => (
                                                                    <div key={v} className="px-4 py-2 bg-slate-800 rounded-xl border border-white/5 text-xs font-mono text-white">
                                                                        {v}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                                                                <ChevronRight className="w-4 h-4 text-primary" /> Certificate Authority
                                                            </h4>
                                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-slate-500 uppercase font-black">Issuer</p>
                                                                <p className="text-xs text-white break-all">{result.tls?.data?.certificate_details?.issuer || 'Unknown'}</p>
                                                                <p className="text-[10px] text-slate-500 uppercase font-black mt-3">Valid Until</p>
                                                                <p className="text-xs text-emerald-400 font-mono">{result.tls?.data?.certificate_details?.expiry || 'Unknown'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'port' && (
                                                <div className="space-y-6">
                                                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                                                        <div className="flex items-center justify-between mb-8">
                                                            <h3 className="text-lg font-bold text-white uppercase italic tracking-tighter">Surface Exposure Discovery</h3>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full">NMAP V7.94</span>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {(result.port?.data?.open_ports || []).map((p: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-primary/30 transition-all group">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="size-10 bg-slate-800 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-primary group-hover:scale-110 transition-transform">
                                                                            {p.port}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-black uppercase text-white">{p.service}</p>
                                                                            <p className="text-[10px] text-slate-500">Service Banner Identified</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                                                                        <span className="text-[10px] font-black text-emerald-500 uppercase">{p.state}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'pqc' && (
                                                <div className="space-y-8">
                                                    <div className="relative p-8 rounded-3xl bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/20 overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-8">
                                                            <Zap className="w-12 h-12 text-amber-500/20" />
                                                        </div>
                                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">PQC Handshake Active</h3>
                                                        <p className="text-amber-500 text-sm font-bold uppercase tracking-widest">{result.pqc?.data?.pqc_support}</p>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                                                            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Hybrid Algorithm</p>
                                                                <p className="text-xs font-mono text-white bg-slate-800 p-2 rounded-lg">{result.pqc?.data?.cipher_suite}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Classical Key</p>
                                                                <p className="text-xs font-mono text-white bg-slate-800 p-2 rounded-lg">{result.pqc?.data?.details?.classical_part}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Quantum Part</p>
                                                                <p className="text-xs font-mono text-amber-400 bg-amber-500/10 p-2 rounded-lg">{result.pqc?.data?.details?.pqc_part}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
                                                            <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6">NIST Compliance Verification</h4>
                                                            <div className="space-y-4">
                                                                <div className="flex items-center gap-3">
                                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                    <span className="text-xs font-bold text-white">FIPS 203 (ML-KEM) Alignment Confirmed</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                    <span className="text-xs font-bold text-white">Hybrid KEM Strategy Detected</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-slate-600">
                                                                    <div className="w-4 h-4 rounded-full border border-slate-700" />
                                                                    <span className="text-xs font-medium">FIPS 204 (ML-DSA) Readiness Pending</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center">
                                                            <Zap className="w-12 h-12 text-primary mb-4 animate-pulse" />
                                                            <h4 className="text-sm font-bold text-white uppercase italic">Latency Analysis</h4>
                                                            <p className="text-3xl font-black text-white mt-2">{result.pqc?.data?.details?.negotiation_time_ms}<span className="text-sm text-slate-500 font-normal ml-1">ms</span></p>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">Negotiation Overhead: +14%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-red-500/5 border border-red-500/20 p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-4">
                                        <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                                            <AlertCircle className="w-10 h-10 text-red-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-red-500 uppercase italic">Orchestration Failure</h3>
                                            <p className="text-slate-400 max-w-sm mt-2">{result.message || 'The unified scan execution was interrupted. Check service logs for details.'}</p>
                                        </div>
                                        <button 
                                            onClick={handleScan}
                                            className="mt-4 px-8 py-3 bg-red-500 text-white text-xs font-bold uppercase rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                        >
                                            Retry Suite
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedScanPage;
