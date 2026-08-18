import React from 'react';
import { PieChart, TrendingUp, DollarSign } from 'lucide-react';

const CATEGORY_COLORS = {
  GROCERY: '#34d399',
  GAS: '#f97316',
  ELECTRICITY: '#eab308',
  RENT: '#38bdf8',
  MAID: '#a855f7',
  SNACKS: '#ec4899',
  OUTING: '#60a5fa',
  OTHER: '#94a3b8'
};

export default function AnalyticsCharts({ analytics, currency = 'INR' }) {
  if (!analytics || !analytics.category_breakdown) return null;

  const { total_spent, category_breakdown } = analytics;
  const curr = currency === 'INR' ? '₹' : currency;

  const categories = Object.entries(category_breakdown);

  // Calculate SVG donut segments
  let cumulativePercent = 0;
  const segments = categories.map(([cat, amount]) => {
    const percent = total_spent > 0 ? (amount / total_spent) * 100 : 0;
    const startAngle = (cumulativePercent / 100) * 360;
    cumulativePercent += percent;
    const endAngle = (cumulativePercent / 100) * 360;
    return {
      cat,
      amount,
      percent,
      color: CATEGORY_COLORS[cat] || '#64748b'
    };
  });

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
          <PieChart size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Expense Category Analytics</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Visual breakdown of shared expenditures</p>
        </div>
      </div>

      {total_spent === 0 ? (
        <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '1.5rem' }}>
          No expenses recorded to generate analytics.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          {/* Progress Bar List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {segments.map(seg => (
              <div key={seg.cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <span style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color }}></span>
                    {seg.cat}
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    {curr}{seg.amount.toFixed(2)} ({seg.percent.toFixed(1)}%)
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${seg.percent}%`, height: '100%', background: seg.color, borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Center Summary Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Cumulative Spend</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', margin: '0.35rem 0' }}>
              {curr}{total_spent.toFixed(2)}
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#34d399' }}>
              Across {segments.length} active categories
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
