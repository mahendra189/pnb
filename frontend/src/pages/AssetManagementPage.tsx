import React, { useState } from 'react';

interface Asset {
  id: string;
  name: string;
  type: string;
  domain: string;
  owner: string;
  status: 'Active' | 'Pending' | 'Offline';
  pqcStatus: 'Ready' | 'Not Ready';
  riskScore: number;
  lastScan: string;
}

const initialAssets: Asset[] = [
  { id: '#AST-4821', name: 'API Gateway Prod', type: 'API', domain: 'api.prod.enterprise.com', owner: 'Alex Rivera', status: 'Active', pqcStatus: 'Not Ready', riskScore: 8.4, lastScan: '2h ago' },
  { id: '#AST-5902', name: 'Customer Portal', type: 'Domain', domain: 'portal.enterprise.com', owner: 'Sarah Chen', status: 'Active', pqcStatus: 'Ready', riskScore: 1.2, lastScan: 'Yesterday' },
  { id: '#AST-1138', name: 'Main Database Node', type: 'Server', domain: '10.0.42.112', owner: 'Infra Team', status: 'Pending', pqcStatus: 'Not Ready', riskScore: 9.1, lastScan: 'Never' },
  { id: '#AST-8821', name: 'Marketing Site', type: 'Domain', domain: 'marketing.enterprise.com', owner: 'Marketing Div', status: 'Offline', pqcStatus: 'Not Ready', riskScore: 4.5, lastScan: '3d ago' },
];

const AssetManagementPage: React.FC = () => {
  const [assets] = useState<Asset[]>(initialAssets);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getRiskColor = (score: number) => {
    if (score < 4) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score < 7) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-background-light dark:bg-background-dark">
      {/* Table Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black tracking-tight">Assets</h1>
          <span className="px-3 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">128 Total</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-primary/30 rounded font-bold text-sm hover:bg-slate-50 dark:hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filter View
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded font-bold text-sm shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Add New Asset
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-primary/5 rounded-xl border border-slate-200 dark:border-primary/20 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-primary/10 border-b border-slate-200 dark:border-primary/20">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">PQC Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Risk Score</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Domain / IP</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Scan</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-primary/10 text-slate-700 dark:text-slate-300">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors group">
                <td className="px-6 py-4 text-sm font-mono text-slate-400">{asset.id}</td>
                <td className="px-6 py-4 text-sm font-bold">{asset.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${asset.pqcStatus === 'Ready' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    {asset.pqcStatus}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(asset.riskScore)}`}>
                    {asset.riskScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{asset.domain}</td>
                <td className="px-6 py-4 text-sm">{asset.status}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{asset.lastScan}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-primary/20 rounded">
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table Footer/Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-primary/5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page 1 of 8</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-200 dark:border-primary/30 rounded text-sm hover:bg-white dark:hover:bg-primary/10 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 bg-primary text-white rounded text-sm font-bold">1</button>
            <button className="px-3 py-1 border border-slate-200 dark:border-primary/30 rounded text-sm hover:bg-white dark:hover:bg-primary/10">2</button>
            <button className="px-3 py-1 border border-slate-200 dark:border-primary/30 rounded text-sm hover:bg-white dark:hover:bg-primary/10">3</button>
            <button className="px-3 py-1 border border-slate-200 dark:border-primary/30 rounded text-sm hover:bg-white dark:hover:bg-primary/10">Next</button>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background-dark/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/30 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-primary/20 flex items-center justify-between bg-slate-50 dark:bg-primary/5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add New Asset</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-primary/20 rounded text-slate-500"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asset Name</label>
                  <input className="w-full px-4 py-2.5 rounded bg-slate-50 dark:bg-primary/10 border border-slate-200 dark:border-primary/20 focus:ring-primary focus:border-primary outline-none text-sm text-slate-900 dark:text-slate-100" placeholder="e.g. Production Load Balancer" type="text"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asset Type</label>
                  <select className="w-full px-4 py-2.5 rounded bg-slate-50 dark:bg-primary/10 border border-slate-200 dark:border-primary/20 focus:ring-primary focus:border-primary outline-none text-sm text-slate-900 dark:text-slate-100">
                    <option>Domain</option>
                    <option>API</option>
                    <option>Server</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Domain / IP Address</label>
                  <input className="w-full px-4 py-2.5 rounded bg-slate-50 dark:bg-primary/10 border border-slate-200 dark:border-primary/20 focus:ring-primary focus:border-primary outline-none text-sm text-slate-900 dark:text-slate-100" placeholder="192.168.1.1" type="text"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea className="w-full px-4 py-2.5 rounded bg-slate-50 dark:bg-primary/10 border border-slate-200 dark:border-primary/20 focus:ring-primary focus:border-primary outline-none text-sm text-slate-900 dark:text-slate-100" placeholder="Additional details about this asset..." rows={3}></textarea>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 dark:bg-primary/5 border-t border-slate-100 dark:border-primary/20 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 border border-slate-200 dark:border-primary/30 rounded font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-primary text-white rounded font-bold text-sm shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
              >
                Create Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagementPage;
