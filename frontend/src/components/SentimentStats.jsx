import { useState, useEffect } from 'react';

export function SentimentStats({ productId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    sentimentApi.getStats(productId).then(setStats);
  }, [productId]);

  if (!stats) return <div>Loading stats...</div>;

  const total = stats.total || 1;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {stats.positive}
        </div>
        <div className="text-sm text-gray-600">
          Positive ({((stats.positive / total) * 100).toFixed(0)}%)
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-600">
          {stats.neutral}
        </div>
        <div className="text-sm text-gray-600">
          Neutral ({((stats.neutral / total) * 100).toFixed(0)}%)
        </div>
      </div>

      <div className="p-4 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-600">
          {stats.negative}
        </div>
        <div className="text-sm text-gray-600">
          Negative ({((stats.negative / total) * 100).toFixed(0)}%)
        </div>
      </div>
    </div>
  );
}