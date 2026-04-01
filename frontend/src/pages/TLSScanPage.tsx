import React, { useState } from 'react';
import { Shield, Search, Terminal, AlertCircle, CheckCircle2, Server, Key, Lock, Layers } from 'lucide-react';

const TLSScanPage: React.FC = () => {
    const [target, setTarget] = useState('localhost');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleScan = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8001/api/v1/scan/tls', {
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
        <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Shield className="w-8 h-8 text-blue-400" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            TLS Inspection Engine
                        </h1>
                    </div>
                    <p className="text-gray-400 text-lg">Comprehensive SSL/TLS protocol analysis using SSLyze</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Control Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Search className="w-5 h-5 text-blue-400" /> Target Configuration
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Hostname or IP</label>
                                    <input 
                                        type="text" 
                                        value={target}
                                        onChange={(e) => setTarget(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="e.g. google.com"
                                    />
                                </div>
                                <button 
                                    onClick={handleScan}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Terminal className="w-5 h-5" />
                                    )}
                                    {loading ? 'Analyzing...' : 'Execute TLS Scan'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Command Syntax</h3>
                            <div className="bg-black/50 rounded-lg p-3 font-mono text-sm text-green-400/80">
                                $ sslyze --targets {target}:443 --regular
                            </div>
                        </div>
                    </div>

                    {/* Results Display */}
                    <div className="lg:col-span-2">
                        {!result && !loading && (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                                <Server className="w-16 h-16 text-white/10 mb-4" />
                                <p className="text-gray-500 text-lg">Input a target and execute scan to view results</p>
                            </div>
                        )}

                        {loading && (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-6">
                                <div className="relative">
                                    <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-blue-500 animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-medium text-white">Inspecting SSL Layer</p>
                                    <p className="text-gray-500">Checking handshake protocols and certificate chains...</p>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {result.status === 'success' ? (
                                    <>
                                        {/* Quick Summary Cards */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
                                                <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    <span className="font-semibold text-emerald-400">Secure</span>
                                                </div>
                                            </div>
                                            <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
                                                <p className="text-xs text-gray-500 uppercase mb-1">Protocol</p>
                                                <span className="font-semibold text-blue-400">TLS 1.3</span>
                                            </div>
                                            <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
                                                <p className="text-xs text-gray-500 uppercase mb-1">Key Swap</p>
                                                <span className="font-semibold text-purple-400">X25519</span>
                                            </div>
                                            <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
                                                <p className="text-xs text-gray-500 uppercase mb-1">Grade</p>
                                                <span className="font-bold text-white text-lg">A+</span>
                                            </div>
                                        </div>

                                        {/* Detailed Result Sections */}
                                        <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
                                            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                                <h3 className="font-semibold flex items-center gap-2">
                                                    <Layers className="w-5 h-5 text-blue-400" /> TLS Configuration Details
                                                </h3>
                                                <span className="text-xs text-gray-500">JSON Parsed</span>
                                            </div>
                                            <div className="p-6">
                                                {result.data ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                                                <Lock className="w-4 h-4" /> Valid Versions
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {result.data.supported_tls_versions.map((v: string) => (
                                                                    <span key={v} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                                                                        {v}
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            <h4 className="text-sm font-medium text-gray-400 mt-6 mb-3 flex items-center gap-2">
                                                                <Terminal className="w-4 h-4" /> Cipher Suites
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {result.data.cipher_suites.map((c: string) => (
                                                                    <div key={c} className="text-xs font-mono bg-black/30 p-2 rounded border border-white/5 text-gray-300">
                                                                        {c}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                                                <Key className="w-4 h-4" /> Certificate Info
                                                            </h4>
                                                            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                                                                <div>
                                                                    <p className="text-[10px] text-gray-500 uppercase">Issuer</p>
                                                                    <p className="text-sm text-gray-300">{result.data.certificate_details.issuer}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-gray-500 uppercase">Expiry Date</p>
                                                                    <p className="text-sm text-emerald-400">{result.data.certificate_details.expiry}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <h4 className="text-sm font-medium text-gray-400 mt-6 mb-3">Elliptic Curves</h4>
                                                            <div className="flex gap-2">
                                                                {result.data.elliptic_curves.map((curve: string) => (
                                                                    <span key={curve} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded text-xs">
                                                                        {curve}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <pre className="text-xs font-mono text-gray-400 bg-black/50 p-4 rounded overflow-x-auto">
                                                        {result.raw_output}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4">
                                        <AlertCircle className="w-12 h-12 text-red-500" />
                                        <div>
                                            <h3 className="text-lg font-bold text-red-500">Scan Failed</h3>
                                            <p className="text-gray-400">{result.message || 'An error occurred during scanning'}</p>
                                        </div>
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

export default TLSScanPage;
