import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ArrowRight, 
  QrCode, 
  CheckCircle, 
  FileDown, 
  Sparkles, 
  ShieldAlert, 
  Wallet,
  Users,
  Archive,
  Save,
  BookOpen,
  Calendar,
  Flame,
  Utensils,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  Smartphone,
  AlertTriangle
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

  // Scoreboard Archive State
  const [savedScoreboards, setSavedScoreboards] = useState([]);
  const [showArchiveDrawer, setShowArchiveDrawer] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [archiveTitle, setArchiveTitle] = useState(() => `${new Date().toLocaleString('default', { month: 'long' })} Score Board`);
  const [savingScoreboard, setSavingScoreboard] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null); // When viewing an archived historical snapshot

  const isMess = group?.group_type === 'MESS';
  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  // Load saved scoreboards for this group
  const loadSavedArchives = async () => {
    if (!group?.id) return;
    try {
      const list = await api.getScoreboards(group.id);
      setSavedScoreboards(list || []);
    } catch (err) {
      console.error('Failed to load archives', err);
    }
  };

  useEffect(() => {
    loadSavedArchives();
  }, [group?.id]);

  // Display active data (either historical archive snapshot or live balances)
  const displayData = selectedArchive ? {
    currency: group.currency,
    group_type: group.group_type,
    total_expenses: selectedArchive.total_establishment + selectedArchive.total_meal_expenses,
    total_establishment: selectedArchive.total_establishment,
    establishment_per_head: selectedArchive.establishment_per_head,
    total_meal_expenses: selectedArchive.total_meal_expenses,
    guest_deduction_total: selectedArchive.guest_deduction_total,
    net_meal_pool: selectedArchive.net_meal_pool,
    total_meals: selectedArchive.total_meals,
    meal_rate: selectedArchive.meal_rate,
    total_collected: selectedArchive.total_deposit_collected,
    total_due: selectedArchive.total_due,
    total_refund: selectedArchive.total_refund,
    establishment_breakdown: selectedArchive.breakdown?.establishment_breakdown || [],
    meal_pool_breakdown: selectedArchive.breakdown?.meal_pool_breakdown || [],
    member_balances: selectedArchive.member_records || [],
    simplified_settlements: balances?.simplified_settlements || []
  } : balances;

  if (!displayData) return null;

  const simplified = displayData.simplified_settlements || [];
  const memberBalances = displayData.member_balances || [];

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
        payer_member_id: tx.payer_id,
        payee_member_id: tx.payee_id,
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

  const handleSaveScoreboard = async (e) => {
    e.preventDefault();
    if (!archiveTitle.trim()) return;
    setSavingScoreboard(true);
    try {
      await api.saveScoreboard(group.id, {
        title: archiveTitle.trim(),
        month_label: archiveTitle.trim(),
        summary_data: balances
      });
      setShowSaveModal(false);
      setArchiveTitle(`${new Date().toLocaleString('default', { month: 'long' })} Score Board`);
      await loadSavedArchives();
      alert('Monthly Score Board archived successfully in Khatabook!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingScoreboard(false);
    }
  };

  const handleDeleteArchive = async (sbId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved scoreboard snapshot?')) return;
    try {
      await api.deleteScoreboard(group.id, sbId);
      if (selectedArchive?.id === sbId) setSelectedArchive(null);
      await loadSavedArchives();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      {/* Historical Archive Banner if active */}
      {selectedArchive && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.9))',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Archive size={18} color="#fbbf24" />
            <div>
              <strong style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                Viewing Archived Score Board: {selectedArchive.title}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                (Saved on {new Date(selectedArchive.created_at).toLocaleDateString()})
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedArchive(null)}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
          >
            ← Return to Live Calculations
          </button>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Main Section Header */}
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
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {isMess ? 'Mess Khatabook & Monthly Score Board' : 'Settlement & Settle-Up Ledger'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {isMess 
                  ? 'Establishment fixed charges • Dynamic meal pool rate • Guest meal deductions' 
                  : 'Automated debt minimization & UPI QR settlement'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {isMess && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.95rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              >
                <Save size={16} /> Save & Freeze Month
              </button>
            )}

            {savedScoreboards.length > 0 && (
              <button
                onClick={() => setShowArchiveDrawer(!showArchiveDrawer)}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.95rem' }}
              >
                <Archive size={16} /> Saved Khatas ({savedScoreboards.length})
              </button>
            )}

            <button
              onClick={handleDownloadReport}
              disabled={downloadingPdf}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.5rem 0.95rem' }}
            >
              <FileDown size={16} /> {downloadingPdf ? 'Exporting...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* SAVED SCOREBOARDS DRAWER */}
        {showArchiveDrawer && savedScoreboards.length > 0 && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                📁 Saved Monthly Score Boards (Khatabook History)
              </span>
              <button onClick={() => setShowArchiveDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                Close ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
              {savedScoreboards.map(sb => {
                const isSelected = selectedArchive?.id === sb.id;
                return (
                  <div
                    key={sb.id}
                    onClick={() => setSelectedArchive(sb)}
                    style={{
                      background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-surface)',
                      border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.5)' : 'var(--border-glass)'}`,
                      borderRadius: '10px',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {sb.title}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        Rate: {curr}{sb.meal_rate.toFixed(2)}/meal • {sb.total_meals} meals
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="badge badge-category" style={{ fontSize: '0.65rem' }}>
                        {new Date(sb.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDeleteArchive(sb.id, e)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                        title="Delete snapshot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manager UPI Requirement Alert */}
        {(() => {
          const managerMember = group?.members?.find(m => m.role === 'MANAGER' || m.role === 'ADMIN') || group?.members?.[0];
          const managerHasUpi = !!(managerMember?.upi_id || managerMember?.user?.upi_id);
          if (managerHasUpi || !managerMember) return null;

          return (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(15, 23, 42, 0.7))',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '12px',
              padding: '0.9rem 1.15rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  padding: '0.5rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Smartphone size={18} color="#fbbf24" />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fef3c7' }}>
                    Manager UPI ID Missing ({managerMember.name || managerMember.user?.name || 'Mess Manager'})
                  </h5>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    The mess manager must add their UPI ID so candidates can settle dues and pay mess funds instantly via QR.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveUpiTx({
                    payer_id: currentUserId,
                    payer_name: 'Member',
                    payee_id: managerMember.id || managerMember.user_id,
                    payee_member_id: managerMember.id,
                    payee_name: managerMember.name || managerMember.user?.name || 'Mess Manager',
                    payee_upi_id: '',
                    amount: 1.0,
                    currency: group?.currency || 'INR'
                  });
                }}
                className="btn"
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ⚡ Add Manager UPI ID
              </button>
            </div>
          );
        })()}

        {/* 1. MESS FINANCIAL CALCULATION TILES (Establishment + Meal Pool) */}
        {isMess && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            {/* Card A: Establishment Sheet */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              borderRadius: '14px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Flame size={14} color="#60a5fa" /> Establishment Charges (Fixed)
                  </span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Divided equally per candidate</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {curr}{displayData.total_establishment?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              {/* Items Breakdown list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem', fontSize: '0.78rem' }}>
                {displayData.establishment_breakdown?.slice(0, 6).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>• {item.title}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{curr}{item.amount.toFixed(0)}/-</strong>
                  </div>
                ))}
              </div>

              {/* Formula Divider */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.82rem'
              }}>
                <span style={{ color: 'var(--accent-primary)' }}>
                  {curr}{displayData.total_establishment?.toFixed(0)} ÷ {memberBalances.length} Candidates:
                </span>
                <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>
                  {curr}{displayData.establishment_per_head?.toFixed(2)} / candidate
                </strong>
              </div>
            </div>

            {/* Card B: Variable Mealcharge & Meal Rate Pool */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              borderRadius: '14px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Utensils size={14} color="#fbbf24" /> Mealcharge & Marketing Pool
                  </span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Marketing + Rice + Potato + Grocery - Guest</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>
                    {curr}{displayData.total_meal_expenses?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              {/* Meal pool Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem', fontSize: '0.78rem' }}>
                {displayData.meal_pool_breakdown?.slice(0, 5).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>• {item.title}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{curr}{item.amount.toFixed(0)}/-</strong>
                  </div>
                ))}
                {displayData.guest_deduction_total > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontWeight: 700 }}>
                    <span>- Guest Meals Revenue:</span>
                    <span>-{curr}{displayData.guest_deduction_total.toFixed(0)}/-</span>
                  </div>
                )}
              </div>

              {/* Net Pool & Meal Rate calculation */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.82rem'
              }}>
                <span style={{ color: '#fcd34d' }}>
                  Net Pool ({curr}{displayData.net_meal_pool?.toFixed(0)}) ÷ {displayData.total_meals?.toFixed(0)} Meals:
                </span>
                <strong style={{ color: '#34d399', fontSize: '1rem' }}>
                  {curr}{displayData.meal_rate?.toFixed(2)} / meal
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* 2. TRADITIONAL SCORE BOARD TABLE (Matching Handwritten Notebook) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span>📋 {isMess ? 'Candidate Monthly Score Board (Khatabook)' : 'Member Balances & Breakdown'}</span>
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Total Collected: <strong style={{ color: '#34d399' }}>{curr}{displayData.total_collected?.toFixed(0)}</strong> • Due: <strong style={{ color: '#f87171' }}>{curr}{displayData.total_due?.toFixed(0)}</strong>
          </span>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', width: '40px' }}>Sl</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Candidate</th>
                {isMess ? (
                  <>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      Formula: (Meals × Rate) + Est
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Guest Meals</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Total Bill</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Paid (Deposit + Bazar)</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Total Share Due</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Total Paid</th>
                  </>
                )}
                <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Net Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {memberBalances.map((mb, idx) => {
                const bal = mb.net_balance;
                const isRefund = bal >= 0;
                const isMyRecord = (mb.user_id && mb.user_id === currentUserId) || (mb.member_id && mb.member_id === currentUserId);

                return (
                  <tr 
                    key={mb.member_id || mb.user_id || idx} 
                    style={{ 
                      borderBottom: '1px solid var(--border-glass)',
                      background: isMyRecord ? 'rgba(59, 130, 246, 0.08)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      <div style={{ color: isMyRecord ? 'var(--accent-primary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{mb.name}</span>
                        {isMyRecord && <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)' }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {mb.role} {mb.is_virtual ? '• Virtual' : ''} {mb.marketing_amount > 0 ? `• Mkt: ${curr}${mb.marketing_amount.toFixed(0)} (${mb.marketing_days || 0}d)` : ''}
                      </div>
                    </td>

                    {isMess ? (
                      <>
                        {/* Formula column */}
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          ({displayData.meal_rate?.toFixed(2)} × {mb.total_meal_units || 0}) + {displayData.establishment_per_head?.toFixed(2)} = <strong>{mb.total_due?.toFixed(0)}</strong>
                        </td>

                        {/* Guest Meals */}
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: mb.guest_cost > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                          {mb.guest_cost > 0 ? `+${curr}${mb.guest_cost?.toFixed(0)}` : '—'}
                        </td>

                        {/* Total Bill */}
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {curr}{mb.total_due?.toFixed(2) || '0.00'}
                        </td>

                        {/* Total Paid (Deposit + Marketing) */}
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                          <div>{curr}{mb.total_paid?.toFixed(2) || '0.00'}</div>
                          {mb.marketing_amount > 0 && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              Dep: {curr}{mb.initial_deposit || 0} + Mkt: {curr}{mb.marketing_amount}
                            </div>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {curr}{mb.total_due?.toFixed(2) || '0.00'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                          {curr}{mb.total_paid?.toFixed(2) || '0.00'}
                        </td>
                      </>
                    )}

                    {/* Net Status Badge */}
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <span className={`badge ${isRefund ? 'badge-refund' : 'badge-due'}`} style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                        {isRefund ? `+${curr}${bal.toFixed(0)} (Refund 🟢)` : `-${curr}${Math.abs(bal).toFixed(0)} (Due 🔴)`}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {!isRefund && (
                        <button
                          onClick={() => {
                            const payerId = mb.member_id || mb.user_id;
                            // Find a creditor with positive balance or group manager/admin
                            const creditor = memberBalances.find(m => (m.member_id !== payerId && m.user_id !== payerId && m.net_balance > 0.01));
                            const manager = group.members?.find(m => m.role === 'MANAGER' || m.role === 'ADMIN') || group.members?.[0];
                            const targetPayee = creditor || manager;
                            const payeeUpi = targetPayee?.upi_id || targetPayee?.user?.upi_id || '';

                            setActiveUpiTx({
                              payer_id: payerId,
                              payer_name: mb.name,
                              payee_id: targetPayee?.id || targetPayee?.user_id || 'manager',
                              payee_member_id: targetPayee?.id,
                              payee_name: targetPayee?.name || targetPayee?.member_name || group.name,
                              payee_upi_id: payeeUpi,
                              amount: Math.abs(bal),
                              currency: group.currency
                            });
                          }}
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}
                          title="Settle up via UPI"
                        >
                          <QrCode size={12} /> Settle
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3. SIMPLIFIED TRANSACTION CARDS (Peer-to-Peer Minimized Settlements) */}
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span>💳 Minimum Cashflow Settlement Matrix</span>
          <span className="badge badge-category" style={{ fontSize: '0.68rem' }}>Optimal Peer Transfers</span>
        </h4>

        {simplified.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <CheckCircle size={28} color="#34d399" style={{ marginBottom: '0.35rem' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399' }}>All Mess & Group Accounts Settled!</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No pending transfers required.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '0.85rem' }}>
            {simplified.map((tx, idx) => {
              const isMyDebt = tx.payer_id === currentUserId;
              const isMyCredit = tx.payee_id === currentUserId;

              return (
                <div
                  key={idx}
                  style={{
                    background: isMyDebt 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), var(--bg-surface))'
                      : (isMyCredit ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), var(--bg-surface))' : 'var(--bg-surface)'),
                    border: `1px solid ${isMyDebt ? 'rgba(239, 68, 68, 0.3)' : (isMyCredit ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-glass)')}`,
                    borderRadius: '14px',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ color: isMyDebt ? '#f87171' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {isMyDebt ? 'You' : tx.payer_name}
                      </strong>
                      <ArrowRight size={15} color="var(--text-muted)" />
                      <strong style={{ color: isMyCredit ? '#10b981' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {isMyCredit ? 'You' : tx.payee_name}
                      </strong>
                    </div>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {curr}{tx.amount.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {tx.payee_upi_id ? `Payee: ${tx.payee_upi_id}` : 'Pay via UPI'}
                    </span>
                    
                    <button
                      onClick={() => setActiveUpiTx(tx)}
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      <QrCode size={13} /> Settle QR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save / Freeze Monthly Scoreboard Modal */}
      {showSaveModal && (
        <div className="modal-backdrop" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>💾 Save Monthly Score Board</h3>
              <button onClick={() => setShowSaveModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleSaveScoreboard}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
                This will take a permanent snapshot of the current month's score board, establishment breakdown, meal rate ({curr}{displayData.meal_rate?.toFixed(2)}/meal), and candidate dues into the group's Khatabook history.
              </p>

              <div className="form-group">
                <label className="form-label">Score Board Title / Month Label</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. May Score Board, June 2026 Calculations"
                  value={archiveTitle}
                  onChange={(e) => setArchiveTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowSaveModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingScoreboard} className="btn btn-primary">
                  {savingScoreboard ? 'Archiving...' : 'Freeze & Save to Khatabook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {activeUpiTx && (
        <UPIModal
          transaction={activeUpiTx}
          group={group}
          onClose={() => setActiveUpiTx(null)}
          onMarkSettled={() => handleMarkSettled(activeUpiTx)}
          onMemberUpdated={() => {
            if (onSettlementCompleted) onSettlementCompleted();
          }}
        />
      )}
    </>
  );
}
