import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  ArrowRight, 
  QrCode, 
  CheckCircle, 
  FileDown, 
  Sparkles, 
  ShieldAlert, 
  Wallet,
  Users
} from 'lucide-react';
import UPIModal from './UPIModal';

export default function SettlementEngine({ 
  group, 
  balances, 
  currentUserId, 
  onSettlementCompleted 
}) {
  const [activeUpiTx, setActiveUpiTx] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!balances) return null;

  const simplified = balances.simplified_settlements || [];
  const memberBalances = balances.member_balances || [];
  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  const handleDownloadReport = async () => {
    setDownloadingPdf(true);
    try {
      await api.downloadPDF(group.id, group.name);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleMarkSettled = async (tx) => {
    try {
      await api.recordSettlement(group.id, {
        payer_id: tx.payer_id,
        payee_id: tx.payee_id,
        amount: tx.amount,
        payment_mode: 'UPI',
        note: `Settled via UPI`
      });
      setActiveUpiTx(null);
      if (onSettlementCompleted) onSettlementCompleted();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Settlement & Balance Sheet</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Automated debt minimization algorithm reduces multi-party transactions
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadReport}
            disabled={downloadingPdf}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.95rem' }}
          >
            <FileDown size={16} /> {downloadingPdf ? 'Exporting PDF...' : 'Download Statement (PDF)'}
          </button>
        </div>

        {/* 1. SIMPLIFIED TRANSACTION CARDS (Who pays whom) */}
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span>💳 Recommended Settle-Up Payouts</span>
          <span className="badge badge-category" style={{ fontSize: '0.68rem' }}>Min-Cashflow Graph Solver</span>
        </h4>

        {simplified.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)', marginBottom: '1.5rem' }}>
            <CheckCircle size={28} color="#34d399" style={{ marginBottom: '0.35rem' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399' }}>All Debts Fully Settled!</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Nobody in this group owes anything right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
            {simplified.map((tx, idx) => {
              const isMyDebt = tx.payer_id === currentUserId;
              const isMyCredit = tx.payee_id === currentUserId;

              return (
                <div
                  key={idx}
                  style={{
                    background: isMyDebt 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(15, 23, 42, 0.7))'
                      : (isMyCredit ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.7))' : 'rgba(15, 23, 42, 0.5)'),
                    border: `1px solid ${isMyDebt ? 'rgba(239, 68, 68, 0.3)' : (isMyCredit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.06)')}`,
                    borderRadius: '14px',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ color: isMyDebt ? '#f87171' : '#f8fafc', fontSize: '0.9rem' }}>
                        {isMyDebt ? 'You' : tx.payer_name}
                      </strong>
                      <ArrowRight size={15} color="#94a3b8" />
                      <strong style={{ color: isMyCredit ? '#34d399' : '#f8fafc', fontSize: '0.9rem' }}>
                        {isMyCredit ? 'You' : tx.payee_name}
                      </strong>
                    </div>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                      {curr}{tx.amount.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {tx.payee_upi_id ? `Payee UPI: ${tx.payee_upi_id}` : 'Pay via UPI/Cash'}
                    </span>
                    
                    <button
                      onClick={() => setActiveUpiTx(tx)}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                    >
                      <QrCode size={14} /> Pay / Settle QR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. COMPLETE MEMBER BREAKDOWN TABLE */}
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem' }}>
          📊 Detailed Member Statement & Net Balances
        </h4>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8' }}>Member</th>
                {group?.group_type === 'MESS' && (
                  <>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8' }}>Meals</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>Var. Cost</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>Fixed Cost</th>
                  </>
                )}
                <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>Total Due</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>Paid / Deposited</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {memberBalances.map((mb) => {
                const bal = mb.net_balance;
                const isRefund = bal >= 0;

                return (
                  <tr key={mb.user_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      <div style={{ color: '#f8fafc' }}>{mb.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{mb.role}</div>
                    </td>

                    {group?.group_type === 'MESS' && (
                      <>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#fbbf24', fontWeight: 700 }}>
                          {mb.total_meal_units?.toFixed(1) || 0}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#cbd5e1' }}>
                          {curr}{mb.variable_cost?.toFixed(2) || '0.00'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#cbd5e1' }}>
                          {curr}{mb.fixed_cost?.toFixed(2) || '0.00'}
                        </td>
                      </>
                    )}

                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                      {curr}{mb.total_due?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#34d399', fontWeight: 600 }}>
                      {curr}{mb.total_paid?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <span className={`badge ${isRefund ? 'badge-refund' : 'badge-due'}`}>
                        {isRefund ? `+${curr}${bal.toFixed(2)} (Refund)` : `-${curr}${Math.abs(bal).toFixed(2)} (Due)`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPI Payment Modal */}
      {activeUpiTx && (
        <UPIModal
          transaction={activeUpiTx}
          onClose={() => setActiveUpiTx(null)}
          onMarkSettled={() => handleMarkSettled(activeUpiTx)}
        />
      )}
    </>
  );
}
