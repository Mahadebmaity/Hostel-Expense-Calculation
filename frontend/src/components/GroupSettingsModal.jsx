import React, { useState } from 'react';
import { api } from '../services/api';
import { Settings, UserPlus, Trash2, DollarSign, Sliders, Shield, UserCheck, AlertTriangle } from 'lucide-react';

export default function GroupSettingsModal({ group, onClose, onGroupUpdated, onGroupDeleted, currentUserId }) {
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'deposits', 'rules'
  
  // Add member
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberUpi, setMemberUpi] = useState('');
  const [memberRole, setInviteRole] = useState('MEMBER');
  const [memberDeposit, setInviteDeposit] = useState('');
  const [memberMktAmt, setMemberMktAmt] = useState('');
  const [memberMktDays, setMemberMktDays] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Update deposits & Marketing
  const [depositMemberId, setDepositMemberId] = useState(group?.members[0]?.id || group?.members[0]?.user_id || '');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMktAmt, setDepositMktAmt] = useState('');
  const [depositMktDays, setDepositMktDays] = useState('');
  const [depositOperation, setDepositOperation] = useState('ADD'); // 'ADD' or 'SET'
  const [updatingDeposit, setUpdatingDeposit] = useState(false);

  // Meal Weights & Guest Rates
  const [bWeight, setBWeight] = useState(group?.settings?.breakfast_weight ?? 0.5);
  const [lWeight, setLWeight] = useState(group?.settings?.lunch_weight ?? 1.0);
  const [dWeight, setDWeight] = useState(group?.settings?.dinner_weight ?? 1.0);
  const [vegRate, setVegRate] = useState(group?.settings?.guest_rates?.veg ?? 40.0);
  const [fishRate, setFishRate] = useState(group?.settings?.guest_rates?.fish ?? 50.0);
  const [meatRate, setMeatRate] = useState(group?.settings?.guest_rates?.meat ?? 75.0);
  const [eggRate, setEggRate] = useState(group?.settings?.guest_rates?.egg ?? 35.0);
  const [savingWeights, setSavingWeights] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  const handleDeleteGroup = async () => {
    const confirmName = window.prompt(`⚠️ ARE YOU SURE YOU WANT TO DELETE THIS GROUP?\n\nThis will permanently delete group '${group.name}' along with all expenses, meals, and member records.\n\nType the group name below to confirm:`);
    if (confirmName === null) return;
    if (confirmName.trim().toLowerCase() !== group.name.trim().toLowerCase()) {
      alert("Group name did not match. Deletion cancelled.");
      return;
    }

    setDeletingGroup(true);
    try {
      await api.deleteGroup(group.id);
      alert(`Group '${group.name}' has been successfully deleted.`);
      onClose();
      if (onGroupDeleted) onGroupDeleted(group.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingGroup(false);
    }
  };

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
        initial_deposit: parseFloat(memberDeposit) || 0.0,
        marketing_amount: parseFloat(memberMktAmt) || 0.0,
        marketing_days: parseFloat(memberMktDays) || 0.0
      });
      setMemberName('');
      setMemberEmail('');
      setMemberPhone('');
      setMemberUpi('');
      setInviteDeposit('');
      setMemberMktAmt('');
      setMemberMktDays('');
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
    setUpdatingDeposit(true);
    try {
      await api.updateDeposit(group.id, {
        member_id: depositMemberId,
        user_id: depositMemberId,
        amount: parseFloat(depositAmount) || 0.0,
        marketing_amount: depositMktAmt !== '' ? parseFloat(depositMktAmt) : undefined,
        marketing_days: depositMktDays !== '' ? parseFloat(depositMktDays) : undefined,
        operation: depositOperation
      });
      setDepositAmount('');
      setDepositMktAmt('');
      setDepositMktDays('');
      if (onGroupUpdated) onGroupUpdated();
      alert(`Deposit / Marketing ${depositOperation === 'ADD' ? 'added' : 'updated'} successfully!`);
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
            meat: parseFloat(meatRate),
            egg: parseFloat(eggRate)
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
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '620px', 
          width: '100%', 
          maxHeight: '88vh', 
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: '1.1rem',
          borderRadius: '16px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0, wordBreak: 'break-word' }}>
            ⚙️ {group.name} Settings
          </h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.06)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              color: '#94a3b8', 
              cursor: 'pointer', 
              fontSize: '1.1rem', 
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Headers with Wrap to ensure Danger Zone is always visible */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1.25rem', 
          borderBottom: '1px solid rgba(255,255,255,0.08)', 
          paddingBottom: '0.6rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('members')}
            className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', flexShrink: 0 }}
          >
            Members ({group.members?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`btn ${activeTab === 'deposits' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', flexShrink: 0 }}
          >
            Manage Marketing & Deposits
          </button>
          {group.group_type === 'MESS' && (
            <button
              onClick={() => setActiveTab('rules')}
              className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', flexShrink: 0 }}
            >
              Meal & Guest Rates
            </button>
          )}
          <button
            onClick={() => setActiveTab('danger')}
            className={`btn ${activeTab === 'danger' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.78rem',
              flexShrink: 0,
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              background: activeTab === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'transparent'
            }}
          >
            ⚠️ Danger Zone
          </button>
        </div>

        {/* 1. MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            {/* Quick Add Member Form */}
            <form onSubmit={handleAddMember} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <UserPlus size={16} color="#3b82f6" /> Quick Add Member (No account required)
                </h4>
                <span className="badge badge-settled" style={{ fontSize: '0.65rem' }}>Instant Calculation</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.55rem', marginBottom: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Member Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Biswajit Da"
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
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Advance ({curr})</label>
                  <input
                    type="number"
                    placeholder="1000"
                    className="form-input"
                    value={memberDeposit}
                    onChange={(e) => setInviteDeposit(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#34d399', display: 'block', marginBottom: '0.2rem' }}>Bazar Spent ({curr})</label>
                  <input
                    type="number"
                    placeholder="1500"
                    className="form-input"
                    value={memberMktAmt}
                    onChange={(e) => setMemberMktAmt(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#fbbf24', display: 'block', marginBottom: '0.2rem' }}>Mkt Days</label>
                  <input
                    type="number"
                    placeholder="2"
                    className="form-input"
                    value={memberMktDays}
                    onChange={(e) => setMemberMktDays(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>UPI ID for Settlements (Optional)</label>
                  <input
                    type="text"
                    placeholder="name@upi"
                    className="form-input"
                    value={memberUpi}
                    onChange={(e) => setMemberUpi(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Email / Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="email / phone"
                    className="form-input"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button type="submit" disabled={addingMember} className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', width: '100%' }}>
                  {addingMember ? 'Adding...' : '+ Add Member to Group'}
                </button>
              </div>
            </form>

            {/* Members List */}
            <h5 style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Current Group Members ({group.members?.length || 0})
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
              {group.members?.map(m => {
                const displayName = m.name || m.user?.name || m.email || 'Member';
                const isVirtual = m.is_virtual === 'true' || !m.user_id;
                const mktAmt = m.marketing_amount || 0;
                const mktDays = m.marketing_days || 0;

                return (
                  <div key={m.id || m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>{displayName}</strong>
                        {isVirtual ? (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            Virtual
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            Registered
                          </span>
                        )}
                        <span className="badge badge-settled" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                          {m.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.15rem' }}>
                        Deposit: {curr}{m.initial_deposit?.toFixed(0) || 0} {mktAmt > 0 ? `• Marketing: ${curr}${mktAmt.toFixed(0)} (${mktDays}d)` : ''} {m.upi_id ? `• UPI: ${m.upi_id}` : ''}
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

        {/* 2. DEPOSITS & MARKETING TAB */}
        {activeTab === 'deposits' && (
          <form onSubmit={handleUpdateDeposit} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.1rem', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.4rem' }}>
              💰 Manage Candidate Deposit & Marketing (Sabji / Fish)
            </h4>
            <p style={{ fontSize: '0.73rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: '1.3' }}>
              • <strong>Advance Deposit</strong>: Advance money given to Manager.<br/>
              • <strong>Bazar Marketing</strong>: Money spent on Bazar by candidate (added directly to Meal Charge calculation).
            </p>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label">Select Candidate / Member</label>
              <select
                className="form-select"
                value={depositMemberId}
                onChange={(e) => setDepositMemberId(e.target.value)}
              >
                {group.members?.map(m => (
                  <option key={m.id || m.user_id} value={m.id || m.user_id}>
                    {m.name || m.user?.name || m.email} (Deposit: {curr}{m.initial_deposit} | Marketing: {curr}{m.marketing_amount || 0})
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Action</label>
                <select
                  className="form-select"
                  value={depositOperation}
                  onChange={(e) => setDepositOperation(e.target.value)}
                >
                  <option value="ADD">➕ Add to Existing</option>
                  <option value="SET">📝 Set Exact Amounts</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Advance Deposit ({curr})</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 1000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#34d399' }}>Bazar Spent ({curr})</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 1500"
                  value={depositMktAmt}
                  onChange={(e) => setDepositMktAmt(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#fbbf24' }}>Mkt Days</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 2"
                  value={depositMktDays}
                  onChange={(e) => setDepositMktDays(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={updatingDeposit} className="btn btn-primary" style={{ width: '100%' }}>
              {updatingDeposit ? 'Updating...' : 'Save Deposit & Marketing Records'}
            </button>
          </form>
        )}

        {/* 3. RULES & WEIGHTS TAB */}
        {activeTab === 'rules' && (
          <form onSubmit={handleSaveSettings} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.1rem', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.4rem' }}>
              ⚖️ Mess Meal Rules & Guest Meal Rates
            </h4>
            <p style={{ fontSize: '0.73rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Define meal weights for candidates and standard guest meal prices (Veg, Fish, Meat, Egg).
            </p>

            <h5 style={{ fontSize: '0.8rem', color: '#60a5fa', marginBottom: '0.5rem' }}>Meal Attendance Multipliers</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Veg Guest</label>
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
                <label className="form-label">Fish Guest</label>
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
                <label className="form-label">Meat Guest</label>
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
              <div className="form-group">
                <label className="form-label">Egg Guest</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  value={eggRate}
                  onChange={(e) => setEggRate(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={savingWeights} className="btn btn-primary" style={{ width: '100%' }}>
              {savingWeights ? 'Saving...' : 'Save Settings & Rates'}
            </button>
          </form>
        )}

        {/* 4. DANGER ZONE TAB */}
        {activeTab === 'danger' && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.25rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', color: '#f87171' }}>
              <AlertTriangle size={20} />
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Delete Group & Clean All Records</h4>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.4' }}>
              Deleting <strong>{group.name}</strong> will permanently erase all candidate deposits, meal attendance sheets, expenses, settlement calculations, and monthly scoreboards linked to this group.
            </p>

            <button
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              style={{
                width: '100%',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: deletingGroup ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
              }}
            >
              <Trash2 size={16} />
              {deletingGroup ? 'Deleting Group...' : `Delete Group "${group.name}"`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
