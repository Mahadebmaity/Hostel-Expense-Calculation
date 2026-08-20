import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, 
  Users, 
  DollarSign, 
  Percent, 
  Sliders, 
  Utensils, 
  CheckSquare, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck,
  Tag,
  Building,
  Flame,
  Plane,
  Sparkles
} from 'lucide-react';

export default function AddExpenseModal({ group, onClose, onExpenseAdded }) {
  const { user: currentUser } = useAuth();
  
  // Group members list
  const [members, setMembers] = useState(group?.members || []);
  const [membersLoading, setMembersLoading] = useState(!group?.members || group.members.length === 0);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(group?.group_type === 'MESS' ? 'BAZAR' : 'GROCERY');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [isFixedCost, setIsFixedCost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Split Type: 'MEAL_BASED', 'EQUAL', 'EQUAL_CUSTOM', 'EXACT', 'PERCENTAGE', 'SHARES'
  const isMess = group?.group_type === 'MESS';
  const isFlat = group?.group_type === 'FLATMATES';
  const isTrip = group?.group_type === 'TRIP';

  const [splitType, setSplitType] = useState(isMess ? 'MEAL_BASED' : 'EQUAL');

  // Sub-states for various split methods
  const [selectedMembers, setSelectedMembers] = useState({}); 
  const [exactAmounts, setExactAmounts] = useState({});       
  const [percentages, setPercentages] = useState({});         
  const [shares, setShares] = useState({});                   

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

  // Set default paid_by once members are loaded
  useEffect(() => {
    if (!paidByMemberId && members.length > 0) {
      const match = members.find(m => m.user_id === currentUser?.id);
      setPaidByMemberId(match ? match.id : members[0].id);
    }
  }, [currentUser, members, paidByMemberId]);

  // Initialize split maps when members load
  useEffect(() => {
    if (members.length === 0) return;

    const initialSelected = {};
    const initialExact = {};
    const initialPct = {};
    const initialShares = {};

    const equalPct = (100 / members.length).toFixed(2);

    members.forEach((m) => {
      const key = m.id || m.user_id;
      initialSelected[key] = true;
      initialExact[key] = '';
      initialPct[key] = equalPct;
      initialShares[key] = '1';
    });

    setSelectedMembers(prev => Object.keys(prev).length ? prev : initialSelected);
    setExactAmounts(prev => Object.keys(prev).length ? prev : initialExact);
    setPercentages(prev => Object.keys(prev).length ? prev : initialPct);
    setShares(prev => Object.keys(prev).length ? prev : initialShares);
  }, [members]);

  // Auto-switch fixed cost when selecting Establishment categories
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    const establishmentCats = ['MASI', 'COOK', 'GAS', 'EGG', 'MEAT', 'PAPER', 'ELECTRICITY', 'RENT', 'ESTABLISHMENT_OTHER', 'WIFI'];
    if (isMess && establishmentCats.includes(newCat)) {
      setIsFixedCost(true);
      setSplitType('EQUAL');
    } else if (isMess) {
      setIsFixedCost(false);
      setSplitType('MEAL_BASED');
    }
  };

  const numTotalAmount = parseFloat(amount) || 0;

  // Real-time calculations & validations for each split mode
  const splitAnalysis = useMemo(() => {
    const total = numTotalAmount;
    if (total <= 0 || members.length === 0) {
      return { isValid: false, message: 'Enter a valid expense amount', calculatedSplits: [] };
    }

    if (splitType === 'MEAL_BASED' && isMess && !isFixedCost) {
      return {
        isValid: true,
        summary: `Added to variable meal pool (Net Pool ÷ Total Meals = Meal Rate).`,
        calculatedSplits: []
      };
    }

    if (splitType === 'EQUAL' || isFixedCost) {
      const share = Number((total / members.length).toFixed(2));
      return {
        isValid: true,
        summary: `${curr}${share.toFixed(2)} each divided equally among ${members.length} members.`,
        calculatedSplits: members.map(m => ({ member_id: m.id, user_id: m.user_id, share_amount: share }))
      };
    }

    if (splitType === 'EQUAL_CUSTOM') {
      const activeKeys = Object.keys(selectedMembers).filter(k => selectedMembers[k]);
      if (activeKeys.length === 0) {
        return { isValid: false, message: 'Select at least one member to share this expense.', calculatedSplits: [] };
      }
      const share = Number((total / activeKeys.length).toFixed(2));
      return {
        isValid: true,
        summary: `${curr}${share.toFixed(2)} each for ${activeKeys.length} selected members.`,
        calculatedSplits: activeKeys.map(k => {
          const mObj = members.find(m => (m.id === k || m.user_id === k));
          return { member_id: mObj?.id || k, user_id: mObj?.user_id, share_amount: share };
        })
      };
    }

    if (splitType === 'EXACT') {
      let allocated = 0;
      const splits = [];
      members.forEach(m => {
        const key = m.id || m.user_id;
        const val = parseFloat(exactAmounts[key]) || 0;
        allocated += val;
        splits.push({ member_id: m.id, user_id: m.user_id, share_amount: Number(val.toFixed(2)) });
      });

      const remaining = Number((total - allocated).toFixed(2));
      const isMatched = Math.abs(remaining) <= 0.05;

      return {
        isValid: isMatched,
        allocated: Number(allocated.toFixed(2)),
        remaining,
        message: isMatched
          ? `Exact allocations match total bill (${curr}${total.toFixed(2)})`
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
        const key = m.id || m.user_id;
        const pct = parseFloat(percentages[key]) || 0;
        totalPct += pct;
        const share = Number(((total * pct) / 100).toFixed(2));
        splits.push({ member_id: m.id, user_id: m.user_id, share_amount: share, percentage: pct });
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
        const key = m.id || m.user_id;
        totalShares += parseFloat(shares[key]) || 0;
      });

      if (totalShares <= 0) {
        return { isValid: false, message: 'Total shares must be greater than 0', calculatedSplits: [] };
      }

      const splits = members.map(m => {
        const key = m.id || m.user_id;
        const s = parseFloat(shares[key]) || 0;
        const share = Number(((total * s) / totalShares).toFixed(2));
        return { member_id: m.id, user_id: m.user_id, share_amount: share };
      });

      return {
        isValid: true,
        totalShares,
        summary: `Divided proportionally across ${totalShares} total shares.`,
        calculatedSplits: splits
      };
    }

    return { isValid: true, calculatedSplits: [] };
  }, [numTotalAmount, members, splitType, isFixedCost, selectedMembers, exactAmounts, percentages, shares, curr, isMess]);

  // Quick fill remaining exact amount
  const handleAutoFillRemainingExact = (targetKey) => {
    if (numTotalAmount <= 0) return;
    let otherSum = 0;
    members.forEach(m => {
      const key = m.id || m.user_id;
      if (key !== targetKey) {
        otherSum += parseFloat(exactAmounts[key]) || 0;
      }
    });
    const remaining = Math.max(0, numTotalAmount - otherSum);
    setExactAmounts(prev => ({
      ...prev,
      [targetKey]: remaining.toFixed(2)
    }));
  };

  const handleToggleSelectAll = (select) => {
    const updated = {};
    members.forEach(m => {
      const key = m.id || m.user_id;
      updated[key] = select;
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
      setError(splitAnalysis.message || 'Please verify split allocations before submitting');
      return;
    }

    setLoading(true);
    try {
      const selectedMemberObj = members.find(m => (m.id === paidByMemberId || m.user_id === paidByMemberId));

      const payload = {
        title: title.trim(),
        amount: numTotalAmount,
        category,
        split_type: isFixedCost ? 'EQUAL' : splitType,
        is_fixed_cost: isFixedCost,
        expense_date: expenseDate,
        paid_by: selectedMemberObj?.user_id || undefined,
        paid_by_member_id: selectedMemberObj?.id || paidByMemberId,
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {isMess ? '🏨 Add Mess / Bazaar Expense' : (isTrip ? '✈️ Add Tour / Trip Expense' : '🏠 Add Flatmate Expense')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Record purchase, select who paid, and divide effortlessly
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
            <label className="form-label">Expense Title / Item</label>
            <input
              type="text"
              className="form-input"
              placeholder={isMess ? 'e.g. Daily Marketing (Bazar), Rice Sack, Cook Masi, Gas Cylinder' : 'e.g. Supermarket Grocery, Flat Rent, HP Gas, Goa Hotel Booking'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Amount and Expense Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.75rem' }}>
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
              <label className="form-label">Expense Date</label>
              <input
                type="date"
                className="form-input"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category & Optional Paid By */}
          <div style={{ display: 'grid', gridTemplateColumns: isMess ? '1fr' : '1fr 1fr', gap: '0.85rem', marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {isMess && (
                  <optgroup label="Establishment Costs (Fixed per candidate)">
                    <option value="MASI">🧹 Cook / Masi Salary (Fixed)</option>
                    <option value="GAS">🔥 Gas Cylinder Refill (Fixed)</option>
                    <option value="EGG">🥚 Egg Crate (Establishment)</option>
                    <option value="MEAT">🍗 Special Meat / Chicken Feast</option>
                    <option value="PAPER">📰 Monthly Newspaper / Paper</option>
                    <option value="ELECTRICITY">⚡ Electricity / Water Bill</option>
                    <option value="RENT">🏠 Room / Mess Rent</option>
                    <option value="ESTABLISHMENT_OTHER">📄 Others Establishment</option>
                  </optgroup>
                )}

                {isMess && (
                  <optgroup label="Meal / Marketing Pool (Variable Meal Rate)">
                    <option value="BAZAR">🥬 Daily Marketing & Veggies (Bazar)</option>
                    <option value="RICE">🍚 Rice Sack (Chal Basta 50kg)</option>
                    <option value="POTATO">🥔 Potato Sack (Alu Basta 50kg)</option>
                    <option value="GROCERY">🛒 Grocery, Spices & Staples</option>
                    <option value="OIL_SPICES">🌻 Mustard & Cooking Oil</option>
                  </optgroup>
                )}

                {isFlat && (
                  <optgroup label="Flatmate Shared Living">
                    <option value="RENT">🏠 Monthly Flat Rent</option>
                    <option value="GROCERY">🛒 Supermarket Groceries & Dairy</option>
                    <option value="GAS">🔥 Cooking Gas Cylinder</option>
                    <option value="WATER">💧 20L Drinking Water Cans</option>
                    <option value="WIFI">📶 High Speed WiFi Internet</option>
                    <option value="MAID">🧹 Cook & House Cleaning Maid</option>
                    <option value="ELECTRICITY">⚡ Electricity Bill</option>
                    <option value="OTHER">📄 Flat Maintenance / Misc</option>
                  </optgroup>
                )}

                {isTrip && (
                  <optgroup label="Tour / Trip Expenses">
                    <option value="HOTEL_STAY">🏨 Hotel & Resort Stay</option>
                    <option value="TICKETS">🚆 Flight / Train / Bus Tickets</option>
                    <option value="CAB_TRANSPORT">🚖 Cab, Taxi, Fuel & Toll</option>
                    <option value="OUTING">🍽️ Group Meals, Cafe & Drinks</option>
                    <option value="SNACKS">🥤 Roadtrip Snacks & Refreshments</option>
                    <option value="OTHER">🎟️ Sightseeing & Activity Passes</option>
                  </optgroup>
                )}
              </select>
            </div>

            {!isMess && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserCheck size={14} color="#60a5fa" />
                  <span>Paid By (Payer)</span>
                </label>
                <select
                  className="form-select"
                  value={paidByMemberId}
                  onChange={(e) => setPaidByMemberId(e.target.value)}
                >
                  <option value="">🏦 Mess Fund / Group Collective Fund</option>
                  {members.map(m => {
                    const mName = m.name || m.user?.name || m.email;
                    const isCur = m.user_id === currentUser?.id;
                    return (
                      <option key={m.id || m.user_id} value={m.id || m.user_id}>
                        👤 {mName} {isCur ? '(You)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Establishment Charges vs Meal Pool Explicit Selector (For Mess) */}
          {isMess && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.45rem', display: 'block' }}>
                How should this expense be divided in Mess Khatabook?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div 
                  onClick={() => {
                    setIsFixedCost(true);
                    setSplitType('EQUAL');
                  }}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: `2px solid ${isFixedCost ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    background: isFixedCost ? 'rgba(59, 130, 246, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isFixedCost ? '#93c5fd' : '#f8fafc' }}>
                      🔥 Establishment Charge
                    </span>
                    <input
                      type="radio"
                      name="mess_expense_type"
                      checked={isFixedCost}
                      onChange={() => {}}
                      style={{ accentColor: '#3b82f6' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.71rem', color: '#94a3b8', margin: 0, leading: '1.2' }}>
                    Fixed cost divided equally per candidate (Cook Masi, Gas, Rent, Electricity, Egg, Feast).
                  </p>
                </div>

                <div 
                  onClick={() => {
                    setIsFixedCost(false);
                    setSplitType('MEAL_BASED');
                  }}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: `2px solid ${!isFixedCost ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                    background: !isFixedCost ? 'rgba(16, 185, 129, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: !isFixedCost ? '#6ee7b7' : '#f8fafc' }}>
                      🥬 Meal & Marketing Pool
                    </span>
                    <input
                      type="radio"
                      name="mess_expense_type"
                      checked={!isFixedCost}
                      onChange={() => {}}
                      style={{ accentColor: '#10b981' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.71rem', color: '#94a3b8', margin: 0, leading: '1.2' }}>
                    Variable meal pool divided by meal counts (Sabji Marketing, Rice, Potato, Grocery).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Split Mode Selector (If not fixed cost) */}
          {!isFixedCost && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Expense Splitting Mode</span>
                <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600 }}>
                  {members.length} Members
                </span>
              </label>

              {/* Grid of Split Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
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
                      gap: '0.3rem'
                    }}
                  >
                    <Utensils size={17} color={splitType === 'MEAL_BASED' ? '#60a5fa' : '#64748b'} />
                    <span>Meal Pool Rate</span>
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
                    gap: '0.3rem'
                  }}
                >
                  <Users size={17} color={splitType === 'EQUAL' ? '#60a5fa' : '#64748b'} />
                  <span>Split Equally</span>
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
                    gap: '0.3rem'
                  }}
                >
                  <CheckSquare size={17} color={splitType === 'EQUAL_CUSTOM' ? '#60a5fa' : '#64748b'} />
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
                    gap: '0.3rem'
                  }}
                >
                  <DollarSign size={17} color={splitType === 'EXACT' ? '#60a5fa' : '#64748b'} />
                  <span>Exact ({curr})</span>
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
                    gap: '0.3rem'
                  }}
                >
                  <Percent size={17} color={splitType === 'PERCENTAGE' ? '#60a5fa' : '#64748b'} />
                  <span>Percentage (%)</span>
                </button>
              </div>

              {/* Dynamic Split Sub-Panel */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '1rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {splitType === 'MEAL_BASED' && (
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, marginBottom: '0.35rem' }}>
                      <CheckCircle2 size={16} /> Dynamic Meal-Rate Bazar Pool
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                      Added into the collective meal fund. Subtracted by guest meal collections, then divided by all members' meal counts.
                    </p>
                  </div>
                )}

                {splitType === 'EQUAL' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Equal split among all members:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#60a5fa' }}>
                      {numTotalAmount > 0 ? `${curr}${(numTotalAmount / (members.length || 1)).toFixed(2)} / member` : `—`}
                    </span>
                  </div>
                )}

                {splitType === 'EQUAL_CUSTOM' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Select participating members:</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => handleToggleSelectAll(true)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>All</button>
                        <button type="button" onClick={() => handleToggleSelectAll(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>None</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const key = m.id || m.user_id;
                        const isChecked = !!selectedMembers[key];
                        const activeCount = Object.values(selectedMembers).filter(Boolean).length;
                        const perHead = activeCount > 0 && isChecked ? (numTotalAmount / activeCount).toFixed(2) : '0.00';
                        const mName = m.name || m.user?.name || m.email;

                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedMembers(prev => ({ ...prev, [key]: !prev[key] }))}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '8px',
                              background: isChecked ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                              border: `1px solid ${isChecked ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ accentColor: '#3b82f6' }} />
                              <span style={{ fontSize: '0.8rem', color: isChecked ? '#f8fafc' : '#94a3b8' }}>{mName}</span>
                            </div>
                            {isChecked && numTotalAmount > 0 && (
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#60a5fa' }}>{curr}{perHead}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {splitType === 'EXACT' && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '8px',
                      background: splitAnalysis.isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      marginBottom: '0.65rem',
                      fontSize: '0.75rem'
                    }}>
                      <span style={{ color: splitAnalysis.isValid ? '#34d399' : '#fbbf24', fontWeight: 600 }}>{splitAnalysis.message}</span>
                      <span style={{ fontWeight: 800, color: '#f8fafc' }}>Allocated: {curr}{splitAnalysis.allocated || 0}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const key = m.id || m.user_id;
                        const val = exactAmounts[key] ?? '';
                        const mName = m.name || m.user?.name || m.email;

                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', flex: 1 }}>{mName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{curr}</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={val}
                                onChange={(e) => setExactAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                                className="form-input"
                                style={{ width: '85px', padding: '0.25rem 0.4rem', fontSize: '0.8rem', textAlign: 'right' }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAutoFillRemainingExact(key)}
                                style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }}
                              >
                                Remainder
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {splitType === 'PERCENTAGE' && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '8px',
                      background: splitAnalysis.isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      marginBottom: '0.65rem',
                      fontSize: '0.75rem'
                    }}>
                      <span style={{ color: splitAnalysis.isValid ? '#34d399' : '#fbbf24', fontWeight: 600 }}>{splitAnalysis.message}</span>
                      <span style={{ fontWeight: 800, color: '#f8fafc' }}>Total: {splitAnalysis.totalPct || 0}%</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const key = m.id || m.user_id;
                        const pctVal = percentages[key] ?? '';
                        const mName = m.name || m.user?.name || m.email;

                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', flex: 1 }}>{mName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={pctVal}
                                onChange={(e) => setPercentages(prev => ({ ...prev, [key]: e.target.value }))}
                                className="form-input"
                                style={{ width: '65px', padding: '0.25rem 0.4rem', fontSize: '0.8rem', textAlign: 'right' }}
                              />
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>%</span>
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

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ minWidth: '140px' }}>
              {loading ? 'Adding...' : '+ Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
