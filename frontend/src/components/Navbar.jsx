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
  Crown,
  Trash2,
  Sparkles,
  Sun,
  Moon,
  Eye
} from 'lucide-react';
import DemoCenterModal from './DemoCenterModal';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ 
  groups, 
  selectedGroup, 
  onSelectGroup, 
  onOpenNewGroup, 
  onOpenSettings,
  onGroupDeleted,
  activeTab,
  onSwitchTab
}) {
  const { user, logout, updateProfileState } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
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
        background: 'var(--bg-glass-card)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
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
            <h1 style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Mess & Expense Splitter
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Hostel • Trips • Flatmates</p>
          </div>
        </div>

        {/* Group Selector with Quick Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
          <div 
            onClick={() => setShowGroupDropdown(!showGroupDropdown)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '10px', 
              padding: '0.4rem 0.75rem',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedGroup ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {selectedGroup 
                ? `${selectedGroup.group_type === 'MESS' ? '🏨 ' : selectedGroup.group_type === 'TRIP' ? '✈️ ' : '🏠 '} ${selectedGroup.name}`
                : '🚫 Select Group'}
            </span>
            <ChevronDown size={14} color="var(--text-secondary)" style={{ transform: showGroupDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </div>

          {/* Custom Dropdown Menu with Quick Delete */}
          {showGroupDropdown && (
            <>
              {/* Invisible Overlay Backdrop to close on click outside */}
              <div 
                onClick={() => setShowGroupDropdown(false)} 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
              />
              
              <div 
                style={{
                  position: 'absolute',
                  top: '115%',
                  left: 0,
                  width: 'min(300px, calc(100vw - 1.5rem))',
                  maxWidth: 'calc(100vw - 1.5rem)',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-subtle)',
                  zIndex: 999,
                  padding: '0.5rem',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select or Delete Group
                </div>
                {groups && groups.length > 0 ? (
                  groups.map((g) => {
                    const isSelected = selectedGroup?.id === g.id;
                    const isDeleting = deletingGroupId === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          onSelectGroup(g);
                          setShowGroupDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                          cursor: 'pointer',
                          marginBottom: '4px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ 
                          fontSize: '0.83rem', 
                          fontWeight: isSelected ? 700 : 500, 
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap', 
                          flex: 1,
                          paddingRight: '0.5rem'
                        }}>
                          {g.group_type === 'MESS' ? '🏨 ' : g.group_type === 'TRIP' ? '✈️ ' : '🏠 '} {g.name}
                        </span>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`⚠️ ARE YOU SURE YOU WANT TO REMOVE/DELETE GROUP "${g.name}"?\n\n• If you are Admin: Permanently erases the group.\n• If you are User: Removes group from your account, keeping it intact for Admin.`)) {
                              setDeletingGroupId(g.id);
                              try {
                                await api.deleteGroup(g.id);
                                if (onGroupDeleted) onGroupDeleted(g.id);
                              } catch (err) {
                                alert(err.message);
                              } finally {
                                setDeletingGroupId(null);
                              }
                            }
                          }}
                          disabled={isDeleting}
                          title={`Delete "${g.name}"`}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '0.3rem 0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
                          }}
                        >
                          <Trash2 size={13} strokeWidth={2.5} color="#f87171" />
                          <span>Del</span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '0.8rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                    No groups found
                  </div>
                )}
              </div>
            </>
          )}

          <button onClick={onOpenNewGroup} className="btn btn-secondary" style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem' }} title="Create new group">
            <PlusCircle size={14} /> <span>New</span>
          </button>
          
          {selectedGroup && (
            <button onClick={onOpenSettings} className="btn btn-secondary" style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem' }} title="Group Settings & Members">
              <Settings size={14} /> <span>Settings</span>
            </button>
          )}
        </div>

        {/* Right Action Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {/* UPI Copy Badge (if available) */}
          {user?.upi_id && (
            <div onClick={copyUpi} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '20px',
              padding: '0.3rem 0.65rem',
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--accent-primary)'
            }} title="Click to copy your UPI ID">
              <QrCode size={12} />
              <span>{user.upi_id}</span>
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            </div>
          )}

          {/* Live Demos & Sample PDF Button */}
          <button
            onClick={() => setShowDemoModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.35))',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              borderRadius: '10px',
              padding: '0.35rem 0.65rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            title="Open 4 Demo Calculations & Sample PDF Generator"
          >
            <Sparkles size={13} color="#fbbf24" />
            <span>✨ Demos & PDF</span>
          </button>

          {/* Compact 3-Theme Icon Switcher (🌙 Night | ☀️ Light | 🕯️ Comfort) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-glass)',
            borderRadius: '10px',
            padding: '0.18rem',
            gap: '0.1rem'
          }}>
            <button
              type="button"
              onClick={() => setTheme('night')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme === 'night' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                color: theme === 'night' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '7px',
                padding: '0.3rem 0.45rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme === 'night' ? '0 2px 6px rgba(59, 130, 246, 0.4)' : 'none'
              }}
              title="🌙 Night Mode (Dark - Default)"
            >
              <Moon size={13} />
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme === 'light' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: theme === 'light' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '7px',
                padding: '0.3rem 0.45rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme === 'light' ? '0 2px 6px rgba(245, 158, 11, 0.4)' : 'none'
              }}
              title="☀️ Light Mode (Clean Studio)"
            >
              <Sun size={13} />
            </button>

            <button
              type="button"
              onClick={() => setTheme('comfort')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme === 'comfort' ? 'linear-gradient(135deg, #d97706, #92400e)' : 'transparent',
                color: theme === 'comfort' ? '#fef3c7' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '7px',
                padding: '0.3rem 0.45rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme === 'comfort' ? '0 2px 6px rgba(217, 119, 6, 0.4)' : 'none'
              }}
              title="🕯️ Eye Comfort Mode (Warm Amber)"
            >
              <Eye size={13} />
            </button>
          </div>

          {/* Admin Portal Switcher */}
          {user?.is_admin && (
            <button
              onClick={() => onSwitchTab && onSwitchTab('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: activeTab === 'admin' 
                  ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' 
                  : 'rgba(139, 92, 246, 0.16)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '10px',
                padding: '0.35rem 0.65rem',
                color: activeTab === 'admin' ? '#ffffff' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 700,
                boxShadow: activeTab === 'admin' ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              title="Open System Admin & Users Control Panel"
            >
              <Crown size={13} color="#ffd700" />
              <span>Admin</span>
            </button>
          )}

          {/* User Profile Pill */}
          <button
            onClick={() => setShowProfileModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              padding: '0.35rem 0.65rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            title="Edit profile & UPI ID"
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span>{user?.name?.split(' ')[0] || 'User'}</span>
          </button>

          {/* Logout Button */}
          <button 
            onClick={logout} 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.55rem', borderRadius: '8px' }} 
            title="Sign out of account"
          >
            <LogOut size={14} color="var(--text-muted)" />
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

      {/* 4-Scenario Live Demo & PDF Preview Modal */}
      <DemoCenterModal 
        isOpen={showDemoModal} 
        onClose={() => setShowDemoModal(false)} 
        initialType={selectedGroup?.group_type || 'MESS'}
      />
    </>
  );
}
