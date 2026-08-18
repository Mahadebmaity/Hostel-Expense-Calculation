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
import { 
  Building2, 
  PlusCircle, 
  RefreshCw, 
  LayoutDashboard, 
  Utensils, 
  Receipt, 
  PieChart, 
  Sparkles 
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

  // New Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('MESS');
  const [newGroupDeposit, setNewGroupDeposit] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 1. Fetch user groups
  const loadGroups = async (selectGroupId = null) => {
    try {
      const list = await api.getGroups();
      setGroups(list);
      if (list.length > 0) {
        const toSelect = selectGroupId ? list.find(g => g.id === selectGroupId) : (selectedGroup || list[0]);
        setSelectedGroup(toSelect || list[0]);
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
    loadGroups();
  }, []);

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
    setCreatingGroup(true);
    try {
      const created = await api.createGroup({
        name: newGroupName,
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading Mess & Expense Manager...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        groups={groups}
        selectedGroup={selectedGroup}
        onSelectGroup={(g) => setSelectedGroup(g)}
        onOpenNewGroup={() => setShowNewGroupModal(true)}
        onOpenSettings={() => setShowGroupSettings(true)}
      />

      {/* Main Container */}
      <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '1.5rem 1.25rem', flex: 1 }}>
        {/* If no groups exist yet */}
        {!selectedGroup ? (
          <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '500px', margin: '4rem auto' }}>
            <Building2 size={48} color="#3b82f6" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Groups Found</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Create your first Hostel Mess, Flatmate group, or Trip Splitter to start managing expenses.
            </p>
            <button onClick={() => setShowNewGroupModal(true)} className="btn btn-primary">
              <PlusCircle size={16} /> Create New Group
            </button>
          </div>
        ) : (
          <>
            {/* Top Metric Cards */}
            <MetricCards balances={balances} currentUserId={user?.id} />

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              marginBottom: '1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '0.75rem'
            }}>
              <button
                onClick={() => setActiveTab('overview')}
                className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
              >
                <LayoutDashboard size={15} /> Overview & All
              </button>

              {selectedGroup.group_type === 'MESS' && (
                <button
                  onClick={() => setActiveTab('meals')}
                  className={`btn ${activeTab === 'meals' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
                >
                  <Utensils size={15} /> Daily Meal Tracker
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
                <Sparkles size={15} /> Settle-Up & Statement
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
              >
                <PieChart size={15} /> Analytics
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'overview' && (
              <>
                {selectedGroup.group_type === 'MESS' && (
                  <MessMealTracker group={selectedGroup} onMealUpdated={refreshGroupData} />
                )}
                <SettlementEngine
                  group={selectedGroup}
                  balances={balances}
                  currentUserId={user?.id}
                  onSettlementCompleted={refreshGroupData}
                />
                <ExpenseList
                  group={selectedGroup}
                  expenses={expenses}
                  onExpenseDeleted={refreshGroupData}
                  onOpenAddExpense={() => setShowAddExpense(true)}
                  currentUserId={user?.id}
                />
              </>
            )}

            {activeTab === 'meals' && selectedGroup.group_type === 'MESS' && (
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

      {/* MODALS */}
      {showAddExpense && selectedGroup && (
        <AddExpenseModal
          group={selectedGroup}
          onClose={() => setShowAddExpense(false)}
          onExpenseAdded={refreshGroupData}
        />
      )}

      {showGroupSettings && selectedGroup && (
        <GroupSettingsModal
          group={selectedGroup}
          onClose={() => setShowGroupSettings(false)}
          onGroupUpdated={refreshGroupData}
          currentUserId={user?.id}
        />
      )}

      {/* Create New Group Modal */}
      {showNewGroupModal && (
        <div className="modal-backdrop" onClick={() => setShowNewGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>🏠 Create New Group</h3>
              <button onClick={() => setShowNewGroupModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Engineers Mess, Manali Trip 2026, Flat 402"
                  className="form-input"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Group Purpose / Type</label>
                <select
                  className="form-select"
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value)}
                >
                  <option value="MESS">🏨 Hostel / Mess (Meal rate calculation & attendance)</option>
                  <option value="TRIP">✈️ Tour / Trip (Split bills with friends)</option>
                  <option value="FLATMATES">🏠 Flatmates / Roommates (Recurring bills & groceries)</option>
                  <option value="PERSONAL">👥 Family / Personal Shared</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Your Initial Advance Deposit (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2000"
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
