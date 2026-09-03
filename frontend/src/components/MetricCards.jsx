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
  const isTrip = balances.group_type === 'TRIP';

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
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), var(--bg-surface))'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), var(--bg-surface))',
        border: `1px solid ${isRefund ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            My Balance Status
          </span>
          <div style={{
            padding: '0.4rem',
            borderRadius: '8px',
            background: isRefund ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isRefund ? '#10b981' : '#ef4444'
          }}>
            {isRefund ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: isRefund ? '#10b981' : '#ef4444' }}>
            {isRefund ? `+${curr}${myNetBalance.toFixed(2)}` : `-${curr}${Math.abs(myNetBalance).toFixed(2)}`}
          </h2>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          {isRefund ? '🎉 You are owed a refund' : '⚠️ You need to pay the mess/group'}
        </p>
      </div>

      {/* 2. Total Group Spend */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            {isTrip ? 'Total Trip Spending' : 'Total Group Spending'}
          </span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Wallet size={18} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {curr}{(balances.total_trip_expense || balances.total_expenses || 0).toFixed(2)}
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          {isMess 
            ? `Fixed: ${curr}${(balances.total_establishment || 0).toFixed(0)} • Bazar: ${curr}${(balances.total_meal_expenses || 0).toFixed(0)}` 
            : isTrip 
              ? 'All travel expenses combined' 
              : 'All expenses combined'}
        </p>
      </div>

      {/* 3. Dynamic Meal Rate (If Mess) / Trip Budget (If Trip) / Total Members */}
      {isMess ? (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Calculated Meal Rate
            </span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b' }}>
            {curr}{balances.meal_rate?.toFixed(2) || '0.00'}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/meal</span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Total {balances.total_meals?.toFixed(1) || 0} meals consumed
          </p>
        </div>
      ) : isTrip && balances.trip_budget > 0 ? (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Remaining Trip Budget
            </span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: (balances.remaining_budget ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
            {curr}{(balances.remaining_budget ?? 0).toFixed(2)}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Remaining of {curr}{balances.trip_budget?.toFixed(2)} budget
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Active Members
            </span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#8b5cf6' }}>
            {balances.member_balances?.length || 0}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Equal & Custom splitters active
          </p>
        </div>
      )}

      {/* 4. My Deposits / Contributed */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            My Total Paid In
          </span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Receipt size={18} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {curr}{myRecord?.total_paid?.toFixed(2) || '0.00'}
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Deposit: {curr}{myRecord?.deposit_paid?.toFixed(0) || 0} + Direct: {curr}{myRecord?.direct_expenses_paid?.toFixed(0) || 0}
        </p>
      </div>
    </div>
  );
}
