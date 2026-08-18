import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Users, 
  Building2, 
  CreditCard, 
  Utensils, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  Phone, 
  QrCode, 
  RefreshCw, 
  ArrowUpRight,
  CheckCircle2,
  Crown
} from 'lucide-react';

export default function AdminPanel({ onSelectGroup, currentGroupId }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL, ADMIN, USER
  const [actionLoading, setActionLoading] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, groupsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getGroups()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setGroups(groupsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleAdmin = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to change admin privileges for ${userName}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.toggleAdminRole(userId);
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.upi_id && u.upi_id.toLowerCase().includes(searchQuery.toLowerCase()));

    if (roleFilter === 'ADMIN') return matchesSearch && u.is_admin;
    if (roleFilter === 'USER') return matchesSearch && !u.is_admin;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <RefreshCw size={28} className="spin" color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading Admin Portal & User Directory...</p>
        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      {/* Superadmin Header Banner */}
      <div className="glass-panel" style={{
        padding: '1.5rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.12)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
          }}>
            <Crown size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                System Administration & Users Directory
              </h2>
              <span style={{
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px'
              }}>
                SUPERADMIN ACCESS
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.83rem', marginTop: '0.2rem' }}>
              Real-time audit of all registered accounts, platform spending metrics, and full group management.
            </p>
          </div>
        </div>

        <button 
          onClick={loadAdminData} 
          className="btn btn-secondary" 
          style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Registered Users</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats?.total_users || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            Across all hostel & group rooms
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Active Groups</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats?.total_groups || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            Mess, Flatmate & Trip hubs
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Expenses Processed</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            ₹{stats?.total_expenses_amount?.toLocaleString('en-IN') || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            {stats?.total_expenses_count || 0} recorded invoices & receipts
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ec4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Mess Meals</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <Utensils size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats?.total_meals_units || 0} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>units</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            {stats?.total_meal_records || 0} daily attendance entries
          </div>
        </div>
      </div>

      {/* All Groups Quick Switcher Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={18} color="#60a5fa" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              All System Groups ({groups.length})
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Click to inspect any mess or hostel group
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {groups.map((grp) => {
            const isSelected = grp.id === currentGroupId;
            return (
              <div
                key={grp.id}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1rem' }}>
                      {grp.group_type === 'MESS' ? '🏨' : grp.group_type === 'TRIP' ? '✈️' : '🏠'}
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#f8fafc' }}>{grp.name}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>Type: <strong>{grp.group_type}</strong></span>
                    <span>•</span>
                    <span>Currency: <strong>{grp.currency}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectGroup(grp)}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={13} /> Active Group
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={13} /> View / Manage
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Users Directory Table Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={19} color="#c084fc" /> Registered Users Directory ({filteredUsers.length})
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.2rem' }}>
              View who has signed up, their login emails, contact details, and their linked mess groups.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search user, email, UPI..."
                className="form-input"
                style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', fontSize: '0.8rem', paddingBlock: '0.45rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '0.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {['ALL', 'ADMIN', 'USER'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  style={{
                    border: 'none',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: roleFilter === role ? '#3b82f6' : 'transparent',
                    color: roleFilter === role ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>User Profile</th>
                <th style={{ padding: '0.75rem 1rem' }}>Contact & UPI</th>
                <th style={{ padding: '0.75rem 1rem' }}>Platform Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Joined Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Joined Groups</th>
                <th style={{ padding: '0.75rem 1rem' }}>Activity</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Admin Privileges</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No users matching search query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}>
                    {/* User Profile */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: u.is_admin ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          flexShrink: 0
                        }}>
                          {u.name ? u.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc' }}>{u.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact & UPI */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {u.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#cbd5e1', fontSize: '0.75rem' }}>
                            <Phone size={12} color="#60a5fa" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>No phone</span>
                        )}

                        {u.upi_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontSize: '0.75rem' }}>
                            <QrCode size={12} />
                            <span>{u.upi_id}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>No UPI</span>
                        )}
                      </div>
                    </td>

                    {/* Platform Role */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {u.is_admin ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(139, 92, 246, 0.2)',
                          color: '#c084fc',
                          border: '1px solid rgba(139, 92, 246, 0.4)',
                          borderRadius: '12px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          <Crown size={12} /> ADMIN
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#94a3b8',
                          borderRadius: '12px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}>
                          USER
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={12} />
                        <span>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                    </td>

                    {/* Joined Groups */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {u.groups && u.groups.length > 0 ? (
                          u.groups.map((g) => (
                            <span
                              key={g.group_id}
                              style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                color: '#60a5fa',
                                borderRadius: '6px',
                                padding: '0.15rem 0.45rem',
                                fontSize: '0.7rem',
                                fontWeight: 500
                              }}
                            >
                              {g.group_name} ({g.role})
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>No groups yet</span>
                        )}
                      </div>
                    </td>

                    {/* Activity */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ color: '#34d399' }}>Paid: ₹{u.total_expenses_paid?.toLocaleString('en-IN') || '0.00'}</span>
                        <span style={{ color: '#94a3b8' }}>Meals: {u.total_meals_consumed || 0} units</span>
                      </div>
                    </td>

                    {/* Admin Privileges Toggle */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleAdmin(u.id, u.name)}
                        disabled={actionLoading}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.72rem',
                          color: u.is_admin ? '#f87171' : '#c084fc',
                          borderColor: u.is_admin ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'
                        }}
                      >
                        {u.is_admin ? 'Demote to User' : 'Make Admin'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
