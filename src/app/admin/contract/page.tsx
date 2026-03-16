import React from 'react';
import ContractDashboard from '@/components/admin/contract/contract_dashboard';

export const metadata = {
  title: 'Smart Contract Dashboard',
  description: 'Monitor the status of the TaskBoard and its underlying security tokens.',
};

export default function ContractPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Smart Contract Dashboard</h1>
        <p className="text-gray-400">Monitor the TaskBoard and ERC-3643 Token parameters and activity directly from the blockchain.</p>
      </div>
      
      <ContractDashboard />
    </div>
  );
}
