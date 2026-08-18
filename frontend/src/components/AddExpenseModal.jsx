import React, { useState } from 'react';
import { api } from '../services/api';
import { PlusCircle, ShoppingBag, Receipt, Zap, Flame, Home, Sparkles, Coffee } from 'lucide-react';

export default function AddExpenseModal({ group, onClose, onExpenseAdded }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('GROCERY');
  const [splitType, setSplitType] = useState(group?.group_type === 'MESS' ? 'MEAL_BASED' : 'EQUAL');
  const [isFixedCost, setIsFixedCost] = useState(false);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    setLoading(true);
    try {
      await api.createExpense(group.id, {
        title,
        amount: parseFloat(amount),
        category,
        split_type: isFixedCost ? 'EQUAL' : splitType,
        is_fixed_cost: isFixedCost,
        expense_date: expenseDate
      });

      if (onExpenseAdded) onExpenseAdded();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>➕ Add Expense / Bazaar Record</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Expense Title / Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Weekly Veggies, Chicken Bazaar, Gas Refill, Cook Salary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Amount & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Amount ({curr})</label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
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

          {/* Category */}
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

          {/* Fixed vs Variable Split Toggle (For Mess) */}
          {group?.group_type === 'MESS' ? (
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '1rem',
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
                      : '✓ Added to variable grocery pool and split by individual meal rate.'}
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Split Method</label>
              <select
                className="form-select"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value)}
              >
                <option value="EQUAL">Equally among all members</option>
              </select>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Adding Expense...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
