//frontend\src\app\user\dashboard\page.jsx
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  TrendingUp,
  Search,
  Bell,
  Heart,
  Tag
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [isDark, setIsDark] = useState(false);
  const [stats, setStats] = useState({ total: 0, positive: 0, neutral: 0, negative: 0 });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [aspects, setAspects] = useState([]);
  const [emotions, setEmotions] = useState([]);

  // Detect system theme
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkMode);
      document.documentElement.classList.toggle('dark', isDarkMode);
    };

    checkTheme();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => mediaQuery.removeEventListener('change', checkTheme);
  }, []);

  // Fetch data
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetchDashboardData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await fetch(
        `http://localhost:8000/stats?user_email=${session.user.email}`
      );
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch recent reviews
      const reviewsRes = await fetch(
        `http://localhost:8000/reviews?user_email=${session.user.email}&limit=5`
      );
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData.reviews || []);

      // Fetch top aspects
      const aspectsRes = await fetch(
        `http://localhost:8000/top-aspects?user_email=${session.user.email}&limit=10`
      );
      const aspectsData = await aspectsRes.json();
      setAspects(aspectsData.aspects || []);

      // Fetch real sentiment trend data
      const trendRes = await fetch(
        `http://localhost:8000/sentiment-trend?user_email=${session.user.email}&days=7`
      );
      const trendDataRes = await trendRes.json();
      if (trendDataRes.success) {
        setTrendData({
          days: trendDataRes.days,
          positive: trendDataRes.positive,
          neutral: trendDataRes.neutral,
          negative: trendDataRes.negative
        });
      }

      // Fetch real emotion distribution data
      const emotionRes = await fetch(
        `http://localhost:8000/emotion-distribution?user_email=${session.user.email}`
      );
      const emotionDataRes = await emotionRes.json();
      if (emotionDataRes.success) {
        setEmotions(emotionDataRes.emotions);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', badge: 'bg-green-500' },
      negative: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-500' },
      neutral: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-500' }
    };
    return colors[sentiment?.toLowerCase()] || colors.neutral;
  };

  const npsScore = 62;

  // Chart configurations
  const trendChartData = trendData ? {
    labels: trendData.days,
    datasets: [
      {
        label: 'Positive',
        data: trendData.positive,
        borderColor: '#4CD4A5',
        backgroundColor: 'rgba(76, 212, 165, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Neutral',
        data: trendData.neutral,
        borderColor: '#FCD34D',
        backgroundColor: 'rgba(252, 211, 77, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Negative',
        data: trendData.negative,
        borderColor: '#E95252',
        backgroundColor: 'rgba(233, 82, 82, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  } : null;

  const ratioChartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [stats.positive || 0, stats.neutral || 0, stats.negative || 0],
      backgroundColor: ['#4CD4A5', '#FCD34D', '#E95252'],
      borderWidth: 0
    }]
  };

  const emotionChartData = emotions.length > 0 ? {
    labels: emotions.map(e => e.name),
    datasets: [{
      data: emotions.map(e => e.value),
      backgroundColor: emotions.map(e => e.color),
      borderRadius: 4,
      barThickness: 20
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1
      }
    },
    scales: {
      y: { display: false },
      x: { 
        grid: { display: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1
      }
    }
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1
      }
    },
    scales: {
      x: { display: false },
      y: {
        grid: { display: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 12 } }
      }
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-900 transition-colors">
      {/* Main Content - No sidebar, UserSidebar.jsx handles that */}
      <main>
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-30 backdrop-blur-sm bg-[#FAF8F5]/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search analytics..."
                className="pl-10 pr-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>
            <button className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 relative">
              <Bell className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-800"></span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* 1st Row - Total Reviews + NPS Score (left) | Emotional Distribution (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Total Reviews and NPS Score stacked */}
            <div className="space-y-6">
              {/* Total Reviews */}
              <div className="rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    +12.5%
                  </span>
                </div>
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-slate-400">
                  Total Reviews
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total.toLocaleString()}
                </div>
                <p className="text-xs mt-2 text-gray-500 dark:text-slate-500">
                  Total collected feedback
                </p>
              </div>

              {/* NPS Score */}
              <div className="rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                    <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">Excellent</span>
                </div>
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-slate-400">
                  NPS Score
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">+{npsScore}</div>
                <p className="text-xs mt-2 text-gray-500 dark:text-slate-500">
                  Top 10% of industry
                </p>
              </div>
            </div>

            {/* Right Column - Emotional Distribution */}
            <div className="lg:col-span-2 rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
                Emotional Distribution
              </h3>
              {emotionChartData ? (
                <div className="h-[280px]">
                  <Bar data={emotionChartData} options={barOptions} />
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-500 dark:text-slate-500">
                  No emotion data available yet
                </div>
              )}
            </div>
          </div>

          {/* 2nd Row - Sentiment Trend (left) | Sentiment Ratio (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sentiment Trend */}
            <div className="lg:col-span-3 rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Sentiment Trend (7 Days)
                </h3>
              </div>
              {trendChartData ? (
                <div className="h-64">
                  <Line data={trendChartData} options={chartOptions} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-slate-500">
                  No trend data available yet
                </div>
              )}
            </div>

            {/* Sentiment Ratio */}
            <div className="rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                Sentiment Ratio
              </h3>
              {stats.total > 0 ? (
                <>
                  <div className="h-40 relative flex items-center justify-center">
                    <Doughnut data={ratioChartData} options={doughnutOptions} />
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Math.round((stats.positive / stats.total) * 100)}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-500">Positive</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs mt-4 px-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-600 dark:text-slate-400">Pos: {stats.positive}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-600 dark:text-slate-400">Neu: {stats.neutral}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-gray-600 dark:text-slate-400">Neg: {stats.negative}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-500 dark:text-slate-500">
                  No reviews yet
                </div>
              )}
            </div>
          </div>

          {/* 3rd Row - Recent Reviews (left) | Keyword Cloud (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Recent Reviews */}
            <div className="lg:col-span-3 rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Heart className="w-5 h-5" />
                  Recent Reviews
                </h3>
                <button 
                  onClick={() => router.push('/user/history')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviews.map((review) => {
                  const colors = getSentimentColor(review.sentiment);
                  return (
                    <div key={review._id} className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {review.user || 'Anonymous'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {Math.round(review.confidence * 10)}/10
                        </span>
                      </div>
                      <p className="text-xs mb-2 line-clamp-3 text-gray-600 dark:text-slate-400">
                        "{review.text}"
                      </p>
                      <span className="text-[10px] text-gray-500 dark:text-slate-500">
                        {new Date(review.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aspect Cloud */}
            <div className="rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Tag className="w-5 h-5" />
                Aspect Cloud
              </h3>
              <div className="flex flex-wrap gap-2">
                {aspects.length > 0 ? (
                  aspects.map((aspect, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:scale-105 transition-transform cursor-default"
                      style={{ fontSize: `${Math.max(0.8, aspect.count / 10)}rem` }}
                    >
                      {aspect.name} ({aspect.count})
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-500">No aspects detected yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}