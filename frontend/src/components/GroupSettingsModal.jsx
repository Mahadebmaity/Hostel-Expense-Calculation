import React, { useState } from 'react';
import { api } from '../services/api';
import { Settings, UserPlus, Trash2, DollarSign, Sliders, Shield } from 'lucide-react';

export default function GroupSettingsModal({ group, onClose, onGroupUpdated, currentUserId }) {
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'deposits', 'rules'
  
  // Add member
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteDeposit, setInviteDeposit] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Update deposits
  const [depositUserId, setDepositUserId] = useState(group?.members[0]?.user_id || '');
  const [depositAmount, setDepositAmount] = useState('');
  const [updatingDeposit, setUpdatingDeposit] = useState(false);

  // Meal Weights
  const [bWeight, setBWeight] = useState(group?.settings?.breakfast_weight ?? 0.5);
  const [lWeight, setLWeight] = useState(group?.settings?.lunch_weight ?? 1.0);
  const [dWeight, setDWeight] = useState(group?.settings?.dinner_weight ?? 1.0);
  const [savingWeights, setSavingWeights] = useState(false);

  const curr = group?.currency === 'INR' ? '₹' : (group?.currency || '₹');

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddingMember(true);
    try {
      await api.addMember(group.id, {
        email: inviteEmail,
        role: inviteRole,
        initial_deposit: parseFloat(inviteDeposit) || 0.0
      });
      setInviteEmail('');
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
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setUpdatingDeposit(true);
    try {
      await api.updateDeposit(group.id, {
        user_id: depositUserId,
        amount: parseFloat(depositAmount),
        operation: 'ADD'
      });
      setDepositAmount('');
      if (onGroupUpdated) onGroupUpdated();
      alert('Deposit added successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingDeposit(false);
    }
  };

  const handleSaveWeights = async (e) => {
    e.preventDefault();
    setSavingWeights(true);
    try {
      await api.updateGroup(group.id, {
        settings: {
          ...group.settings,
          breakfast_weight: parseFloat(bWeight),
          lunch_weight: parseFloat(lWeight),
          dinner_weight: parseFloat(dWeight)
        }
      });
      if (onGroupUpdated) onGroupUpdated();
      alert('Meal weights updated successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingWeights(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await api.removeMember(group.id, userId);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>⚙️ {group.name} Settings</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('members')}
            className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            Members ({group.members.length})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`btn ${activeTab === 'deposits' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            Manage Deposits
          </button>
          {group.group_type === 'MESS' && (
            <button
              onClick={() => setActiveTab('rules')}
              className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Meal Unit Weights
            </button>
          )}
        </div>

        {/* 1. MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            {/* Add Member Form */}
            <form onSubmit={handleAddMember} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserPlus size={15} color="#3b82f6" /> Add Registered Member by Email
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.65rem' }}>
                <input
                  type="email"
                  placeholder="user@example.com"
                  className="form-input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <select
                  className="form-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="MEMBER">Member</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <input
                  type="number"
                  placeholder="Deposit"
                  className="form-input"
                  value={inviteDeposit}
                  onChange={(e) => setInviteDeposit(e.target.value)}
                />
              </div>
              <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                <button type="submit" disabled={addingMember} className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                  {addingMember ? 'Adding...' : '+ Add Member'}
                </button>
              </div>
            </form>

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
              {group.members.map(m => (
                <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: '0.65rem 0.85rem', borderRadius: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem' }}>{m.user.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>{m.user.email}</span>
                    <div style={{ fontSize: '0.72rem', color: '#34d399' }}>
                      Deposit: {curr}{m.initial_deposit.toFixed(0)} • Role: {m.role}
                    </div>
                  </div>
                  {m.user_id !== currentUserId && (
                    <button onClick={() => handleRemoveMember(m.user_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. DEPOSITS TAB */}
        {activeTab === 'deposits' && (
          <form onSubmit={handleUpdateDeposit} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem' }}>
              💰 Add Advance Deposit / Mess Fund
            </h4>
            <div className="form-group">
              <label className="form-label">Select Member</label>
              <select
                className="form-select"
                value={depositUserId}
                onChange={(e) => setDepositUserId(e.target.value)}
              >
                {group.members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user.name} (Current deposit: {curr}{m.initial_deposit})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount to Add ({curr})</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 1500"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={updatingDeposit} className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem' }}>
              {updatingDeposit ? 'Updating...' : 'Add Deposit Amount'}
            </button>
          </form>
        )}

        {/* 3. RULES & WEIGHTS TAB */}
        {activeTab === 'rules' && (
          <form onSubmit={handleSaveWeights} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem' }}>
              ⚖️ Mess Meal Weight Multipliers
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Customize how many meal units are charged per meal consumed in this mess.
            </p>
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
            <button type="submit" disabled={savingWeights} className="btn btn-primary" style={{ width: '100%' }}>
              {savingWeights ? 'Saving Weights...' : 'Save Meal Rule Weights'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
