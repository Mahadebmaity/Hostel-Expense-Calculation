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
  const isPersonal = group?.group_type === 'PERSONAL' || (!isMess && !isFlat && !isTrip);

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

  const [defaultPayerInitialized, setDefaultPayerInitialized] = useState(false);

  // Set default paid_by once members are loaded
  useEffect(() => {
    if (!defaultPayerInitialized && members.length > 0) {
      const match = members.find(m => m.user_id === currentUser?.id);
      setPaidByMemberId(match ? match.id : 'FUND');
      setDefaultPayerInitialized(true);
    }
  }, [currentUser, members, defaultPayerInitialized]);

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
      const totalCents = Math.round(total * 100);
      const baseCents = Math.floor(totalCents / members.length);
      const remainderCents = totalCents % members.length;
      const splits = members.map((m, i) => {
        const cents = baseCents + (i < remainderCents ? 1 : 0);
        return {
          member_id: m.id,
          user_id: m.user_id,
          share_amount: Number((cents / 100).toFixed(2)),
          percentage: Number((100 / members.length).toFixed(2))
        };
      });
      const avgShare = (total / members.length).toFixed(2);
      return {
        isValid: true,
        summary: `${curr}${avgShare} each divided equally among ${members.length} members.`,
        calculatedSplits: splits
      };
    }

    if (splitType === 'EQUAL_CUSTOM') {
      const activeKeys = Object.keys(selectedMembers).filter(k => selectedMembers[k]);
      if (activeKeys.length === 0) {
        return { isValid: false, message: 'Select at least one member to share this expense.', calculatedSplits: [] };
      }
      const totalCents = Math.round(total * 100);
      const baseCents = Math.floor(totalCents / activeKeys.length);
      const remainderCents = totalCents % activeKeys.length;
      const splits = activeKeys.map((k, i) => {
        const mObj = members.find(m => (m.id === k || m.user_id === k));
        const cents = baseCents + (i < remainderCents ? 1 : 0);
        return {
          member_id: mObj?.id || k,
          user_id: mObj?.user_id,
          share_amount: Number((cents / 100).toFixed(2)),
          percentage: Number((100 / activeKeys.length).toFixed(2))
        };
      });
      const avgShare = (total / activeKeys.length).toFixed(2);
      return {
        isValid: true,
        summary: `${curr}${avgShare} each for ${activeKeys.length} selected members.`,
        calculatedSplits: splits
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
      const isMatched = Math.abs(remaining) <= 0.01;

      return {
        isValid: isMatched,
        allocated: Number(allocated.toFixed(2)),
        remaining,
        message: isMatched
          ? `Exact allocations match total bill (${curr}${total.toFixed(2)})`
          : remaining > 0
          ? `${curr}${remaining.toFixed(2)} is still unallocated.`
          : `Allocated custom shares exceed expense amount by ${curr}${Math.abs(remaining).toFixed(2)}.`,
        calculatedSplits: isMatched ? splits : []
      };
    }

    if (splitType === 'PERCENTAGE') {
      let totalPct = 0;
      members.forEach(m => {
        const key = m.id || m.user_id;
        const pct = parseFloat(percentages[key]) || 0;
        totalPct += pct;
      });

      const remainingPct = Number((100 - totalPct).toFixed(2));
      const isMatched = Math.abs(remainingPct) <= 0.05;

      const totalCents = Math.round(total * 100);
      let allocatedCents = 0;
      const splits = members.map(m => {
        const key = m.id || m.user_id;
        const pct = parseFloat(percentages[key]) || 0;
        const cents = Math.round(totalCents * (pct / 100));
        allocatedCents += cents;
        return {
          member_id: m.id,
          user_id: m.user_id,
          share_amount: Number((cents / 100).toFixed(2)),
          percentage: pct
        };
      });

      // Adjust rounding cents on first member if needed
      const diffCents = totalCents - allocatedCents;
      if (diffCents !== 0 && splits.length > 0) {
        splits[0].share_amount = Number((splits[0].share_amount + diffCents / 100).toFixed(2));
      }

      return {
        isValid: isMatched,
        totalPct: Number(totalPct.toFixed(1)),
        remainingPct,
        message: isMatched
          ? `Total percentages = 100%`
          : `Percentages must total 100%.`,
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

      const totalCents = Math.round(total * 100);
      let allocatedCents = 0;
      const splits = members.map(m => {
        const key = m.id || m.user_id;
        const s = parseFloat(shares[key]) || 0;
        const cents = Math.round((totalCents * s) / totalShares);
        allocatedCents += cents;
        return { member_id: m.id, user_id: m.user_id, share_amount: Number((cents / 100).toFixed(2)) };
      });

      const diffCents = totalCents - allocatedCents;
      if (diffCents !== 0 && splits.length > 0) {
        splits[0].share_amount = Number((splits[0].share_amount + diffCents / 100).toFixed(2));
      }

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
      const isFund = paidByMemberId === 'FUND' || !paidByMemberId;
      const selectedMemberObj = isFund ? null : members.find(m => (m.id === paidByMemberId || m.user_id === paidByMemberId));

      const payload = {
        title: title.trim(),
        amount: numTotalAmount,
        category,
        split_type: isFixedCost ? 'EQUAL' : splitType,
        is_fixed_cost: isFixedCost,
        expense_date: expenseDate,
        paid_by: isFund ? undefined : (selectedMemberObj?.user_id || undefined),
        paid_by_member_id: isFund ? "FUND" : (selectedMemberObj?.id || paidByMemberId),
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

          {/* Category & Paid By */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.75rem' }}>
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
                    <option value="WATER">💧 Drinking Water / Cans</option>
                    <option value="WIFI">📶 High Speed Wi-Fi Internet</option>
                    <option value="ELECTRICITY">⚡ Electricity Bill</option>
                    <option value="MAINTENANCE">🛠️ Society / Flat Maintenance</option>
                    <option value="HOUSEHOLD">🛋️ Household Expenses & Essentials</option>
                    <option value="MAID">🧹 Cook & House Cleaning Maid</option>
                    <option value="OTHER">📄 Other Expenses / Misc</option>
                  </optgroup>
                )}

                {isTrip && (
                  <optgroup label="Tour & Travel Plan Expenses">
                    <option value="HOTEL">🏨 Hotel & Resort Stay</option>
                    <option value="TRAIN">🚆 Train Tickets & IRCTC</option>
                    <option value="FLIGHT">✈️ Flight Tickets & Airfare</option>
                    <option value="BUS">🚌 Bus & Volvo Booking</option>
                    <option value="CAB">🚕 Cab & Taxi (Rental / City)</option>
                    <option value="FOOD">🍽️ Food & Group Dining</option>
                    <option value="TICKETS">🎟️ Entry Tickets & Passes</option>
                    <option value="ACTIVITIES">🏄 Activities & Adventure Sports</option>
                    <option value="PARKING">🅿️ Parking & Toll Charges</option>
                    <option value="FUEL">⛽ Fuel / Petrol / Diesel</option>
                    <option value="OTHER">📄 Other Travel Expenses</option>
                  </optgroup>
                )}

                {isPersonal && (
                  <optgroup label="Personal / Friends Shared Expenses">
                    <option value="FOOD">🍕 Dining, Cafe & Drinks</option>
                    <option value="OUTING">🎬 Movies, Events & Hangouts</option>
                    <option value="GROCERY">🛒 Groceries & Snacks</option>
                    <option value="SHOPPING">🛍️ Shopping & Gifts</option>
                    <option value="TRAVEL">🚕 Cab, Travel & Fuel</option>
                    <option value="BILLS">📱 Bills, Subscriptions & Utilities</option>
                    <option value="OTHER">📄 Other Shared Expense</option>
                  </optgroup>
                )}
              </select>
            </div>

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
                <option value="FUND">
                  🏦 {isMess ? 'Mess Fund / Manager (Advance Pool)' : (isFlat ? 'Flat / Roommate Fund (Advance Pool)' : 'Group / Tour Collective Fund')}
                </option>
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
          </div>

          {/* Establishment Charges vs Meal Pool Explicit Selector (For Mess) */}
          {isMess && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem', display: 'block' }}>
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
                    border: `2px solid ${isFixedCost ? '#3b82f6' : 'var(--border-glass)'}`,
                    background: isFixedCost ? 'rgba(59, 130, 246, 0.18)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isFixedCost ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
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
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: 0, leading: '1.2' }}>
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
                    border: `2px solid ${!isFixedCost ? '#10b981' : 'var(--border-glass)'}`,
                    background: !isFixedCost ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: !isFixedCost ? '#10b981' : 'var(--text-primary)' }}>
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
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: 0, leading: '1.2' }}>
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
                background: 'var(--bg-surface)',
                padding: '1rem',
                borderRadius: '14px',
                border: '1px solid var(--border-glass)'
              }}>
                {splitType === 'MEAL_BASED' && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, marginBottom: '0.35rem' }}>
                      <CheckCircle2 size={16} /> Dynamic Meal-Rate Bazar Pool
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Added into the collective meal fund. Subtracted by guest meal collections, then divided by all members' meal counts.
                    </p>
                  </div>
                )}

                {splitType === 'EQUAL' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Equal split among all members:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#60a5fa' }}>
                      {numTotalAmount > 0 ? `${curr}${(numTotalAmount / (members.length || 1)).toFixed(2)} / member` : `—`}
                    </span>
                  </div>
                )}

                {splitType === 'EQUAL_CUSTOM' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Select participating members:</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => handleToggleSelectAll(true)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>All</button>
                        <button type="button" onClick={() => handleToggleSelectAll(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>None</button>
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
                              background: isChecked ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface)',
                              border: `1px solid ${isChecked ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-glass)'}`,
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ accentColor: '#3b82f6' }} />
                              <span style={{ fontSize: '0.8rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{mName}</span>
                            </div>
                            {isChecked && numTotalAmount > 0 && (
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{curr}{perHead}</span>
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
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Allocated: {curr}{splitAnalysis.allocated || 0}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const key = m.id || m.user_id;
                        const val = exactAmounts[key] ?? '';
                        const mName = m.name || m.user?.name || m.email;

                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1 }}>{mName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{curr}</span>
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
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Total: {splitAnalysis.totalPct || 0}%</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto' }}>
                      {members.map(m => {
                        const key = m.id || m.user_id;
                        const pctVal = percentages[key] ?? '';
                        const mName = m.name || m.user?.name || m.email;
                        const calcShare = numTotalAmount > 0 && pctVal ? ((numTotalAmount * (parseFloat(pctVal) || 0)) / 100).toFixed(2) : null;

                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1 }}>{mName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
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
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#60a5fa', minWidth: '70px', textAlign: 'right' }}>
                                {calcShare ? `${curr}${calcShare}` : '—'}
                              </span>
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
