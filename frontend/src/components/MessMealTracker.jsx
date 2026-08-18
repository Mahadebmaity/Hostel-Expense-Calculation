import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Utensils, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Check, 
  Coffee, 
  Sun, 
  Moon, 
  Users,
  Grid
} from 'lucide-react';

export default function MessMealTracker({ group, onMealUpdated }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [memberEntries, setMemberEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'matrix'
  const [matrixData, setMatrixData] = useState(null);

  // Initialize or fetch meals for the selected date
  useEffect(() => {
    async function loadMealsForDate() {
      if (!group?.id) return;
      setLoading(true);
      try {
        const matrix = await api.getMealMatrix(group.id);
        setMatrixData(matrix);

        const dateRecord = matrix.date_matrix?.[selectedDate] || {};
        const entries = {};

        group.members.forEach(m => {
          const rec = dateRecord[m.user_id] || { breakfast: 1.0, lunch: 1.0, dinner: 1.0 };
          entries[m.user_id] = {
            breakfast_count: rec.breakfast !== undefined ? rec.breakfast : 1.0,
            lunch_count: rec.lunch !== undefined ? rec.lunch : 1.0,
            dinner_count: rec.dinner !== undefined ? rec.dinner : 1.0,
          };
        });

        setMemberEntries(entries);
      } catch (err) {
        console.error('Failed to load meal matrix', err);
      } finally {
        setLoading(false);
      }
    }
    loadMealsForDate();
  }, [group?.id, selectedDate]);

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const updateMealCount = (userId, mealType, delta) => {
    setMemberEntries(prev => {
      const current = prev[userId] || { breakfast_count: 0, lunch_count: 0, dinner_count: 0 };
      const currentVal = current[`${mealType}_count`] || 0;
      const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(1)));
      return {
        ...prev,
        [userId]: {
          ...current,
          [`${mealType}_count`]: newVal
        }
      };
    });
  };

  const handleSaveBulk = async () => {
    setLoading(true);
    try {
      const entries = Object.entries(memberEntries).map(([userId, val]) => ({
        user_id: userId,
        record_date: selectedDate,
        breakfast_count: val.breakfast_count,
        lunch_count: val.lunch_count,
        dinner_count: val.dinner_count
      }));

      await api.recordBulkMeals(group.id, {
        record_date: selectedDate,
        entries
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onMealUpdated) onMealUpdated();

      // Refresh matrix
      const matrix = await api.getMealMatrix(group.id);
      setMatrixData(matrix);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const bWeight = group.settings?.breakfast_weight ?? 0.5;
  const lWeight = group.settings?.lunch_weight ?? 1.0;
  const dWeight = group.settings?.dinner_weight ?? 1.0;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Header & View Switcher */}
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
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Utensils size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Daily Mess Meal Attendance</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Weights: Breakfast ({bWeight}x) • Lunch ({lWeight}x) • Dinner ({dWeight}x)
            </p>
          </div>
        </div>

        {/* Date Selector & Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setViewMode('daily')}
              style={{
                background: viewMode === 'daily' ? '#3b82f6' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Daily Marking
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              style={{
                background: viewMode === 'matrix' ? '#3b82f6' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Monthly Matrix
            </button>
          </div>

          {viewMode === 'daily' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.25rem 0.5rem' }}>
              <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
                <ChevronLeft size={16} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DAILY MARKING VIEW */}
      {viewMode === 'daily' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {group.members.map((member) => {
              const entry = memberEntries[member.user_id] || { breakfast_count: 0, lunch_count: 0, dinner_count: 0 };
              const userUnits = (entry.breakfast_count * bWeight) + (entry.lunch_count * lWeight) + (entry.dinner_count * dWeight);

              return (
                <div
                  key={member.user_id}
                  className="meal-member-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.85rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {/* Member Info */}
                  <div style={{ minWidth: '130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{member.user.name}</span>
                      <span className="badge badge-settled" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        {member.role}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Today: <strong style={{ color: '#fbbf24' }}>{userUnits.toFixed(1)} units</strong>
                    </span>
                  </div>

                  {/* Meal Counters (Breakfast, Lunch, Dinner) */}
                  <div className="meal-counters-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Breakfast */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Coffee size={15} color="#60a5fa" />
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', width: '22px' }}>Brk</span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '0.15rem' }}>
                        <button
                          type="button"
                          onClick={() => updateMealCount(member.user_id, 'breakfast', -1)}
                          style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ width: '26px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                          {entry.breakfast_count}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateMealCount(member.user_id, 'breakfast', 1)}
                          style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Lunch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Sun size={15} color="#fbbf24" />
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', width: '22px' }}>Lun</span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '0.15rem' }}>
                        <button
                          type="button"
                          onClick={() => updateMealCount(member.user_id, 'lunch', -1)}
                          style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ width: '26px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                          {entry.lunch_count}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateMealCount(member.user_id, 'lunch', 1)}
                          style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Dinner */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Moon size={15} color="#c084fc" />
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', width: '22px' }}>Din</span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '0.15rem' }}>
                        <button
                          type="button"
                          onClick={() => updateMealCount(member.user_id, 'dinner', -1)}
                          style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ width: '26px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                          {entry.dinner_count}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateMealCount(member.user_id, 'dinner', 1)}
                          style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {savedSuccess && (
              <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Check size={16} /> Attendance Saved for {selectedDate}!
              </span>
            )}
            <button
              onClick={handleSaveBulk}
              disabled={loading}
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              <Save size={16} /> {loading ? 'Saving...' : `Save (${selectedDate})`}
            </button>
          </div>
        </>
      )}

      {/* MONTHLY MATRIX TABLE VIEW */}
      {viewMode === 'matrix' && matrixData && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8' }}>Date</th>
                {matrixData.members.map(m => (
                  <th key={m.user_id} style={{ padding: '0.75rem', textAlign: 'center', color: '#f8fafc' }}>
                    {m.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(matrixData.date_matrix || {}).sort().reverse().slice(0, 15).map(dateKey => (
                <tr key={dateKey} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#94a3b8' }}>{dateKey}</td>
                  {matrixData.members.map(m => {
                    const uEntry = matrixData.date_matrix[dateKey]?.[m.user_id];
                    const units = uEntry ? uEntry.total_units : 0;
                    return (
                      <td key={m.user_id} style={{ padding: '0.65rem', textAlign: 'center' }}>
                        {units > 0 ? (
                          <span style={{ fontWeight: 700, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            {units.toFixed(1)}
                          </span>
                        ) : (
                          <span style={{ color: '#475569' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
