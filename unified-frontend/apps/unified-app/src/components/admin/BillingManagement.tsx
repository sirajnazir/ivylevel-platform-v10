import React from 'react';
import { CreditCard, DollarSign, TrendingUp, Users } from 'lucide-react';

export const BillingManagement: React.FC = () => {
  const stats = [
    { label: 'Monthly Revenue', value: '$45,200', change: '+23%', icon: <DollarSign /> },
    { label: 'Active Subscriptions', value: '48', change: '+5', icon: <Users /> },
    { label: 'ARPU', value: '$942', change: '+12%', icon: <TrendingUp /> },
    { label: 'Churn Rate', value: '3.2%', change: '-0.8%', icon: <CreditCard /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Billing & Subscriptions</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg text-gray-600">
                {stat.icon}
              </div>
              <span className={`text-sm font-medium ${
                stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <p className="text-gray-600">Transaction history will be displayed here.</p>
      </div>
    </div>
  );
};