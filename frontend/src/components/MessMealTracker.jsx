import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Utensils, 
  Save, 
  Check, 
  Sun, 
  Moon, 
  Users
} from 'lucide-react';

export default function MessMealTracker({ group, onMealUpdated }) {
  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Monthly Mode State (Direct monthly meal counts & guest charges)
  const [monthlyEntries, setMonthlyEntries] = useState({});
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [savedMonthlySuccess, setSavedMonthlySuccess] = useState(false);

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');
  const members = group?.members || [];

  // Guest Rates State & Admin Price Config
  const [guestRates, setGuestRates] = useState(() => ({
    veg: group?.settings?.guest_rates?.veg ?? 40.0,
    fish: group?.settings?.guest_rates?.fish ?? 50.0,
    meat: group?.settings?.guest_rates?.meat ?? 75.0,
    egg: group?.settings?.guest_rates?.egg ?? 35.0,
  }));
  const [savingRates, setSavingRates] = useState(false);
  const [ratesSavedToast, setRatesSavedToast] = useState(false);
  const [trackerError, setTrackerError] = useState(null);

  useEffect(() => {
    if (group?.settings?.guest_rates) {
      setGuestRates({
        veg: group.settings.guest_rates.veg ?? 40.0,
        fish: group.settings.guest_rates.fish ?? 50.0,
        meat: group.settings.guest_rates.meat ?? 75.0,
        egg: group.settings.guest_rates.egg ?? 35.0,
      });
    }
  }, [group?.settings?.guest_rates]);

  const calcAutoCharge = (item, rates) => {
    const v = parseFloat(item?.guest_veg) || 0;
    const f = parseFloat(item?.guest_fish) || 0;
    const m = parseFloat(item?.guest_meat) || 0;
    const e = parseFloat(item?.guest_egg) || 0;
    const rVeg = rates?.veg ?? 40;
    const rFish = rates?.fish ?? 50;
    const rMeat = rates?.meat ?? 75;
    const rEgg = rates?.egg ?? 35;
    return (v * rVeg) + (f * rFish) + (m * rMeat) + (e * rEgg);
  };

  const updateGuestCount = (key, field, val) => {
    setMonthlyEntries(prev => {
      const current = prev[key] || { total_meals: 45.0, guest_veg: 0, guest_fish: 0, guest_meat: 0, guest_egg: 0, guest_charge: 0, is_manual_charge: false };
      const numVal = Math.max(0, parseFloat(val) || 0);
      const updated = { ...current, [field]: numVal };
      
      // Auto-calculate charge if not manually overridden
      if (!current.is_manual_charge) {
        updated.guest_charge = calcAutoCharge(updated, guestRates);
      }
      return { ...prev, [key]: updated };
    });
  };

  const updateGuestChargeInput = (key, val) => {
    setMonthlyEntries(prev => {
      const current = prev[key] || { total_meals: 45.0, guest_veg: 0, guest_fish: 0, guest_meat: 0, guest_egg: 0, guest_charge: 0 };
      if (val === '' || val === null) {
        // Reset to Auto calculation
        const autoVal = calcAutoCharge(current, guestRates);
        return {
          ...prev,
          [key]: { ...current, guest_charge: autoVal, is_manual_charge: false }
        };
      }
      const numVal = parseFloat(val) || 0;
      return {
        ...prev,
        [key]: { ...current, guest_charge: numVal, is_manual_charge: true }
      };
    });
  };

  const handleSaveGuestRates = async () => {
    if (!group?.id) return;
    setSavingRates(true);
    setTrackerError(null);
    try {
      await api.updateGroup(group.id, {
        settings: {
          ...group.settings,
          guest_rates: {
            veg: parseFloat(guestRates.veg) || 40.0,
            fish: parseFloat(guestRates.fish) || 50.0,
            meat: parseFloat(guestRates.meat) || 75.0,
            egg: parseFloat(guestRates.egg) || 35.0,
          }
        }
      });

      // Recalculate monthly entries with updated rates
      setMonthlyEntries(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (!next[k].is_manual_charge) {
            next[k] = {
              ...next[k],
              guest_charge: calcAutoCharge(next[k], guestRates)
            };
          }
        });
        return next;
      });

      if (onMealUpdated) onMealUpdated();
      setRatesSavedToast(true);
      setTimeout(() => setRatesSavedToast(false), 2500);
    } catch (err) {
      setTrackerError('Failed to save guest rates: ' + (err.message || 'Error'));
      setTimeout(() => setTrackerError(null), 4000);
    } finally {
      setSavingRates(false);
    }
  };

  // Load Matrix & Initialize State
  useEffect(() => {
    async function loadData() {
      if (!group?.id) return;
      try {
        const matrix = await api.getMealMatrix(group.id);
        const mEntries = {};

        members.forEach(m => {
          const key = m.id || m.user_id;

          let totalUserMeals = 0.0;
          let totalGuestVeg = 0.0;
          let totalGuestFish = 0.0;
          let totalGuestMeat = 0.0;
          let totalGuestEgg = 0.0;
          let totalGuestCharge = 0.0;

          Object.keys(matrix.date_matrix || {}).forEach(d => {
            const dayRec = matrix.date_matrix[d]?.[key] || matrix.date_matrix[d]?.[m.user_id];
            if (dayRec) {
              totalUserMeals += (dayRec.total_units || 0);
              totalGuestVeg += (dayRec.guest_veg || 0);
              totalGuestFish += (dayRec.guest_fish || 0);
              totalGuestMeat += (dayRec.guest_meat || 0);
              totalGuestEgg += (dayRec.guest_egg || 0);
              totalGuestCharge += (dayRec.guest_charge || 0);
            }
          });

          const initialGuestObj = {
            guest_veg: totalGuestVeg,
            guest_fish: totalGuestFish,
            guest_meat: totalGuestMeat,
            guest_egg: totalGuestEgg
          };

          const calculatedAuto = calcAutoCharge(initialGuestObj, guestRates);

          mEntries[key] = {
            member_id: m.id,
            user_id: m.user_id,
            name: m.name || m.user?.name || m.email,
            total_meals: totalUserMeals || 45.0,
            guest_veg: totalGuestVeg,
            guest_fish: totalGuestFish,
            guest_meat: totalGuestMeat,
            guest_egg: totalGuestEgg,
            guest_charge: totalGuestCharge > 0 ? totalGuestCharge : calculatedAuto,
            is_manual_charge: totalGuestCharge > 0 && totalGuestCharge !== calculatedAuto
          };
        });

        setMonthlyEntries(mEntries);
      } catch (err) {
        console.error('Failed to load meal matrix', err);
      }
    }
    loadData();
  }, [group?.id, selectedDate, members.length]);

  const handleSaveMonthlySummary = async () => {
    setLoadingMonthly(true);
    try {
      const entries = Object.values(monthlyEntries).map(item => {
        const computedCharge = item.is_manual_charge ? (parseFloat(item.guest_charge) || 0.0) : calcAutoCharge(item, guestRates);
        return {
          member_id: item.member_id,
          user_id: item.user_id,
          total_meals: parseFloat(item.total_meals) || 0.0,
          guest_veg: parseFloat(item.guest_veg) || 0.0,
          guest_fish: parseFloat(item.guest_fish) || 0.0,
          guest_meat: parseFloat(item.guest_meat) || 0.0,
          guest_egg: parseFloat(item.guest_egg) || 0.0,
          guest_charge: computedCharge,
          month_date: selectedDate
        };
      });

      await api.recordMonthlySummaryMeals(group.id, {
        month_date: selectedDate,
        entries
      });

      setSavedMonthlySuccess(true);
      setTimeout(() => setSavedMonthlySuccess(false), 2500);
      if (onMealUpdated) onMealUpdated();
    } catch (err) {
      setTrackerError(err.message || 'Failed to save monthly meal counts');
      setTimeout(() => setTrackerError(null), 4000);
    } finally {
      setLoadingMonthly(false);
    }
  };

  return (
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
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Utensils size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Mess Monthly Meal Ledger</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Direct Monthly Meal Sheet • Guest Rates System
            </p>
          </div>
        </div>
      </div>

      {/* MONTHLY SCORE BOARD SUMMARY VIEW */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '0.85rem 1.1rem',
          borderRadius: '12px',
          marginBottom: '1rem'
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

        {/* Admin Price / Rate Config Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <strong style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              ⚙️ Guest Meal Price Settings ({curr})
            </strong>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
              Admin can change rates here. Guest charges calculate automatically below.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700 }}>Veg:</span>
              <input
                type="number"
                min="0"
                value={guestRates.veg}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setGuestRates(r => ({ ...r, veg: val }));
                }}
                style={{ width: '48px', padding: '0.25rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(52, 211, 153, 0.5)', borderRadius: '6px', color: '#34d399', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700 }}>Fish:</span>
              <input
                type="number"
                min="0"
                value={guestRates.fish}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setGuestRates(r => ({ ...r, fish: val }));
                }}
                style={{ width: '48px', padding: '0.25rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(96, 165, 250, 0.5)', borderRadius: '6px', color: '#60a5fa', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>Meat:</span>
              <input
                type="number"
                min="0"
                value={guestRates.meat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setGuestRates(r => ({ ...r, meat: val }));
                }}
                style={{ width: '48px', padding: '0.25rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(248, 113, 113, 0.5)', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>Egg:</span>
              <input
                type="number"
                min="0"
                value={guestRates.egg}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setGuestRates(r => ({ ...r, egg: val }));
                }}
                style={{ width: '48px', padding: '0.25rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(251, 191, 36, 0.5)', borderRadius: '6px', color: '#fbbf24', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveGuestRates}
              disabled={savingRates}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                color: '#fff',
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {savingRates ? 'Saving...' : 'Save Prices'}
            </button>
            {ratesSavedToast && (
              <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>✓ Saved!</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
          {members.map((member, idx) => {
            const key = member.id || member.user_id;
            const entry = monthlyEntries[key] || { total_meals: 45.0, guest_veg: 0, guest_fish: 0, guest_meat: 0, guest_egg: 0, guest_charge: 0, is_manual_charge: false };
            const memberDisplayName = member.name || member.user?.name || member.email;
            const computedCharge = entry.is_manual_charge ? (entry.guest_charge || 0) : calcAutoCharge(entry, guestRates);

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

                {/* Candidate Guest Meals Counter (Veg, Fish, Meat, Egg) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#34d399' }}>Veg:</span>
                    <input
                      type="number"
                      min="0"
                      value={entry.guest_veg || ''}
                      placeholder="0"
                      onChange={(e) => updateGuestCount(key, 'guest_veg', e.target.value)}
                      style={{ width: '38px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', textAlign: 'center' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#60a5fa' }}>Fish:</span>
                    <input
                      type="number"
                      min="0"
                      value={entry.guest_fish || ''}
                      placeholder="0"
                      onChange={(e) => updateGuestCount(key, 'guest_fish', e.target.value)}
                      style={{ width: '38px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', textAlign: 'center' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#f87171' }}>Meat:</span>
                    <input
                      type="number"
                      min="0"
                      value={entry.guest_meat || ''}
                      placeholder="0"
                      onChange={(e) => updateGuestCount(key, 'guest_meat', e.target.value)}
                      style={{ width: '38px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', textAlign: 'center' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>Egg:</span>
                    <input
                      type="number"
                      min="0"
                      value={entry.guest_egg || ''}
                      placeholder="0"
                      onChange={(e) => updateGuestCount(key, 'guest_egg', e.target.value)}
                      style={{ width: '38px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', textAlign: 'center' }}
                    />
                  </div>

                  {/* Total Guest Charge Input + Auto Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>Charge ({curr}):</span>
                    <input
                      type="number"
                      min="0"
                      value={computedCharge > 0 ? computedCharge : ''}
                      placeholder="Auto"
                      onChange={(e) => updateGuestChargeInput(key, e.target.value)}
                      style={{ width: '58px', padding: '0.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px', color: '#fbbf24', fontSize: '0.75rem', textAlign: 'right', fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      title="Click to reset to Auto calculation"
                      onClick={() => updateGuestChargeInput(key, null)}
                      style={{
                        background: entry.is_manual_charge ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        border: `1px solid ${entry.is_manual_charge ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                        color: entry.is_manual_charge ? '#f87171' : '#34d399',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        borderRadius: '4px',
                        padding: '0.15rem 0.35rem',
                        cursor: 'pointer'
                      }}
                    >
                      {entry.is_manual_charge ? 'Manual' : 'Auto'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
          {trackerError && (
            <span style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 600 }}>
              ⚠️ {trackerError}
            </span>
          )}
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
    </div>
  );
}
