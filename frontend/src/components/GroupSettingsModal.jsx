import React, { useState } from 'react';
import { api } from '../services/api';
import { Settings, UserPlus, Trash2, DollarSign, Sliders, Shield, UserCheck } from 'lucide-react';

export default function GroupSettingsModal({ group, onClose, onGroupUpdated, currentUserId }) {
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'deposits', 'rules'
  
  // Add member
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberUpi, setMemberUpi] = useState('');
  const [memberRole, setInviteRole] = useState('MEMBER');
  const [memberDeposit, setInviteDeposit] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Update deposits
  const [depositMemberId, setDepositMemberId] = useState(group?.members[0]?.id || group?.members[0]?.user_id || '');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositOperation, setDepositOperation] = useState('ADD'); // 'ADD' or 'SET'
  const [updatingDeposit, setUpdatingDeposit] = useState(false);

  // Meal Weights & Guest Rates
  const [bWeight, setBWeight] = useState(group?.settings?.breakfast_weight ?? 0.5);
  const [lWeight, setLWeight] = useState(group?.settings?.lunch_weight ?? 1.0);
  const [dWeight, setDWeight] = useState(group?.settings?.dinner_weight ?? 1.0);
  const [vegRate, setVegRate] = useState(group?.settings?.guest_rates?.veg ?? 40.0);
  const [fishRate, setFishRate] = useState(group?.settings?.guest_rates?.fish ?? 50.0);
  const [meatRate, setMeatRate] = useState(group?.settings?.guest_rates?.meat ?? 75.0);
  const [savingWeights, setSavingWeights] = useState(false);

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberName.trim() && !memberEmail.trim()) {
      alert('Please enter a member name or email');
      return;
    }
    setAddingMember(true);
    try {
      await api.addMember(group.id, {
        name: memberName.trim() || undefined,
        email: memberEmail.trim() || undefined,
        phone: memberPhone.trim() || undefined,
        upi_id: memberUpi.trim() || undefined,
        role: memberRole,
        initial_deposit: parseFloat(memberDeposit) || 0.0
      });
      setMemberName('');
      setMemberEmail('');
      setMemberPhone('');
      setMemberUpi('');
      setInviteDeposit('');
      if (onGroupUpdated) onGroupUpdated();
      alert('Member added successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) < 0) return;
    setUpdatingDeposit(true);
    try {
      await api.updateDeposit(group.id, {
        member_id: depositMemberId,
        user_id: depositMemberId,
        amount: parseFloat(depositAmount),
        operation: depositOperation
      });
      setDepositAmount('');
      if (onGroupUpdated) onGroupUpdated();
      alert(`Deposit ${depositOperation === 'ADD' ? 'added' : 'updated'} successfully!`);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingDeposit(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingWeights(true);
    try {
      await api.updateGroup(group.id, {
        settings: {
          ...group.settings,
          breakfast_weight: parseFloat(bWeight),
          lunch_weight: parseFloat(lWeight),
          dinner_weight: parseFloat(dWeight),
          guest_rates: {
            veg: parseFloat(vegRate),
            fish: parseFloat(fishRate),
            meat: parseFloat(meatRate)
          }
        }
      });
      if (onGroupUpdated) onGroupUpdated();
      alert('Group rules & guest rates updated successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingWeights(false);
    }
  };

  const handleRemoveMember = async (identifier) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await api.removeMember(group.id, identifier);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>⚙️ {group.name} Settings</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('members')}
            className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            Members ({group.members?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`btn ${activeTab === 'deposits' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            Manage Deposits / Marketing
          </button>
          {group.group_type === 'MESS' && (
            <button
              onClick={() => setActiveTab('rules')}
              className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Meal & Guest Rates
            </button>
          )}
        </div>

        {/* 1. MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            {/* Quick Add Member Form (No mandatory registration!) */}
            <form onSubmit={handleAddMember} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UserPlus size={16} color="#3b82f6" /> Quick Add Member (No account required)
                </h4>
                <span className="badge badge-settled" style={{ fontSize: '0.65rem' }}>Instant Calculation</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Member Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Biswajit Da, Atanu Da"
                    className="form-input"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Role</label>
                  <select
                    className="form-select"
                    value={memberRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Advance Deposit ({curr})</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    className="form-input"
                    value={memberDeposit}
                    onChange={(e) => setInviteDeposit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>UPI ID for Settlements (Optional)</label>
                  <input
                    type="text"
                    placeholder="name@okaxis / name@upi"
                    className="form-input"
                    value={memberUpi}
                    onChange={(e) => setMemberUpi(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Email / Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="email@example.com or phone"
                    className="form-input"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button type="submit" disabled={addingMember} className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
                  {addingMember ? 'Adding...' : '+ Add Member to Group'}
                </button>
              </div>
            </form>

            {/* Members List */}
            <h5 style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Current Group Members ({group.members?.length || 0})
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
              {group.members?.map(m => {
                const displayName = m.name || m.user?.name || m.email || 'Member';
                const isVirtual = m.is_virtual === 'true' || !m.user_id;

                return (
                  <div key={m.id || m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>{displayName}</strong>
                        {isVirtual ? (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            Virtual Member
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            Registered User
                          </span>
                        )}
                        <span className="badge badge-settled" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                          {m.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.15rem' }}>
                        Advance Deposit: {curr}{m.initial_deposit?.toFixed(0) || 0} {m.upi_id ? `• UPI: ${m.upi_id}` : ''}
                      </div>
                    </div>
                    {m.user_id !== currentUserId && (
                      <button 
                        onClick={() => handleRemoveMember(m.id || m.user_id)} 
                        title="Remove member"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.35rem' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. DEPOSITS TAB */}
        {activeTab === 'deposits' && (
          <form onSubmit={handleUpdateDeposit} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem' }}>
              💰 Add Advance Deposit / Marketing Cash
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Record monthly advance money given to the manager (e.g. ₹500, ₹1000, ₹2000).
            </p>
            <div className="form-group">
              <label className="form-label">Select Candidate / Member</label>
              <select
                className="form-select"
                value={depositMemberId}
                onChange={(e) => setDepositMemberId(e.target.value)}
              >
                {group.members?.map(m => (
                  <option key={m.id || m.user_id} value={m.id || m.user_id}>
                    {m.name || m.user?.name || m.email} (Current deposit: {curr}{m.initial_deposit})
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Action</label>
                <select
                  className="form-select"
                  value={depositOperation}
                  onChange={(e) => setDepositOperation(e.target.value)}
                >
                  <option value="ADD">➕ Add to Existing Deposit</option>
                  <option value="SET">📝 Set Exact Deposit Amount</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount ({curr})</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 1000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={updatingDeposit} className="btn btn-primary" style={{ width: '100%' }}>
              {updatingDeposit ? 'Updating...' : 'Save Deposit'}
            </button>
          </form>
        )}

        {/* 3. RULES & WEIGHTS TAB */}
        {activeTab === 'rules' && (
          <form onSubmit={handleSaveSettings} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem' }}>
              ⚖️ Mess Meal Rules & Guest Meal Rates
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Define meal weights for candidates and standard guest meal prices (Veg, Fish, Meat).
            </p>

            <h5 style={{ fontSize: '0.8rem', color: '#60a5fa', marginBottom: '0.5rem' }}>Meal Attendance Multipliers</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Breakfast Unit</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  value={bWeight}
                  onChange={(e) => setBWeight(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lunch Unit</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  value={lWeight}
                  onChange={(e) => setLWeight(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dinner Unit</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  value={dWeight}
                  onChange={(e) => setDWeight(e.target.value)}
                  required
                />
              </div>
            </div>

            <h5 style={{ fontSize: '0.8rem', color: '#fbbf24', marginBottom: '0.5rem' }}>Guest Meal Rates ({curr})</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Veg Guest Meal</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  value={vegRate}
                  onChange={(e) => setVegRate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fish Guest Meal</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  value={fishRate}
                  onChange={(e) => setFishRate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Meat Guest Meal</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  value={meatRate}
                  onChange={(e) => setMeatRate(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={savingWeights} className="btn btn-primary" style={{ width: '100%' }}>
              {savingWeights ? 'Saving...' : 'Save Settings & Rates'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
