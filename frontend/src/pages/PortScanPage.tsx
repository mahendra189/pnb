import React, { useState } from 'react';
import { Network, Search, Terminal, AlertCircle, CheckCircle2, Shield, Activity, ListFilter, Cpu, Radio, Zap, Lock } from 'lucide-react';

const PortScanPage: React.FC = () => {
    const [target, setTarget] = useState('localhost');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleScan = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8001/api/v1/scan/port', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target })
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Scan failed:', error);
            setResult({ status: 'error', message: 'Connection to scan backend failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-[#050505] text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Network className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                            Crypto-Targeted Port Scan
                        </h1>
                    </div>
                    <p className="text-gray-400 text-lg">Infrastructure reconnaissance focusing on crypto-relevant ports using Nmap</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Control Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Search className="w-5 h-5 text-emerald-400" /> Scanner Config
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Service Host / IP</label>
                                    <input 
                                        type="text" 
                                        value={target}
                                        onChange={(e) => setTarget(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                                        placeholder="localhost"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Target Ports</label>
                                    <p className="text-[10px] text-emerald-400/50 mb-2 font-mono">443, 8443, 8080, 9443</p>
                                </div>
                                <button 
                                    onClick={handleScan}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Zap className="w-5 h-5" />
                                    )}
                                    {loading ? 'Probing Ports...' : 'Execute Port Scan'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> Shell Execution
                            </h3>
                            <div className="bg-black/50 rounded-lg p-3 font-mono text-[11px] text-emerald-400/80 leading-relaxed">
                                $ nmap -p 443,8443,8080,9443 {target} --script ssl-enum-ciphers -oX -
                            </div>
                        </div>
                    </div>

                    {/* Results Display */}
                    <div className="lg:col-span-2">
                        {!result && !loading && (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                                <Activity className="w-16 h-16 text-white/5 mb-4" />
                                <p className="text-gray-600 text-lg">Awaiting discovery scan initiation...</p>
                            </div>
                        )}

                        {loading && (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full animate-ping"></div>
                                    <div className="w-12 h-12 bg-teal-500/10 rounded-full animate-ping delay-100"></div>
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full animate-ping delay-200"></div>
                                    <div className="w-12 h-12 bg-teal-500/10 rounded-full animate-ping delay-300"></div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-medium text-white">Discovery Active</p>
                                    <p className="text-gray-500">Mapping crypto-relevant ports on {target}...</p>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                {result.status === 'success' ? (
                                    <>
                                        {/* Port Status Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {result.data?.open_ports.map((p: any) => (
                                                <div key={p.port} className={`bg-[#111111] border ${p.state === 'open' ? 'border-emerald-500/20' : 'border-white/5'} p-4 rounded-xl relative overflow-hidden`}>
                                                    {p.state === 'open' && <div className="absolute top-0 right-0 p-1 bg-emerald-500/10 rounded-bl-lg"><Radio className="w-3 h-3 text-emerald-500 animate-pulse" /></div>}
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Port {p.port}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-lg text-white">{p.service.toUpperCase()}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${p.state === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                            {p.state.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Security Enumeration Details */}
                                        <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                                <h3 className="font-semibold flex items-center gap-2">
                                                    <ListFilter className="w-5 h-5 text-emerald-400" /> Cipher Suite Enumeration
                                                </h3>
                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">SSL-Enum-Ciphers</span>
                                            </div>
                                            <div className="p-6">
                                                <div className="space-y-4">
                                                    {result.data?.ciphers.map((c: string, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-4 p-4 bg-black/40 border border-white/5 rounded-xl hover:border-emerald-500/30 transition-colors group">
                                                            <div className="p-2 bg-emerald-500/5 rounded-lg text-emerald-500 group-hover:bg-emerald-500/10 h-min">
                                                                <Lock className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-xs font-mono text-gray-300 leading-relaxed font-bold mb-1">
                                                                    {c.split(' - ')[0]}
                                                                </p>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] text-emerald-500 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">Strong</span>
                                                                    <span className="text-[10px] text-gray-500">Kx: ECDHE</span>
                                                                    <span className="text-[10px] text-gray-500 font-mono">Rank: {c.split(' - ')[1] || 'A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Raw XML Preview (Optional Toggle) */}
                                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
                                             <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                                    <Cpu className="w-4 h-4 text-emerald-400" /> Scanner Engine Diagnostics
                                                </h4>
                                             </div>
                                             <div className="bg-black/80 rounded-xl p-4 font-mono text-[10px] text-gray-500 overflow-x-auto max-h-[150px]">
                                                {result.raw_output || "No raw diagnostic output available for this scan profile."}
                                             </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                                        <div className="p-4 bg-red-500/20 rounded-full">
                                            <AlertCircle className="w-8 h-8 text-red-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-red-500 mb-1">Discovery Fault</h3>
                                            <p className="text-gray-400 max-w-sm">{result.message || 'The port scan operation failed to complete.'}</p>
                                        </div>
                                        <button onClick={handleScan} className="mt-2 text-sm text-red-400 underline underline-offset-4 hover:text-red-300">Retry Scan</button>
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

export default PortScanPage;
