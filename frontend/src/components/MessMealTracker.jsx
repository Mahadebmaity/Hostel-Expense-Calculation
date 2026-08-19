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
  Grid,
  UserCheck,
  Plus,
  Minus
} from 'lucide-react';

export default function MessMealTracker({ group, onMealUpdated }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly', 'daily', 'matrix'
  
  // Daily Mode State
  const [dailyEntries, setDailyEntries] = useState({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [savedDailySuccess, setSavedDailySuccess] = useState(false);

  // Monthly Mode State (Direct monthly meal counts & guest charges)
  const [monthlyEntries, setMonthlyEntries] = useState({});
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [savedMonthlySuccess, setSavedMonthlySuccess] = useState(false);

  // Matrix State
  const [matrixData, setMatrixData] = useState(null);

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');
  const members = group?.members || [];

  // Load Matrix & Initialize State
  useEffect(() => {
    async function loadData() {
      if (!group?.id) return;
      try {
        const matrix = await api.getMealMatrix(group.id);
        setMatrixData(matrix);

        // Populate Daily Entries
        const dateRecord = matrix.date_matrix?.[selectedDate] || {};
        const dEntries = {};
        const mEntries = {};

        members.forEach(m => {
          const key = m.id || m.user_id;
          const rec = dateRecord[key] || dateRecord[m.user_id] || { breakfast: 1.0, lunch: 1.0, dinner: 1.0 };
          dEntries[key] = {
            member_id: m.id,
            user_id: m.user_id,
            breakfast_count: rec.breakfast !== undefined ? rec.breakfast : 1.0,
            lunch_count: rec.lunch !== undefined ? rec.lunch : 1.0,
            dinner_count: rec.dinner !== undefined ? rec.dinner : 1.0,
            guest_veg_count: rec.guest_veg || 0.0,
            guest_fish_count: rec.guest_fish || 0.0,
            guest_meat_count: rec.guest_meat || 0.0,
            guest_charge: rec.guest_charge || 0.0
          };

          // Find sum of units for this member across all dates in matrix
          let totalUserMeals = 0.0;
          let totalGuestVeg = 0.0;
          let totalGuestFish = 0.0;
          let totalGuestMeat = 0.0;
          let totalGuestCharge = 0.0;

          Object.keys(matrix.date_matrix || {}).forEach(d => {
            const dayRec = matrix.date_matrix[d]?.[key] || matrix.date_matrix[d]?.[m.user_id];
            if (dayRec) {
              totalUserMeals += (dayRec.total_units || 0);
              totalGuestVeg += (dayRec.guest_veg || 0);
              totalGuestFish += (dayRec.guest_fish || 0);
              totalGuestMeat += (dayRec.guest_meat || 0);
              totalGuestCharge += (dayRec.guest_charge || 0);
            }
          });

          mEntries[key] = {
            member_id: m.id,
            user_id: m.user_id,
            name: m.name || m.user?.name || m.email,
            total_meals: totalUserMeals || 45.0, // sensible default
            guest_veg: totalGuestVeg,
            guest_fish: totalGuestFish,
            guest_meat: totalGuestMeat,
            guest_charge: totalGuestCharge
          };
        });

        setDailyEntries(dEntries);
        setMonthlyEntries(mEntries);
      } catch (err) {
        console.error('Failed to load meal matrix', err);
      }
    }
    loadData();
  }, [group?.id, selectedDate, members.length]);

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const updateDailyCount = (key, field, delta) => {
    setDailyEntries(prev => {
      const current = prev[key] || { breakfast_count: 0, lunch_count: 0, dinner_count: 0, guest_charge: 0 };
      const currentVal = current[field] || 0;
      const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(1)));
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: newVal
        }
      };
    });
  };

  const handleSaveDaily = async () => {
    setLoadingDaily(true);
    try {
      const entries = Object.values(dailyEntries).map(val => ({
        member_id: val.member_id,
        user_id: val.user_id,
        record_date: selectedDate,
        breakfast_count: val.breakfast_count || 0,
        lunch_count: val.lunch_count || 0,
        dinner_count: val.dinner_count || 0,
        guest_veg_count: val.guest_veg_count || 0,
        guest_fish_count: val.guest_fish_count || 0,
        guest_meat_count: val.guest_meat_count || 0,
        guest_charge: val.guest_charge || 0
      }));

      await api.recordBulkMeals(group.id, {
        record_date: selectedDate,
        entries
      });

      setSavedDailySuccess(true);
      setTimeout(() => setSavedDailySuccess(false), 2500);
      if (onMealUpdated) onMealUpdated();

      const matrix = await api.getMealMatrix(group.id);
      setMatrixData(matrix);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingDaily(false);
    }
  };

  const handleSaveMonthlySummary = async () => {
    setLoadingMonthly(true);
    try {
      const entries = Object.values(monthlyEntries).map(item => ({
        member_id: item.member_id,
        user_id: item.user_id,
        total_meals: parseFloat(item.total_meals) || 0.0,
        guest_veg: parseFloat(item.guest_veg) || 0.0,
        guest_fish: parseFloat(item.guest_fish) || 0.0,
        guest_meat: parseFloat(item.guest_meat) || 0.0,
        guest_charge: parseFloat(item.guest_charge) || 0.0,
        month_date: selectedDate
      }));

      await api.recordMonthlySummaryMeals(group.id, {
        month_date: selectedDate,
        entries
      });

      setSavedMonthlySuccess(true);
      setTimeout(() => setSavedMonthlySuccess(false), 2500);
      if (onMealUpdated) onMealUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const bWeight = group.settings?.breakfast_weight ?? 0.5;
  const lWeight = group.settings?.lunch_weight ?? 1.0;
  const dWeight = group.settings?.dinner_weight ?? 1.0;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Header & Mode Switcher */}
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Mess Meal Chart & Attendance</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Standard 60/62 meals month • Lunch & Dinner • Guest Meal System
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setViewMode('monthly')}
              style={{
                background: viewMode === 'monthly' ? '#3b82f6' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📋 Monthly Meal Sheet
            </button>
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
              📅 Daily Marking
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
              📊 Date Matrix
            </button>
          </div>
        </div>
      </div>

      {/* 1. MONTHLY SCORE BOARD SUMMARY VIEW (Direct monthly ledger input) */}
      {viewMode === 'monthly' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '0.85rem 1.1rem',
            borderRadius: '12px',
            marginBottom: '1.25rem'
          }}>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#93c5fd' }}>
                Monthly Candidate Meal Counts & Guest Billing
              </strong>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Directly enter the total meals eaten by each candidate this month (e.g. 54, 55, 40) and any guest meals hosted.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Total Candidates: </span>
              <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>{members.length}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
            {members.map((member, idx) => {
              const key = member.id || member.user_id;
              const entry = monthlyEntries[key] || { total_meals: 45.0, guest_veg: 0, guest_fish: 0, guest_meat: 0, guest_charge: 0 };
              const memberDisplayName = member.name || member.user?.name || member.email;

              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {/* Candidate Name & Role */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '160px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>
                      {idx + 1}
                    </span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                        {memberDisplayName}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {member.role} {member.is_virtual === 'true' ? '• Virtual' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Total Member Meals Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Member Meals:</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '0.15rem' }}>
                      <button
                        type="button"
                        onClick={() => setMonthlyEntries(prev => ({
                          ...prev,
                          [key]: { ...entry, total_meals: Math.max(0, parseFloat(entry.total_meals || 0) - 1) }
                        }))}
                        style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={entry.total_meals}
                        onChange={(e) => setMonthlyEntries(prev => ({
                          ...prev,
                          [key]: { ...entry, total_meals: parseFloat(e.target.value) || 0 }
                        }))}
                        style={{
                          width: '55px',
                          background: 'transparent',
                          border: 'none',
                          color: '#fbbf24',
                          textAlign: 'center',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setMonthlyEntries(prev => ({
                          ...prev,
                          [key]: { ...entry, total_meals: parseFloat(entry.total_meals || 0) + 1 }
                        }))}
                        style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Guest Meals (Veg, Fish, Meat count / charge) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Guest Meals:</span>
                    
                    {/* Guest Veg */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#34d399' }}>Veg:</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.guest_veg || ''}
                        placeholder="0"
                        onChange={(e) => setMonthlyEntries(prev => ({
                          ...prev,
                          [key]: { ...entry, guest_veg: parseFloat(e.target.value) || 0 }
                        }))}
                        style={{ width: '38px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', textAlign: 'center' }}
                      />
                    </div>

                    {/* Guest Fish */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#60a5fa' }}>Fish:</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.guest_fish || ''}
                        placeholder="0"
                        onChange={(e) => setMonthlyEntries(prev => ({
                          ...prev,
                          [key]: { ...entry, guest_fish: parseFloat(e.target.value) || 0 }
                        }))}
                        style={{ width: '38px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', textAlign: 'center' }}
                      />
                    </div>

                    {/* Guest Meat */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#f87171' }}>Meat:</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.guest_meat || ''}
                        placeholder="0"
                        onChange={(e) => setMonthlyEntries(prev => ({
                          ...prev,
                          [key]: { ...entry, guest_meat: parseFloat(e.target.value) || 0 }
                        }))}
                        style={{ width: '38px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', textAlign: 'center' }}
                      />
                    </div>

                    {/* Total Guest Charge Override */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>Charge ({curr}):</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.guest_charge || ''}
                        placeholder="Auto"
                        onChange={(e) => setMonthlyEntries(prev => ({
                          ...prev,
                          [key]: { ...entry, guest_charge: parseFloat(e.target.value) || 0 }
                        }))}
                        style={{ width: '56px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fbbf24', fontSize: '0.75rem', textAlign: 'right', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {savedMonthlySuccess && (
              <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Check size={16} /> Monthly Meal Records Saved!
              </span>
            )}
            <button
              onClick={handleSaveMonthlySummary}
              disabled={loadingMonthly}
              className="btn btn-primary"
              style={{ minWidth: '180px' }}
            >
              <Save size={16} /> {loadingMonthly ? 'Saving...' : 'Save Meal Ledger'}
            </button>
          </div>
        </div>
      )}

      {/* 2. DAILY MARKING VIEW */}
      {viewMode === 'daily' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.5rem 0.85rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Select Date for Attendance:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {members.map((member) => {
              const key = member.id || member.user_id;
              const entry = dailyEntries[key] || { breakfast_count: 0, lunch_count: 0, dinner_count: 0, guest_veg_count: 0, guest_fish_count: 0, guest_meat_count: 0, guest_charge: 0 };
              const userUnits = ((entry.breakfast_count || 0) * bWeight) + ((entry.lunch_count || 0) * lWeight) + ((entry.dinner_count || 0) * dWeight);
              const displayName = member.name || member.user?.name || member.email;

              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {/* Member Info */}
                  <div style={{ minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>{displayName}</span>
                      <span className="badge badge-settled" style={{ fontSize: '0.65rem' }}>
                        {member.role}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Today: <strong style={{ color: '#fbbf24' }}>{userUnits.toFixed(1)} units</strong>
                    </span>
                  </div>

                  {/* Breakfast, Lunch, Dinner Counters */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    {/* Breakfast */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Coffee size={14} color="#60a5fa" />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Brk</span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '0.1rem' }}>
                        <button
                          type="button"
                          onClick={() => updateDailyCount(key, 'breakfast_count', -1)}
                          style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ width: '24px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                          {entry.breakfast_count || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDailyCount(key, 'breakfast_count', 1)}
                          style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Lunch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Sun size={14} color="#fbbf24" />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lun</span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '0.1rem' }}>
                        <button
                          type="button"
                          onClick={() => updateDailyCount(key, 'lunch_count', -1)}
                          style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ width: '24px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                          {entry.lunch_count || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDailyCount(key, 'lunch_count', 1)}
                          style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Dinner */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Moon size={14} color="#c084fc" />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Din</span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '0.1rem' }}>
                        <button
                          type="button"
                          onClick={() => updateDailyCount(key, 'dinner_count', -1)}
                          style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ width: '24px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                          {entry.dinner_count || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDailyCount(key, 'dinner_count', 1)}
                          style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
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
            {savedDailySuccess && (
              <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Check size={16} /> Attendance Saved for {selectedDate}!
              </span>
            )}
            <button
              onClick={handleSaveDaily}
              disabled={loadingDaily}
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              <Save size={16} /> {loadingDaily ? 'Saving...' : `Save (${selectedDate})`}
            </button>
          </div>
        </>
      )}

      {/* 3. MONTHLY MATRIX TABLE VIEW */}
      {viewMode === 'matrix' && matrixData && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8' }}>Date</th>
                {matrixData.members?.map(m => (
                  <th key={m.member_id || m.user_id} style={{ padding: '0.75rem', textAlign: 'center', color: '#f8fafc' }}>
                    {m.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(matrixData.date_matrix || {}).sort().reverse().slice(0, 15).map(dateKey => (
                <tr key={dateKey} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#94a3b8' }}>{dateKey}</td>
                  {matrixData.members?.map(m => {
                    const uEntry = matrixData.date_matrix[dateKey]?.[m.member_id] || matrixData.date_matrix[dateKey]?.[m.user_id];
                    const units = uEntry ? uEntry.total_units : 0;
                    return (
                      <td key={m.member_id || m.user_id} style={{ padding: '0.65rem', textAlign: 'center' }}>
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
