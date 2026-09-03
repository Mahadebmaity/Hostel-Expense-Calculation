import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import MetricCards from '../components/MetricCards';
import MessMealTracker from '../components/MessMealTracker';
import ExpenseList from '../components/ExpenseList';
import SettlementEngine from '../components/SettlementEngine';
import AnalyticsCharts from '../components/AnalyticsCharts';
import AddExpenseModal from '../components/AddExpenseModal';
import GroupSettingsModal from '../components/GroupSettingsModal';
import AdminPanel from '../components/AdminPanel';
import WorkflowGuide from '../components/WorkflowGuide';
import { 
  Building2, 
  PlusCircle, 
  RefreshCw, 
  LayoutDashboard, 
  Utensils, 
  Receipt, 
  PieChart, 
  Sparkles,
  Crown,
  UserPlus,
  BookOpen,
  Plane,
  Home,
  Sliders,
  Settings
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'meals', 'expenses', 'settle', 'analytics'

  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showQuickAddMemberModal, setShowQuickAddMemberModal] = useState(false);

  // Quick Add Member Form
  const [quickMemberName, setQuickMemberName] = useState('');
  const [quickMemberDeposit, setQuickMemberDeposit] = useState('');
  const [quickMemberRole, setQuickMemberRole] = useState('MEMBER');
  const [quickMemberUpi, setQuickMemberUpi] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // New Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('MESS');
  const [newGroupDeposit, setNewGroupDeposit] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 1. Fetch user groups & restore last active group per user account
  const loadGroups = async (selectGroupId = null) => {
    try {
      const list = await api.getGroups();
      setGroups(list);
      if (list.length > 0) {
        const storageKey = user?.id ? `last_selected_group_${user.id}` : 'last_selected_group';
        const savedGroupId = selectGroupId || localStorage.getItem(storageKey);
        const toSelect = list.find(g => g.id === savedGroupId) || list[0];
        setSelectedGroup(toSelect);
        if (toSelect) {
          localStorage.setItem(storageKey, toSelect.id);
        }
      } else {
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user?.id]);

  // 2. Fetch data for selected group
  const refreshGroupData = async () => {
    if (!selectedGroup) return;
    try {
      const [bal, exp, ana, grpDetails] = await Promise.all([
        api.getGroupBalances(selectedGroup.id),
        api.getExpenses(selectedGroup.id),
        api.getExpenseAnalytics(selectedGroup.id),
        api.getGroup(selectedGroup.id)
      ]);
      setBalances(bal);
      setExpenses(exp);
      setAnalytics(ana);
      setSelectedGroup(grpDetails);
    } catch (err) {
      console.error('Failed to load group details', err);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      refreshGroupData();
    }
  }, [selectedGroup?.id]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const cleanName = newGroupName.trim();
    if (!cleanName) return;

    if (groups.some(g => g.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      alert(`A group named "${cleanName}" already exists. Please choose a different group name.`);
      return;
    }

    setCreatingGroup(true);
    try {
      const created = await api.createGroup({
        name: cleanName,
        group_type: newGroupType,
        initial_deposit: parseFloat(newGroupDeposit) || 0.0
      });
      setNewGroupName('');
      setNewGroupDeposit('');
      setShowNewGroupModal(false);
      await loadGroups(created.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleQuickAddMember = async (e) => {
    e.preventDefault();
    if (!quickMemberName.trim()) return;
    setAddingMember(true);
    try {
      await api.addMember(selectedGroup.id, {
        name: quickMemberName.trim(),
        role: quickMemberRole,
        upi_id: quickMemberUpi.trim() || undefined,
        initial_deposit: parseFloat(quickMemberDeposit) || 0.0
      });
      setQuickMemberName('');
      setQuickMemberDeposit('');
      setQuickMemberUpi('');
      setShowQuickAddMemberModal(false);
      await refreshGroupData();
      alert('Member added successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading Mess & Expense Manager...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isMess = selectedGroup?.group_type === 'MESS';
  const isTrip = selectedGroup?.group_type === 'TRIP';
  const isFlat = selectedGroup?.group_type === 'FLATMATES';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        groups={groups}
        selectedGroup={selectedGroup}
        onSelectGroup={(g) => {
          setSelectedGroup(g);
          if (user?.id && g?.id) {
            localStorage.setItem(`last_selected_group_${user.id}`, g.id);
          }
        }}
        onOpenNewGroup={() => setShowNewGroupModal(true)}
        onOpenSettings={() => setShowGroupSettings(true)}
        onGroupDeleted={() => loadGroups()}
        activeTab={activeTab}
        onSwitchTab={(t) => setActiveTab(t)}
      />

      {/* Main Container */}
      <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '1.5rem 1.25rem', flex: 1 }}>
        {/* If Admin tab is active */}
        {activeTab === 'admin' ? (
          <AdminPanel 
            onSelectGroup={(g) => {
              setSelectedGroup(g);
              setActiveTab('overview');
            }}
            currentGroupId={selectedGroup?.id}
            onGroupDeleted={() => loadGroups()}
          />
        ) : !selectedGroup ? (
          <>
            <WorkflowGuide 
              group={null}
              onSwitchTab={(t) => setActiveTab(t)}
              onOpenAddExpense={() => setShowAddExpense(true)}
              onOpenAddMember={() => setShowQuickAddMemberModal(true)}
              onOpenSettings={() => setShowGroupSettings(true)}
              onOpenNewGroup={() => setShowNewGroupModal(true)}
            />
            <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '500px', margin: '2rem auto' }}>
              <Building2 size={48} color="#3b82f6" style={{ marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Groups Found</h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                Create your first Hostel Mess, Flatmate group, or Trip Splitter to start managing expenses.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setShowNewGroupModal(true)} className="btn btn-primary">
                  <PlusCircle size={16} /> Create New Group
                </button>
                {user?.is_admin && (
                  <button onClick={() => setActiveTab('admin')} className="btn btn-secondary">
                    <Crown size={16} color="#ffd700" /> Open Admin Portal
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Interactive Workflow Guide right below navbar */}
            <WorkflowGuide 
              group={selectedGroup}
              onSwitchTab={(t) => setActiveTab(t)}
              onOpenAddExpense={() => setShowAddExpense(true)}
              onOpenAddMember={() => setShowQuickAddMemberModal(true)}
              onOpenSettings={() => setShowGroupSettings(true)}
              onOpenNewGroup={() => setShowNewGroupModal(true)}
            />

            {/* Group Banner / Quick Actions Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.1rem 1.4rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                    {selectedGroup.name}
                  </h2>
                  <span className="badge badge-category" style={{ fontSize: '0.72rem' }}>
                    {isMess ? '🏨 College/Hostel Mess' : (isTrip ? '✈️ Tour & Travel Split' : '🏠 Flatmate Living')}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  {selectedGroup.members?.length || 0} Members • Currency: {selectedGroup.currency || 'INR'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowQuickAddMemberModal(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                >
                  <UserPlus size={15} color="#38bdf8" /> + Add Member (No account needed)
                </button>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
                >
                  <PlusCircle size={15} /> + Add Expense
                </button>
                <button
                  onClick={() => setShowGroupSettings(true)}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.7rem' }}
                  title="Group Settings"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>

            {/* Top Metric Cards */}
            <MetricCards balances={balances} currentUserId={user?.id} />

            {/* Navigation Tabs */}
            <div className="tabs-nav-bar" style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              marginBottom: '1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '0.75rem',
              whiteSpace: 'nowrap'
            }}>
              <button
                onClick={() => setActiveTab('overview')}
                className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
              >
                <LayoutDashboard size={15} /> Overview & Khatabook
              </button>

              {isMess && (
                <button
                  onClick={() => setActiveTab('meals')}
                  className={`btn ${activeTab === 'meals' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
                >
                  <Utensils size={15} /> Meal Attendance Chart
                </button>
              )}

              <button
                onClick={() => setActiveTab('expenses')}
                className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
              >
                <Receipt size={15} /> Expenses Feed ({expenses.length})
              </button>

              <button
                onClick={() => setActiveTab('settle')}
                className={`btn ${activeTab === 'settle' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
              >
                <Sparkles size={15} /> {isMess ? 'Score Board & Khatabook' : 'Settle-Up Matrix'}
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
              >
                <PieChart size={15} /> Analytics
              </button>

              {user?.is_admin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    background: activeTab === 'admin' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'rgba(139, 92, 246, 0.12)',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                    color: '#f8fafc',
                    marginLeft: 'auto'
                  }}
                >
                  <Crown size={15} color="#ffd700" /> Admin & Users Directory
                </button>
              )}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'overview' && (
              <>
                <SettlementEngine
                  group={selectedGroup}
                  balances={balances}
                  currentUserId={user?.id}
                  onSettlementCompleted={refreshGroupData}
                />

                {isMess && (
                  <MessMealTracker group={selectedGroup} onMealUpdated={refreshGroupData} />
                )}

                <ExpenseList
                  group={selectedGroup}
                  expenses={expenses}
                  onExpenseDeleted={refreshGroupData}
                  onOpenAddExpense={() => setShowAddExpense(true)}
                  currentUserId={user?.id}
                />
              </>
            )}

            {activeTab === 'meals' && isMess && (
              <MessMealTracker group={selectedGroup} onMealUpdated={refreshGroupData} />
            )}

            {activeTab === 'expenses' && (
              <ExpenseList
                group={selectedGroup}
                expenses={expenses}
                onExpenseDeleted={refreshGroupData}
                onOpenAddExpense={() => setShowAddExpense(true)}
                currentUserId={user?.id}
              />
            )}

            {activeTab === 'settle' && (
              <SettlementEngine
                group={selectedGroup}
                balances={balances}
                currentUserId={user?.id}
                onSettlementCompleted={refreshGroupData}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsCharts analytics={analytics} currency={selectedGroup.currency} />
            )}
          </>
        )}
      </div>

      {/* Quick Add Member Modal */}
      {showQuickAddMemberModal && selectedGroup && (
        <div className="modal-backdrop" onClick={() => setShowQuickAddMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                  <UserPlus size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Quick Add Member</h3>
              </div>
              <button onClick={() => setShowQuickAddMemberModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleQuickAddMember}>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1rem' }}>
                Add flatmates or mess candidates instantly by name. They do not need an email or login account to be included in meal sheets, deposits, and score board calculations.
              </p>

              <div className="form-group">
                <label className="form-label">Member / Candidate Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Biswajit Da, Atanu Da, Samar Da"
                  className="form-input"
                  value={quickMemberName}
                  onChange={(e) => setQuickMemberName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={quickMemberRole}
                    onChange={(e) => setQuickMemberRole(e.target.value)}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Advance Deposit ({selectedGroup.currency || '₹'})</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000"
                    className="form-input"
                    value={quickMemberDeposit}
                    onChange={(e) => setQuickMemberDeposit(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">UPI ID for Settlements (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. name@okaxis / name@upi"
                  className="form-input"
                  value={quickMemberUpi}
                  onChange={(e) => setQuickMemberUpi(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowQuickAddMemberModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={addingMember} className="btn btn-primary">
                  {addingMember ? 'Adding...' : '+ Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && selectedGroup && (
        <AddExpenseModal
          group={selectedGroup}
          onClose={() => setShowAddExpense(false)}
          onExpenseAdded={refreshGroupData}
        />
      )}

      {/* Group Settings Modal */}
      {showGroupSettings && selectedGroup && (
        <GroupSettingsModal
          group={selectedGroup}
          onClose={() => setShowGroupSettings(false)}
          onGroupUpdated={refreshGroupData}
          onGroupDeleted={() => loadGroups()}
          currentUserId={user?.id}
        />
      )}

      {/* Create New Group Modal */}
      {showNewGroupModal && (
        <div className="modal-backdrop" onClick={() => setShowNewGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>🏠 Create New Group</h3>
              <button onClick={() => setShowNewGroupModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vivekananda Mess 2026, Flat 402, Goa Trip 2026"
                  className="form-input"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Group Type</label>
                <select
                  className="form-select"
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value)}
                >
                  <option value="MESS">🏨 College / Hostel Mess (Establishment, Meal Rate & Scoreboard)</option>
                  <option value="FLATMATES">🏠 Flatmates / Roommates (Rent, Gas, WiFi, Water Split)</option>
                  <option value="TRIP">✈️ Tour & Travel Plan (Hotel, Cab, Tickets Split)</option>
                  <option value="PERSONAL">👥 Personal / Friends Shared</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Your Initial Advance Deposit (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1000"
                  className="form-input"
                  value={newGroupDeposit}
                  onChange={(e) => setNewGroupDeposit(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowNewGroupModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creatingGroup} className="btn btn-primary">
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
