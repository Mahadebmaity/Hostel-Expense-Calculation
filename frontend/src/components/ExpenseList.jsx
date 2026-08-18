import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Filter, 
  ShoppingBag, 
  Zap, 
  Flame, 
  Home, 
  Coffee, 
  Sparkles,
  Layers
} from 'lucide-react';

const CATEGORY_ICONS = {
  GROCERY: <ShoppingBag size={14} color="#34d399" />,
  GAS: <Flame size={14} color="#f97316" />,
  ELECTRICITY: <Zap size={14} color="#eab308" />,
  RENT: <Home size={14} color="#38bdf8" />,
  MAID: <Sparkles size={14} color="#a855f7" />,
  SNACKS: <Coffee size={14} color="#ec4899" />,
  OUTING: <Layers size={14} color="#60a5fa" />,
  OTHER: <Receipt size={14} color="#94a3b8" />
};

export default function ExpenseList({ 
  group, 
  expenses, 
  onExpenseDeleted, 
  onOpenAddExpense, 
  currentUserId 
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  const filteredExpenses = expenses.filter(exp => {
    const matchesCat = selectedCategory === 'ALL' || exp.category === selectedCategory;
    const matchesSearch = exp.title.toLowerCase().includes(search.toLowerCase()) || 
                          exp.payer?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.deleteExpense(expenseId);
      if (onExpenseDeleted) onExpenseDeleted();
    } catch (err) {
      alert(err.message);
    }
  };

  const categories = ['ALL', 'GROCERY', 'GAS', 'ELECTRICITY', 'RENT', 'MAID', 'SNACKS', 'OUTING', 'OTHER'];

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Receipt size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Expense Feed & Purchases</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {expenses.length} total entries recorded
            </p>
          </div>
        </div>

        <button onClick={onOpenAddExpense} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
          <Plus size={16} /> Add New Expense
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {/* Category Chips */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem', maxWidth: '100%' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${selectedCategory === cat ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                color: selectedCategory === cat ? '#60a5fa' : '#94a3b8',
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by item or member..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ width: '220px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
        />
      </div>

      {/* Expense Items List */}
      {filteredExpenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
          <Receipt size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '0.9rem' }}>No expense entries match your filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredExpenses.map(exp => {
            const isPayer = exp.paid_by === currentUserId;

            return (
              <div
                key={exp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.85rem 1.15rem',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                {/* Left: Icon & Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    padding: '0.55rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {CATEGORY_ICONS[exp.category] || <Receipt size={16} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                        {exp.title}
                      </h4>
                      {exp.is_fixed_cost && (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.65rem' }}>
                          Fixed Utility
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      Paid by <strong style={{ color: isPayer ? '#60a5fa' : '#cbd5e1' }}>{isPayer ? 'You' : exp.payer?.name}</strong> • {exp.expense_date} • <span style={{ textTransform: 'capitalize' }}>{exp.category.toLowerCase()}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                      {curr}{exp.amount.toFixed(2)}
                    </span>
                    <p style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {exp.split_type === 'MEAL_BASED' ? 'Meal-rate split' : 'Equally divided'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem', borderRadius: '8px', color: '#ef4444' }}
                    title="Delete expense"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
