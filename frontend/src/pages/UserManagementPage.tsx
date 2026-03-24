import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Operator' | 'Viewer';
  status: 'Active' | 'Pending' | 'Suspended';
}

const mockUsers: User[] = [
  { id: '#USR-8821', name: 'Alexander Wright', email: 'alex.w@enterprise.com', role: 'Administrator', status: 'Active' },
  { id: '#USR-8822', name: 'Sarah Jenkins', email: 's.jenkins@enterprise.com', role: 'Operator', status: 'Active' },
  { id: '#USR-8825', name: 'Marcus Thorne', email: 'm.thorne@enterprise.com', role: 'Viewer', status: 'Pending' },
  { id: '#USR-8829', name: 'Lena Petrova', email: 'l.petrova@enterprise.com', role: 'Operator', status: 'Suspended' },
];

const UserManagementPage: React.FC = () => {
  const getStatusStyle = (status: User['status']) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Suspended': return 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-500 border-slate-300 dark:border-slate-600';
      default: return '';
    }
  };

  const getRoleStyle = (role: User['role']) => {
    switch (role) {
      case 'Administrator': return 'bg-primary/10 text-primary border-primary/30';
      case 'Operator': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
      case 'Viewer': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
      default: return '';
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background-light dark:bg-background-dark p-8 font-display">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">User Directory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure system access and manage administrative roles.</p>
        </div>
        <button className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <span className="material-symbols-outlined">person_add</span>
          Add New User
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <th className="px-6 py-3 font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-xs">ID</th>
                <th className="px-6 py-3 font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-xs">Name / Email</th>
                <th className="px-6 py-3 font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-xs text-center">Role</th>
                <th className="px-6 py-3 font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-xs text-center">Status</th>
                <th className="px-6 py-3 font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{user.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-slate-900 dark:text-slate-100">
                      <span className="font-bold">{user.name}</span>
                      <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-bold uppercase border ${getRoleStyle(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold uppercase border ${getStatusStyle(user.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : user.status === 'Pending' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="rounded bg-slate-100 dark:bg-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary border border-slate-200 dark:border-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button className="rounded bg-slate-100 dark:bg-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 px-6 py-3">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Showing 1 to 4 of 24 entries</span>
          <div className="flex gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white font-bold text-xs ring-2 ring-primary/20">1</button>
            <button className="flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50">2</button>
            <button className="flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50">
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Widgets */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Active Sessions', value: '12', sub: '+2 from last hour', icon: 'sensors', color: 'primary' },
          { label: 'Security Alerts', value: '0', sub: 'All systems nominal', icon: 'warning', color: 'amber' },
          { label: 'License Utilization', value: '45%', sub: 'Progress', icon: 'fact_check', color: 'slate' },
        ].map((widget, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{widget.label}</h3>
              <span className={`material-symbols-outlined text-${widget.color === 'primary' ? 'primary' : widget.color === 'amber' ? 'amber-500' : 'slate-400'}`}>{widget.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{widget.value}</p>
            {widget.label === 'License Utilization' ? (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: widget.value }}></div>
              </div>
            ) : (
              <p className={`text-[10px] font-bold uppercase ${widget.sub.includes('+') ? 'text-emerald-500' : 'text-slate-500'}`}>{widget.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagementPage;
