import React from 'react';
import { Mail, Send, Users, BarChart3 } from 'lucide-react';

export const EmailCampaigns: React.FC = () => {
  const campaigns = [
    { name: 'Welcome Series', sent: 234, opened: '67%', clicked: '23%', status: 'Active' },
    { name: 'College Fair Invite', sent: 156, opened: '72%', clicked: '31%', status: 'Completed' },
    { name: 'SAT Tips Weekly', sent: 89, opened: '81%', clicked: '42%', status: 'Scheduled' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
        <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 flex items-center space-x-2">
          <Send className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.map((campaign, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{campaign.sent}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{campaign.opened}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{campaign.clicked}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    campaign.status === 'Active' ? 'bg-green-100 text-green-800' : 
                    campaign.status === 'Completed' ? 'bg-gray-100 text-gray-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {campaign.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};