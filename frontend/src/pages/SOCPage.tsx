import React from 'react';
import SOCAnalystQueue from '../components/soc/SOCAnalystQueue';

const SOCPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SOC Analyst Queue</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Live TLS anomaly stream with playbook and approval actions wired into the existing SOC module.
        </p>
      </div>
      <SOCAnalystQueue />
    </div>
  );
};

export default SOCPage;
