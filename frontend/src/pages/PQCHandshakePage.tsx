import React, { useState } from 'react';
import { Cpu, Search, Terminal, AlertCircle, CheckCircle2, Shield, Activity, ListFilter, Lock, Radio, Zap, Waves, Sparkles, Orbit, Binary, FileJson } from 'lucide-react';

const PQCHandshakePage: React.FC = () => {
    const [target, setTarget] = useState('localhost');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleScan = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8001/api/v1/scan/pqc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target })
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Scan failed:', error);
            setResult({ status: 'error', message: 'Connection to PQC probe backend failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-[#050505] text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-purple-500/10 rounded-xl relative group overflow-hidden">
                            <Waves className="w-8 h-8 text-purple-400 group-hover:scale-125 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent animate-pulse" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
                            PQC Handshake Analysis
                        </h1>
                    </div>
                    <p className="text-gray-400 text-lg">Post-Quantum Cryptography readiness testing using liboqs-based custom probes</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Control Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-xl group hover:border-purple-500/20 transition-all duration-700">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-4">
                                <Orbit className="w-5 h-5 text-purple-400 animate-spin-slow" /> Probe Settings
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold font-mono">Service Endpoint</label>
                                    <input 
                                        type="text" 
                                        value={target}
                                        onChange={(e) => setTarget(e.target.value)}
                                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                                        placeholder="localhost:443"
                                    />
                                </div>
                                <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 mb-2">
                                    <h4 className="text-[10px] text-purple-400 uppercase font-bold tracking-wider mb-2">Negotiation Strategy</h4>
                                    <p className="text-xs text-gray-500 font-mono italic">Hybrid (Classical + PQC)</p>
                                    <p className="text-xs text-gray-500 font-mono mt-1">X25519 + Kyber/ML-KEM</p>
                                </div>
                                <button 
                                    onClick={handleScan}
                                    disabled={loading}
                                    className="w-full relative overflow-hidden group bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-transparent opacity-0 group-hover:opacity-20 transition-opacity" />
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Sparkles className="w-5 h-5 text-purple-200" />
                                    )}
                                    {loading ? 'Negotiating...' : 'Launch PQC Probe'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 group hover:border-blue-500/20 transition-all duration-700">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">LibOQS Implementation</span>
                                <Binary className="w-4 h-4 text-blue-500" />
                            </h3>
                            <div className="bg-black/80 rounded-xl p-4 font-mono text-[10px] text-blue-400 group-hover:text-blue-300 transition-colors leading-relaxed">
                                {/* Simulated custom probe logic */}
                                <span className="text-gray-600"># Custom Probe Init</span><br/>
                                oqs_ctx = oqs_init_handshake()<br/>
                                <span className="text-gray-600"># Setting X25519+ML-KEM-768</span><br/>
                                set_cipher(oqs_ctx, "X25519+ML-KEM-768")<br/>
                                attempt_client_hello(oqs_ctx, "{target}")
                            </div>
                        </div>
                    </div>

                    {/* Results Display */}
                    <div className="lg:col-span-2">
                        {!result && !loading && (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01] transition-all duration-700 hover:bg-white/[0.02]">
                                <div className="p-6 bg-white/[0.02] rounded-full mb-6">
                                    <Sparkles className="w-12 h-12 text-white/5" />
                                </div>
                                <p className="text-gray-600 text-lg font-medium">Ready for Post-Quantum cryptographic negotiation</p>
                            </div>
                        )}

                        {loading && (
                            <div className="h-full min-h-[450px] flex flex-col items-center justify-center space-y-10 relative overflow-hidden rounded-2xl bg-[#0A0A0A] border border-white/5">
                                 {/* Loading Animation - Quantum Inspired */}
                                 <div className="relative">
                                    <div className="w-32 h-32 border border-purple-500/10 rounded-full animate-bounce duration-[3s]" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                         <div className="w-16 h-16 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                                    </div>
                                    <div className="absolute inset-x-0 -top-8 flex justify-center">
                                         <Waves className="w-8 h-8 text-purple-400/30 animate-pulse" />
                                    </div>
                                 </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white tracking-tight mb-2">Simulating Quantum Handshake</p>
                                    <div className="flex gap-1 justify-center">
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                                    </div>
                                    <p className="text-gray-500 mt-4 font-mono text-[11px] animate-pulse">Negotiating custom KEM extensions...</p>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-8 animate-in slide-in-from-right-12 duration-700">
                                {result.status === 'success' ? (
                                    <>
                                        {/* Status Header - Bold & High Impact */}
                                        <div className="bg-gradient-to-r from-purple-900/20 via-[#111111] to-emerald-900/20 border border-white/5 p-8 rounded-3xl flex items-center justify-between shadow-2xl">
                                            <div className="flex items-center gap-8">
                                                <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Status: Verified</p>
                                                    <h3 className="text-3xl font-bold text-white tracking-tight leading-tight">
                                                        {result.data?.pqc_support}
                                                    </h3>
                                                    <p className="text-gray-400 mt-1 font-mono text-xs">Negotiation completed on: {result.timestamp.split('T')[0]} {result.timestamp.split('T')[1].substring(0,8)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">Latency</p>
                                                <span className="text-3xl font-bold text-emerald-400 font-mono tracking-tighter">{result.data?.details.negotiation_time_ms}ms</span>
                                            </div>
                                        </div>

                                        {/* Hybrid Analysis Breakdown */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 relative group overflow-hidden shadow-xl">
                                                 <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-700" />
                                                 <h4 className="flex items-center gap-3 text-sm font-bold text-gray-400 tracking-widest uppercase mb-6">
                                                     <Lock className="w-4 h-4 text-blue-400" /> Classical Layer
                                                 </h4>
                                                 <div className="space-y-4">
                                                     <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                                                         <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Algorithm</span>
                                                         <span className="font-mono text-blue-400 font-bold">{result.data?.details.classical_part}</span>
                                                     </div>
                                                     <p className="text-xs text-gray-500 leading-relaxed font-mono">
                                                         Standard elliptic curve Diffie-Hellman used for baseline secure key exchange.
                                                     </p>
                                                 </div>
                                            </div>

                                            <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 relative group overflow-hidden shadow-xl border-purple-500/10">
                                                 <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />
                                                 <h4 className="flex items-center gap-3 text-sm font-bold text-purple-400 tracking-widest uppercase mb-6">
                                                     <Cpu className="w-4 h-4" /> Quantum Resistant
                                                 </h4>
                                                  <div className="space-y-4">
                                                     <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10 flex items-center justify-between">
                                                         <span className="text-purple-400/50 font-bold text-xs uppercase tracking-wider">KEM</span>
                                                         <span className="font-mono text-purple-400 font-bold">{result.data?.details.pqc_part}</span>
                                                     </div>
                                                     <p className="text-xs text-gray-500 leading-relaxed font-mono">
                                                         NIST-standardized module-lattice-based key-encapsulation mechanism (ML-KEM).
                                                     </p>
                                                 </div>
                                            </div>
                                        </div>

                                        {/* Handshake Sequence Map */}
                                        <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 shadow-inner overflow-hidden">
                                             <div className="flex items-center justify-between mb-8">
                                                <h4 className="text-md font-bold text-white flex items-center gap-3 tracking-tight">
                                                    <FileJson className="w-6 h-6 text-purple-400" /> Handshake Trace
                                                </h4>
                                                <span className="text-[10px] font-mono text-gray-600 bg-black/40 px-3 py-1 rounded-full border border-white/5">PROTOCOL_EXTENSION_0xFE</span>
                                             </div>
                                             
                                             <div className="relative space-y-4 font-mono text-[11px] text-gray-500">
                                                 <div className="flex gap-4 items-center opacity-60">
                                                     <span className="text-indigo-400 w-24 text-right">0.00ms</span>
                                                     <span className="text-white">&gt;&gt; ClientHello</span>
                                                     <span className="text-purple-500/40">(Extension: pq_kem: kyber768)</span>
                                                 </div>
                                                 <div className="flex gap-4 items-center">
                                                     <span className="text-indigo-400 w-24 text-right">18.4ms</span>
                                                     <span className="text-emerald-400">&lt;&lt; ServerHello</span>
                                                     <span className="text-emerald-500/40">(Negotiated: X25519_MLKEM768)</span>
                                                 </div>
                                                 <div className="flex gap-4 items-center opacity-80">
                                                     <span className="text-indigo-400 w-24 text-right">24.2ms</span>
                                                     <span className="text-white">&gt;&gt; ClientKeyExchange</span>
                                                 </div>
                                                 <div className="flex gap-4 items-center">
                                                     <span className="text-indigo-400 w-24 text-right">41.8ms</span>
                                                     <span className="text-emerald-400">&lt;&lt; Finished</span>
                                                 </div>
                                             </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-[#1A0A0A] border border-red-900/30 p-10 rounded-[2.5rem] flex flex-col items-center text-center gap-6 relative overflow-hidden">
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-30" />
                                        <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/20">
                                            <AlertCircle className="w-12 h-12 text-red-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Probe Disruption</h3>
                                            <p className="text-gray-400 max-w-sm font-mono text-xs leading-relaxed">
                                                {result.message || 'PQC negotiation was terminated by the server or timed out.'}<br/>
                                                <span className="text-red-950 font-bold uppercase mt-2 block">Reason: PROTOCOL_MISMATCH</span>
                                            </p>
                                        </div>
                                        <button onClick={handleScan} className="bg-white/5 border border-white/10 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-white/60 hover:text-white">
                                            Recalibrate & Retry
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Subtle background glow */}
            <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        </div>
    );
};

export default PQCHandshakePage;
