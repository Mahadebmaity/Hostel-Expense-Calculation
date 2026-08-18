import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Building2, 
  LogOut, 
  User as UserIcon, 
  QrCode, 
  Settings, 
  FileDown, 
  PlusCircle, 
  Check, 
  Copy,
  ChevronDown,
  Crown
} from 'lucide-react';

export default function Navbar({ 
  groups, 
  selectedGroup, 
  onSelectGroup, 
  onOpenNewGroup, 
  onOpenSettings,
  activeTab,
  onSwitchTab
}) {
  const { user, logout, updateProfileState } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [upiId, setUpiId] = useState(user?.upi_id || '');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name, upi_id: upiId });
      updateProfileState(updated);
      setShowProfileModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyUpi = () => {
    if (user?.upi_id) {
      navigator.clipboard.writeText(user.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 2rem',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Logo & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            padding: '0.55rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <Building2 size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Mess & Expense Splitter
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Hostel • Trips • Flatmates</p>
          </div>
        </div>

        {/* Group Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.25rem 0.5rem' }}>
            <select
              value={selectedGroup?.id || ''}
              onChange={(e) => {
                const found = groups.find(g => g.id === e.target.value);
                if (found) onSelectGroup(found);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                padding: '0.35rem 0.5rem',
                cursor: 'pointer'
              }}
            >
              {groups.map(g => (
                <option key={g.id} value={g.id} style={{ background: '#111827', color: '#fff' }}>
                  {g.group_type === 'MESS' ? '🏨 ' : g.group_type === 'TRIP' ? '✈️ ' : '🏠 '} {g.name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={onOpenNewGroup} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }} title="Create new group">
            <PlusCircle size={15} /> New Group
          </button>
          
          {selectedGroup && (
            <button onClick={onOpenSettings} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }} title="Group Settings & Members">
              <Settings size={15} /> Settings
            </button>
          )}
        </div>

        {/* User Profile & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* UPI Badge */}
          {user?.upi_id ? (
            <div onClick={copyUpi} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '20px',
              padding: '0.3rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#60a5fa'
            }} title="Click to copy your UPI ID">
              <QrCode size={13} />
              <span>{user.upi_id}</span>
              {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
            </div>
          ) : (
            <button 
              onClick={() => setShowProfileModal(true)} 
              className="badge badge-due" 
              style={{ cursor: 'pointer', border: 'none', padding: '0.35rem 0.75rem' }}
            >
              + Add UPI ID
            </button>
          )}

          {/* Admin Badge / Switcher */}
          {user?.is_admin && (
            <button
              onClick={() => onSwitchTab && onSwitchTab('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: activeTab === 'admin' 
                  ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' 
                  : 'rgba(139, 92, 246, 0.18)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '10px',
                padding: '0.35rem 0.75rem',
                color: '#f8fafc',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow: activeTab === 'admin' ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
                transition: 'all 0.2s'
              }}
              title="Open System Admin & Users Control Panel"
            >
              <Crown size={14} color="#ffd700" />
              <span>ADMIN PORTAL</span>
            </button>
          )}

          {/* Profile Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '0.4rem 0.75rem',
              color: '#f8fafc',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span>{user?.name?.split(' ')[0]}</span>
          </button>

          {/* Logout */}
          <button 
            onClick={logout} 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem', borderRadius: '8px' }} 
            title="Logout"
          >
            <LogOut size={16} color="#94a3b8" />
          </button>
        </div>
      </nav>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>👤 Edit Profile & UPI ID</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">UPI ID (For Instant Settle QR Codes)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Other members can scan a generated QR code or click a direct UPI link to transfer money to this ID.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowProfileModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
