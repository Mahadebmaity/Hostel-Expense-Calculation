import React from 'react';
import { 
  TrendingUp, 
  Utensils, 
  Wallet, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';

export default function MetricCards({ balances, currentUserId }) {
  if (!balances) return null;

  const myRecord = balances.member_balances?.find(m => m.user_id === currentUserId);
  const myNetBalance = myRecord ? myRecord.net_balance : 0.0;
  const isRefund = myNetBalance >= 0;
  const curr = balances.currency === 'INR' ? '₹' : balances.currency;

  const isMess = balances.group_type === 'MESS';

  return (
    <div className="metric-cards-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* 1. My Personal Balance Card */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        background: isRefund 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(17, 24, 39, 0.7))'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(17, 24, 39, 0.7))',
        border: `1px solid ${isRefund ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            My Balance Status
          </span>
          <div style={{
            padding: '0.4rem',
            borderRadius: '8px',
            background: isRefund ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isRefund ? '#34d399' : '#f87171'
          }}>
            {isRefund ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: isRefund ? '#34d399' : '#f87171' }}>
            {isRefund ? `+${curr}${myNetBalance.toFixed(2)}` : `-${curr}${Math.abs(myNetBalance).toFixed(2)}`}
          </h2>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
          {isRefund ? '🎉 You are owed a refund' : '⚠️ You need to pay the mess/group'}
        </p>
      </div>

      {/* 2. Total Group Spend */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Total Group Spending
          </span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Wallet size={18} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc' }}>
          {curr}{balances.total_expenses?.toFixed(2) || '0.00'}
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
          {isMess ? `Fixed: ${curr}${balances.total_fixed_costs?.toFixed(0)} • Grocery: ${curr}${balances.total_variable_grocery?.toFixed(0)}` : 'All expenses combined'}
        </p>
      </div>

      {/* 3. Dynamic Meal Rate (If Mess) / Total Members */}
      {isMess ? (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Calculated Meal Rate
            </span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24' }}>
            {curr}{balances.meal_rate?.toFixed(2) || '0.00'}<span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>/meal</span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Total {balances.total_meals?.toFixed(1) || 0} meals consumed
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Active Members
            </span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#c084fc' }}>
            {balances.member_balances?.length || 0}
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Equal & Custom splitters active
          </p>
        </div>
      )}

      {/* 4. My Deposits / Contributed */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            My Total Paid In
          </span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Receipt size={18} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc' }}>
          {curr}{myRecord?.total_paid?.toFixed(2) || '0.00'}
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
          Deposit: {curr}{myRecord?.deposit_paid?.toFixed(0) || 0} + Direct: {curr}{myRecord?.direct_expenses_paid?.toFixed(0) || 0}
        </p>
      </div>
    </div>
  );
}
