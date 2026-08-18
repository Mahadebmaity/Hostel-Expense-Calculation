import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, 
  Users, 
  DollarSign, 
  Percent, 
  PieChart, 
  Sliders, 
  Utensils, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function AddExpenseModal({ group, onClose, onExpenseAdded }) {
  const { user: currentUser } = useAuth();
  
  // Group members list
  const [members, setMembers] = useState(group?.members || []);
  const [membersLoading, setMembersLoading] = useState(!group?.members || group.members.length === 0);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('GROCERY');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(currentUser?.id || '');
  const [isFixedCost, setIsFixedCost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Split Type: 'MEAL_BASED', 'EQUAL', 'EQUAL_CUSTOM', 'EXACT', 'PERCENTAGE', 'SHARES', 'ADJUSTMENT'
  const isMess = group?.group_type === 'MESS';
  const [splitType, setSplitType] = useState(isMess ? 'MEAL_BASED' : 'EQUAL');

  // Sub-states for various split methods
  const [selectedMembers, setSelectedMembers] = useState({}); // { [userId]: boolean }
  const [exactAmounts, setExactAmounts] = useState({});       // { [userId]: number/string }
  const [percentages, setPercentages] = useState({});         // { [userId]: number/string }
  const [shares, setShares] = useState({});                   // { [userId]: number/string }
  const [adjustments, setAdjustments] = useState({});         // { [userId]: number/string }

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  // Fetch full group details if members array is not populated
  useEffect(() => {
    async function fetchGroupMembers() {
      if (!group?.id) return;
      if (group.members && group.members.length > 0) {
        setMembers(group.members);
        setMembersLoading(false);
        return;
      }
      try {
        setMembersLoading(true);
        const data = await api.getGroup(group.id);
        if (data && data.members) {
          setMembers(data.members);
        }
      } catch (err) {
        console.error('Failed to load members for split', err);
      } finally {
        setMembersLoading(false);
      }
    }
    fetchGroupMembers();
  }, [group?.id]);

  // Set default paid_by once current user or members are ready
  useEffect(() => {
    if (!paidBy && currentUser?.id) {
      setPaidBy(currentUser.id);
    } else if (!paidBy && members.length > 0) {
      setPaidBy(members[0].user_id);
    }
  }, [currentUser, members, paidBy]);

  // Initialize split maps when members load
  useEffect(() => {
    if (members.length === 0) return;

    // Default all selected for EQUAL_CUSTOM
    const initialSelected = {};
    const initialExact = {};
    const initialPct = {};
    const initialShares = {};
    const initialAdj = {};

    const equalPct = (100 / members.length).toFixed(2);

    members.forEach((m) => {
      initialSelected[m.user_id] = true;
      initialExact[m.user_id] = '';
      initialPct[m.user_id] = equalPct;
      initialShares[m.user_id] = '1';
      initialAdj[m.user_id] = '0';
    });

    setSelectedMembers(prev => Object.keys(prev).length ? prev : initialSelected);
    setExactAmounts(prev => Object.keys(prev).length ? prev : initialExact);
    setPercentages(prev => Object.keys(prev).length ? prev : initialPct);
    setShares(prev => Object.keys(prev).length ? prev : initialShares);
    setAdjustments(prev => Object.keys(prev).length ? prev : initialAdj);
  }, [members]);

  const numTotalAmount = parseFloat(amount) || 0;

  // Real-time calculations & validations for each split mode
  const splitAnalysis = useMemo(() => {
    const total = numTotalAmount;
    if (total <= 0 || members.length === 0) {
      return { isValid: false, message: 'Enter a valid expense amount', calculatedSplits: [] };
    }

    if (splitType === 'MEAL_BASED') {
      return {
        isValid: true,
        summary: `Pooled into monthly grocery and split dynamically by actual meals consumed.`,
        calculatedSplits: []
      };
    }

    if (splitType === 'EQUAL') {
      const share = Number((total / members.length).toFixed(2));
      return {
        isValid: true,
        summary: `${curr}${share.toFixed(2)} each across all ${members.length} members.`,
        calculatedSplits: members.map(m => ({ user_id: m.user_id, share_amount: share }))
      };
    }

    if (splitType === 'EQUAL_CUSTOM') {
      const activeIds = Object.keys(selectedMembers).filter(id => selectedMembers[id]);
      if (activeIds.length === 0) {
        return { isValid: false, message: 'Please select at least one member to split with.', calculatedSplits: [] };
      }
      const share = Number((total / activeIds.length).toFixed(2));
      return {
        isValid: true,
        summary: `${curr}${share.toFixed(2)} each for ${activeIds.length} selected members.`,
        calculatedSplits: activeIds.map(uId => ({ user_id: uId, share_amount: share }))
      };
    }

    if (splitType === 'EXACT') {
      let allocated = 0;
      const splits = [];
      members.forEach(m => {
        const val = parseFloat(exactAmounts[m.user_id]) || 0;
        allocated += val;
        splits.push({ user_id: m.user_id, share_amount: Number(val.toFixed(2)) });
      });

      const remaining = Number((total - allocated).toFixed(2));
      const isMatched = Math.abs(remaining) <= 0.05;

      return {
        isValid: isMatched,
        allocated: Number(allocated.toFixed(2)),
        remaining,
        message: isMatched
          ? `Exact allocation matches total (${curr}${total.toFixed(2)})`
          : remaining > 0
          ? `${curr}${remaining.toFixed(2)} remaining to allocate`
          : `Allocated exceeds total by ${curr}${Math.abs(remaining).toFixed(2)}`,
        calculatedSplits: isMatched ? splits : []
      };
    }

    if (splitType === 'PERCENTAGE') {
      let totalPct = 0;
      const splits = [];
      members.forEach(m => {
        const pct = parseFloat(percentages[m.user_id]) || 0;
        totalPct += pct;
        const share = Number(((total * pct) / 100).toFixed(2));
        splits.push({ user_id: m.user_id, share_amount: share, percentage: pct });
      });

      const remainingPct = Number((100 - totalPct).toFixed(1));
      const isMatched = Math.abs(remainingPct) <= 0.5;

      return {
        isValid: isMatched,
        totalPct: Number(totalPct.toFixed(1)),
        remainingPct,
        message: isMatched
          ? `Total percentages = 100%`
          : remainingPct > 0
          ? `${remainingPct}% remaining to reach 100%`
          : `Total percentage exceeds 100% by ${Math.abs(remainingPct)}%`,
        calculatedSplits: isMatched ? splits : []
      };
    }

    if (splitType === 'SHARES') {
      let totalShares = 0;
      members.forEach(m => {
        totalShares += parseFloat(shares[m.user_id]) || 0;
      });

      if (totalShares <= 0) {
        return { isValid: false, message: 'Total shares must be greater than 0', calculatedSplits: [] };
      }

      const splits = members.map(m => {
        const s = parseFloat(shares[m.user_id]) || 0;
        const share = Number(((total * s) / totalShares).toFixed(2));
        return { user_id: m.user_id, share_amount: share };
      });

      return {
        isValid: true,
        totalShares,
        summary: `Divided proportionally across ${totalShares} total shares.`,
        calculatedSplits: splits
      };
    }

    if (splitType === 'ADJUSTMENT') {
      let totalAdjustments = 0;
      members.forEach(m => {
        totalAdjustments += parseFloat(adjustments[m.user_id]) || 0;
      });

      const basePool = total - totalAdjustments;
      if (basePool < 0) {
        return { isValid: false, message: 'Adjustments cannot exceed the total bill amount', calculatedSplits: [] };
      }

      const basePerPerson = basePool / members.length;
      const splits = members.map(m => {
        const adj = parseFloat(adjustments[m.user_id]) || 0;
        return { user_id: m.user_id, share_amount: Number((basePerPerson + adj).toFixed(2)) };
      });

      return {
        isValid: true,
        summary: `Base ${curr}${basePerPerson.toFixed(2)}/person + individual adjustments.`,
        calculatedSplits: splits
      };
    }

    return { isValid: true, calculatedSplits: [] };
  }, [numTotalAmount, members, splitType, selectedMembers, exactAmounts, percentages, shares, adjustments, curr]);

  // Quick fill remaining exact amount for last user
  const handleAutoFillRemainingExact = (targetUserId) => {
    if (numTotalAmount <= 0) return;
    let otherSum = 0;
    members.forEach(m => {
      if (m.user_id !== targetUserId) {
        otherSum += parseFloat(exactAmounts[m.user_id]) || 0;
      }
    });
    const remaining = Math.max(0, numTotalAmount - otherSum);
    setExactAmounts(prev => ({
      ...prev,
      [targetUserId]: remaining.toFixed(2)
    }));
  };

  // Toggle all checkboxes
  const handleToggleSelectAll = (select) => {
    const updated = {};
    members.forEach(m => {
      updated[m.user_id] = select;
    });
    setSelectedMembers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!numTotalAmount || numTotalAmount <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }

    if (!splitAnalysis.isValid) {
      setError(splitAnalysis.message || 'Please check split allocations before submitting');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        amount: numTotalAmount,
        category,
        split_type: isFixedCost ? 'EQUAL' : splitType,
        is_fixed_cost: isFixedCost,
        expense_date: expenseDate,
        paid_by: paidBy || currentUser?.id,
        splits: splitAnalysis.calculatedSplits || []
      };

      await api.createExpense(group.id, payload);

      if (onExpenseAdded) onExpenseAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Receipt size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Add Expense / Bazaar Record</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Record a group purchase and choose how to divide the cost
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.3rem', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Expense Title / Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Weekly Veggies, Chicken Bazaar, Gas Refill, Cook Salary, Weekend Dinner"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Amount, Date, and Payer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Amount ({curr})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ fontSize: '1.05rem', fontWeight: 700 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Paid By & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserCheck size={14} color="#60a5fa" />
                <span>Paid By (Payer)</span>
              </label>
              <select
                className="form-select"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || m.user?.email} {m.user_id === currentUser?.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="GROCERY">🛒 Grocery / Bazaar (Rice, Veggies, Meat, Oil)</option>
                <option value="GAS">🔥 Gas Cylinder</option>
                <option value="ELECTRICITY">⚡ Electricity / Utilities</option>
                <option value="RENT">🏠 Room / Flat Rent</option>
                <option value="MAID">🧹 Cook / Maid Salary</option>
                <option value="SNACKS">☕ Snacks / Tea / Breakfast Items</option>
                <option value="OUTING">🎉 Group Outing / Party</option>
                <option value="OTHER">📄 Other Miscellaneous</option>
              </select>
            </div>
          </div>

          {/* Fixed Shared Bill Toggle (For Mess) */}
          {isMess && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1.25rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isFixedCost}
                  onChange={(e) => setIsFixedCost(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                />
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                    Fixed Shared Bill (Cook, Gas, Electricity, Rent)
                  </span>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {isFixedCost 
                      ? '✓ Divided equally among all members regardless of meals taken.' 
                      : '✓ Variable grocery/bazaar split dynamically according to the split method chosen below.'}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* SPLIT METHOD SELECTOR */}
          {!isFixedCost && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Choose Splitting Method</span>
                <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600 }}>
                  {members.length} Roommates / Members
                </span>
              </label>

              {/* Grid of Split Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                {isMess && (
                  <button
                    type="button"
                    onClick={() => setSplitType('MEAL_BASED')}
                    style={{
                      padding: '0.6rem 0.5rem',
                      borderRadius: '10px',
                      border: `1px solid ${splitType === 'MEAL_BASED' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                      background: splitType === 'MEAL_BASED' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: splitType === 'MEAL_BASED' ? '#93c5fd' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Utensils size={18} color={splitType === 'MEAL_BASED' ? '#60a5fa' : '#64748b'} />
                    <span>By Meal Rate</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSplitType('EQUAL')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: `1px solid ${splitType === 'EQUAL' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    background: splitType === 'EQUAL' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    color: splitType === 'EQUAL' ? '#93c5fd' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Users size={18} color={splitType === 'EQUAL' ? '#60a5fa' : '#64748b'} />
                  <span>Split Equally (All)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType('EQUAL_CUSTOM')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: `1px solid ${splitType === 'EQUAL_CUSTOM' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    background: splitType === 'EQUAL_CUSTOM' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    color: splitType === 'EQUAL_CUSTOM' ? '#93c5fd' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <CheckSquare size={18} color={splitType === 'EQUAL_CUSTOM' ? '#60a5fa' : '#64748b'} />
                  <span>Selected Subset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType('EXACT')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: `1px solid ${splitType === 'EXACT' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    background: splitType === 'EXACT' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    color: splitType === 'EXACT' ? '#93c5fd' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <DollarSign size={18} color={splitType === 'EXACT' ? '#60a5fa' : '#64748b'} />
                  <span>Exact Amounts ({curr})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType('PERCENTAGE')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: `1px solid ${splitType === 'PERCENTAGE' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    background: splitType === 'PERCENTAGE' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    color: splitType === 'PERCENTAGE' ? '#93c5fd' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Percent size={18} color={splitType === 'PERCENTAGE' ? '#60a5fa' : '#64748b'} />
                  <span>Percentages (%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType('SHARES')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: `1px solid ${splitType === 'SHARES' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    background: splitType === 'SHARES' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    color: splitType === 'SHARES' ? '#93c5fd' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Sliders size={18} color={splitType === 'SHARES' ? '#60a5fa' : '#64748b'} />
                  <span>Shares / Ratios</span>
                </button>
              </div>

              {/* DYNAMIC SPLIT CONFIGURATION PANELS */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '1rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {/* 1. Meal Based Description */}
                {splitType === 'MEAL_BASED' && (
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, marginBottom: '0.35rem' }}>
                      <CheckCircle2 size={16} /> Dynamic Monthly Meal-Rate Distribution
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.76rem' }}>
                      This expense will be pooled into the monthly variable bazaar fund. At the end of the billing cycle, each member will be debited proportionally based on their exact breakfast, lunch, and dinner attendance.
                    </p>
                  </div>
                )}

                {/* 2. Equal Split Summary */}
                {splitType === 'EQUAL' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Equal split among all members:</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#60a5fa' }}>
                        {numTotalAmount > 0 ? `${curr}${(numTotalAmount / (members.length || 1)).toFixed(2)} / member` : `—`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {members.map(m => (
                        <span key={m.user_id} className="badge" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.72rem' }}>
                          👤 {m.user?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Selected Subset (EQUAL_CUSTOM) */}
                {splitType === 'EQUAL_CUSTOM' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Select who participated in this expense:</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll(true)}
                          style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll(false)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const isChecked = !!selectedMembers[m.user_id];
                        const activeCount = Object.values(selectedMembers).filter(Boolean).length;
                        const perHead = activeCount > 0 && isChecked ? (numTotalAmount / activeCount).toFixed(2) : '0.00';

                        return (
                          <div
                            key={m.user_id}
                            onClick={() => setSelectedMembers(prev => ({ ...prev, [m.user_id]: !prev[m.user_id] }))}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              background: isChecked ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                              border: `1px solid ${isChecked ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by div onClick
                                style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.82rem', fontWeight: isChecked ? 600 : 400, color: isChecked ? '#f8fafc' : '#94a3b8' }}>
                                {m.user?.name || m.user?.email}
                              </span>
                            </div>
                            {isChecked && numTotalAmount > 0 && (
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#60a5fa' }}>
                                {curr}{perHead}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Exact Amounts */}
                {splitType === 'EXACT' && (
                  <div>
                    {/* Status Pill */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      background: splitAnalysis.isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: `1px solid ${splitAnalysis.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      marginBottom: '0.75rem',
                      fontSize: '0.76rem'
                    }}>
                      <span style={{ color: splitAnalysis.isValid ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                        {splitAnalysis.message}
                      </span>
                      <span style={{ fontWeight: 800, color: '#f8fafc' }}>
                        Allocated: {curr}{splitAnalysis.allocated || 0} / {curr}{numTotalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '190px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const val = exactAmounts[m.user_id] ?? '';
                        return (
                          <div
                            key={m.user_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.75rem',
                              padding: '0.4rem 0.6rem',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '8px'
                            }}
                          >
                            <span style={{ fontSize: '0.82rem', color: '#cbd5e1', flex: 1 }}>
                              {m.user?.name || m.user?.email}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{curr}</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={val}
                                onChange={(e) => setExactAmounts(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                                className="form-input"
                                style={{ width: '90px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', textAlign: 'right' }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAutoFillRemainingExact(m.user_id)}
                                title="Auto-fill remaining balance into this user"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  color: '#60a5fa',
                                  padding: '0.25rem 0.45rem',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Fill Remainder
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Percentages */}
                {splitType === 'PERCENTAGE' && (
                  <div>
                    {/* Status Pill */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      background: splitAnalysis.isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: `1px solid ${splitAnalysis.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      marginBottom: '0.75rem',
                      fontSize: '0.76rem'
                    }}>
                      <span style={{ color: splitAnalysis.isValid ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                        {splitAnalysis.message}
                      </span>
                      <span style={{ fontWeight: 800, color: '#f8fafc' }}>
                        Total: {splitAnalysis.totalPct || 0}% / 100%
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '190px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const pct = parseFloat(percentages[m.user_id]) || 0;
                        const equivalentAmt = numTotalAmount > 0 ? ((numTotalAmount * pct) / 100).toFixed(2) : '0.00';

                        return (
                          <div
                            key={m.user_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.75rem',
                              padding: '0.4rem 0.6rem',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '8px'
                            }}
                          >
                            <span style={{ fontSize: '0.82rem', color: '#cbd5e1', flex: 1 }}>
                              {m.user?.name || m.user?.email}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, minWidth: '70px', textAlign: 'right' }}>
                                = {curr}{equivalentAmt}
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={percentages[m.user_id] ?? ''}
                                onChange={(e) => setPercentages(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                                className="form-input"
                                style={{ width: '70px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', textAlign: 'right' }}
                              />
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Shares / Ratios */}
                {splitType === 'SHARES' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Specify units/shares per person (e.g. 2 for guest, 1 for single):
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa' }}>
                        Total Shares: {splitAnalysis.totalShares || 0}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '190px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const s = parseFloat(shares[m.user_id]) || 0;
                        const totalS = splitAnalysis.totalShares || 1;
                        const equivalentAmt = numTotalAmount > 0 && totalS > 0 ? ((numTotalAmount * s) / totalS).toFixed(2) : '0.00';

                        return (
                          <div
                            key={m.user_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.75rem',
                              padding: '0.4rem 0.6rem',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '8px'
                            }}
                          >
                            <span style={{ fontSize: '0.82rem', color: '#cbd5e1', flex: 1 }}>
                              {m.user?.name || m.user?.email}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, minWidth: '70px', textAlign: 'right' }}>
                                = {curr}{equivalentAmt}
                              </span>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                placeholder="1"
                                value={shares[m.user_id] ?? '1'}
                                onChange={(e) => setShares(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                                className="form-input"
                                style={{ width: '65px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>share(s)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Summary Bar */}
          {numTotalAmount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              marginTop: '1rem',
              fontSize: '0.82rem'
            }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Total Expense: </span>
                <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{curr}{numTotalAmount.toFixed(2)}</strong>
              </div>
              <div style={{ color: '#93c5fd', fontWeight: 600 }}>
                {splitAnalysis.summary || (splitAnalysis.isValid ? '✓ Split configured' : '⚠️ Balance required')}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || (numTotalAmount > 0 && !splitAnalysis.isValid)} 
              className="btn btn-primary"
            >
              {loading ? 'Adding Expense...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
