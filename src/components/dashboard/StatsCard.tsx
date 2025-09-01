import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p className={`mt-2 text-sm ${
              change.type === 'increase' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              <span className="flex items-center">
                {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
              </span>
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-blue-50 rounded-full">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
