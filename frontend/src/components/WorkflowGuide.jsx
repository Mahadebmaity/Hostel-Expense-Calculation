import React, { useState } from 'react';
import { 
  Compass, 
  Utensils, 
  Receipt, 
  QrCode, 
  UserPlus, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Plane, 
  Home, 
  Users, 
  FileText, 
  HelpCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function WorkflowGuide({ 
  group, 
  onSwitchTab, 
  onOpenAddExpense, 
  onOpenAddMember, 
  onOpenSettings,
  onOpenNewGroup 
}) {
  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem('workflow_guide_expanded') !== 'false';
  });
  
  // Allow user to preview any workflow type even if current group is different
  const currentType = group?.group_type || 'MESS';
  const [selectedWorkflowType, setSelectedWorkflowType] = useState(currentType);

  // Sync with group type when group changes
  React.useEffect(() => {
    if (group?.group_type) {
      setSelectedWorkflowType(group.group_type);
    }
  }, [group?.group_type]);

  const toggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    localStorage.setItem('workflow_guide_expanded', String(nextState));
  };

  const workflowConfigs = {
    MESS: {
      badge: '🏨 Hostel & Mess Workflow',
      color: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      description: 'মেস ম্যানেজার ও মেম্বারদের জন্য দৈনন্দিন মিল ট্র্যাকিং, বাজার খরচ, মাসি ও ফিক্সড বিল বিভাজন এবং অটোমেটিক মিল রেট হিসাবের নির্দেশিকা।',
      steps: [
        {
          step: 1,
          title: 'মেম্বার ও অ্যাডভান্স যোগ করুন',
          sub: 'Add Members & Deposit',
          desc: 'মেসে থাকা সব বর্ডার/মেম্বারদের নাম ও তাদের দেওয়া প্রাথমিক অ্যাডভান্স (Deposit) যোগ করুন। ম্যানেজারের UPI ID সেট করা আবশ্যক।',
          actionText: '+ মেম্বার যোগ করুন',
          actionIcon: <UserPlus size={13} />,
          onClick: onOpenAddMember
        },
        {
          step: 2,
          title: 'মিল কাউন্ট ও গেস্ট মিল এন্ট্রি',
          sub: 'Daily / Monthly Meals',
          desc: '"Daily Meals" ট্যাবে গিয়ে মেম্বারদের দৈনিক বা এককালীন মাসিক মিল কাউন্ট দিন। স্পেশাল ফিস্ট (মাছ/মাংস/ডিম) থাকলে গেস্ট মিল হিসেবে রেকর্ড করুন।',
          actionText: '🍽️ মিল ট্র্যাকার খুলুন',
          actionIcon: <Utensils size={13} />,
          onClick: () => onSwitchTab('meals')
        },
        {
          step: 3,
          title: 'বাজার ও ফিক্সড খরচ রেকর্ড',
          sub: 'Bazar & Establishment',
          desc: 'মাসি/বাবুর্চি, গ্যাস, খবরের কাগজ ও দৈনিক বাজার খরচ "+ Add Expense" দিয়ে এন্ট্রি করুন। বাজার ও ফিক্সড চার্জ আলাদাভাবে মিল রেটে ভাগ হবে।',
          actionText: '+ খরচ এন্ট্রি করুন',
          actionIcon: <Receipt size={13} />,
          onClick: onOpenAddExpense
        },
        {
          step: 4,
          title: 'খাতাবুক ব্যালেন্স, QR পে ও PDF',
          sub: 'Score Board & UPI Dues',
          desc: '"Settle Dues" ট্যাবে গিয়ে প্রত্যেকের অটোমেটিক মিল রেট ও বাকি বিল দেখুন, ইনস্ট্যান্ট UPI QR কোডে পেমেন্ট নিন এবং অডিট PDF ডাউনলোড করুন।',
          actionText: '💳 ব্যালেন্স শিট ও QR পে',
          actionIcon: <QrCode size={13} />,
          onClick: () => onSwitchTab('settle')
        }
      ]
    },
    TRIP: {
      badge: '✈️ Tour & Trip Splitter Workflow',
      color: '#06b6d4',
      bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(6, 182, 212, 0.35)',
      description: 'ভ্রমণসঙ্গীদের জন্য হোটেল, ক্যাব, ফ্লাইট/ট্রেন টিকিট, রেস্তোরাঁ ও অ্যাক্টিভিটি বিল ভাগাভাগি এবং ট্রিপ শেষে মিনিমাম ট্রানজেকশনে সেটেলমেন্ট।',
      steps: [
        {
          step: 1,
          title: 'ট্রিপের বন্ধুদের যোগ করুন',
          sub: 'Add Trip Members',
          desc: 'ট্যুরে যারা যাচ্ছেন তাদের নাম যোগ করুন। কেউ যদি আগে থেকেই ট্রিপ ফান্ডে অ্যাডভান্স টাকা দিয়ে থাকে তা এন্ট্রি করুন।',
          actionText: '+ বন্ধু যোগ করুন',
          actionIcon: <UserPlus size={13} />,
          onClick: onOpenAddMember
        },
        {
          step: 2,
          title: 'হোটেল, ক্যাব ও টিকিট বিল এন্ট্রি',
          sub: 'Record Trip Expenses',
          desc: 'কে কোন বিল দিয়েছে তা সিলেক্ট করুন এবং সবাই সমানভাবে ভাগ করবে নাকি নির্দিষ্ট বন্ধুরা ভাগ করবে (Equal / Exact / Percentage) তা বেছে নিন।',
          actionText: '+ ট্রিপ খরচ যোগ করুন',
          actionIcon: <Receipt size={13} />,
          onClick: onOpenAddExpense
        },
        {
          step: 3,
          title: 'অ্যালগরিদমিক মিনিমাম সেটেলমেন্ট',
          sub: 'Simplified Cashflow',
          desc: '"Settle Dues" ট্যাবে যান। আমাদের গ্রাফ অপটিমাইজেশন অ্যালগরিদম স্বয়ংক্রিয়ভাবে সর্বনিম্ন সংখ্যক ট্রানজেকশনে কে কাকে কত দেবে বের করে দেবে।',
          actionText: '💳 সেটেলমেন্ট ম্যাট্রিক্স',
          actionIcon: <QrCode size={13} />,
          onClick: () => onSwitchTab('settle')
        },
        {
          step: 4,
          title: 'ইনস্ট্যান্ট UPI পেমেন্ট ও রিপোর্ট',
          sub: 'Scan QR & Clear',
          desc: 'যাকে টাকা দিতে হবে তার কার্ডে "Settle QR" এ ক্লিক করে PhonePe, GPay বা Paytm দিয়ে পেমেন্ট করুন এবং ট্রিপ অডিট রিপোর্ট ডাউনলোড করুন।',
          actionText: '📄 রিপোর্ট ডাউনলোড',
          actionIcon: <FileText size={13} />,
          onClick: () => onSwitchTab('settle')
        }
      ]
    },
    FLATMATES: {
      badge: '🏠 Flatmates & Roommates Workflow',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(16, 185, 129, 0.35)',
      description: 'রুমমেট ও ফ্ল্যাটমেটদের জন্য বাড়িভাড়া, ওয়াইফাই, ইলেকট্রিসিটি বিল, কাজের মাসি ও গ্রোসারি শেয়ারিং এর সহজ গাইড।',
      steps: [
        {
          step: 1,
          title: 'রুমমেটদের তালিকা তৈরি করুন',
          sub: 'Add All Flatmates',
          desc: 'ফ্ল্যাটের সব সদস্যের নাম ও UPI ID যোগ করুন যাতে প্রতি মাসের শেষে সরাসরি QR কোডে তাদের পাওনা টাকা মেটানো যায়।',
          actionText: '+ রুমমেট যোগ করুন',
          actionIcon: <UserPlus size={13} />,
          onClick: onOpenAddMember
        },
        {
          step: 2,
          title: 'মাসিক ইউটিলিটি ও গ্রোসারি এন্ট্রি',
          sub: 'Rent, WiFi, Electricity',
          desc: 'রুম রেন্ট, কাজের মাসির বেতন, কারেন্ট বা ওয়াইফাই বিল এন্ট্রি করুন। কেউ যদি একা কোনো জিনিস কিনে থাকে তবে নির্দিষ্ট মেম্বারদের মাঝে ভাগ করুন।',
          actionText: '+ ফ্ল্যাট খরচ এন্ট্রি',
          actionIcon: <Receipt size={13} />,
          onClick: onOpenAddExpense
        },
        {
          step: 3,
          title: 'মাসিক শেয়ার ও কার কত বাকি দেখুন',
          sub: 'View Net Balances',
          desc: 'ওভারভিউ ও অ্যানালিটিক্স চার্টে দেখুন এ মাসে কার কত শেয়ার পড়েছে এবং কে বেশি বা কম টাকা খরচ করেছে।',
          actionText: '📊 ওভারভিউ দেখুন',
          actionIcon: <Sparkles size={13} />,
          onClick: () => onSwitchTab('overview')
        },
        {
          step: 4,
          title: 'হিসাব ক্লিয়ার ও PDF স্ন্যাপশট',
          sub: 'UPI Settle & Archive',
          desc: 'মাসের শেষে সবার নেট হিসাব দেখে UPI QR দিয়ে ক্লিয়ার করুন এবং "Save Monthly Scoreboard" এ ক্লিক করে ইতিহাস সেভ রাখুন।',
          actionText: '💳 হিসাব মেটান',
          actionIcon: <QrCode size={13} />,
          onClick: () => onSwitchTab('settle')
        }
      ]
    },
    PERSONAL: {
      badge: '👥 Friends & Outing Split Workflow',
      color: '#a855f7',
      bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(168, 85, 247, 0.35)',
      description: 'বন্ধুদের সাথে হ্যাংআউট, রেস্টুরেন্ট পার্টি, উপহার বা যেকোনো ব্যক্তিগত খরচের হিসাব দ্রুত ভাগ করে নেওয়ার সহজ নির্দেশিকা।',
      steps: [
        {
          step: 1,
          title: 'বন্ধুদের গ্রুপ তৈরি করুন',
          sub: 'Add Friends Group',
          desc: 'আউটিং বা পার্টির বন্ধুদের নাম যুক্ত করুন। কোনো রেজিস্ট্রেশন ছাড়াই শুধু নাম দিয়ে ভার্চুয়াল মেম্বার যোগ করা যায়।',
          actionText: '+ বন্ধু যোগ করুন',
          actionIcon: <UserPlus size={13} />,
          onClick: onOpenAddMember
        },
        {
          step: 2,
          title: 'পার্টি বা আউটিং বিল স্প্লিট',
          sub: 'Split Exact / Equal',
          desc: 'রেস্তোরাঁ বা ফুড বিল এন্ট্রি করার সময় Equal (সমান ভাগ), Exact (নির্দিষ্ট টাকা) বা Percentage (শতাংশ) হিসেবে বিল স্প্লিট করুন।',
          actionText: '+ বিল যোগ করুন',
          actionIcon: <Receipt size={13} />,
          onClick: onOpenAddExpense
        },
        {
          step: 3,
          title: 'কে কত পাবে বা দেবে দেখুন',
          sub: 'Live Debts Matrix',
          desc: '"Settle Dues" ট্যাবে প্রতিটি বন্ধুর নেট পাওনা ও দেনা স্বয়ংক্রিয়ভাবে ক্যালকুলেট করা থাকে।',
          actionText: '💳 ব্যালেন্স চেক করুন',
          actionIcon: <QrCode size={13} />,
          onClick: () => onSwitchTab('settle')
        },
        {
          step: 4,
          title: 'ইনস্ট্যান্ট QR কোডে পেমেন্ট ক্লিয়ার',
          sub: 'Direct UPI Pay',
          desc: '"Settle QR" বোতামে ক্লিক করলেই তৈরি হবে UPI QR কোড ও ডিপ-লিঙ্ক। পেমেন্ট শেষ হলে "Mark Settled" করে হিসাব বন্ধ করুন।',
          actionText: '⚡ ১-ক্লিকে সেটেল',
          actionIcon: <CheckCircle2 size={13} />,
          onClick: () => onSwitchTab('settle')
        }
      ]
    }
  };

  const activeConfig = workflowConfigs[selectedWorkflowType] || workflowConfigs.MESS;

  return (
    <div 
      style={{
        background: activeConfig.bgGradient,
        border: `1px solid ${activeConfig.borderColor}`,
        borderRadius: '16px',
        padding: isExpanded ? '1.25rem 1.4rem' : '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Workflow Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '0.45rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Compass size={20} color={activeConfig.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {activeConfig.badge}
              </h3>
              <span style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(255, 255, 255, 0.06)', 
                color: '#cbd5e1', 
                padding: '0.15rem 0.5rem', 
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Step-by-Step Interactive Guide
              </span>
            </div>
            {!isExpanded && (
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem', margin: 0 }}>
                {activeConfig.description}
              </p>
            )}
          </div>
        </div>

        {/* Right Controls: Type Selector & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Quick Workflow Type Pills */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {[
              { type: 'MESS', label: '🏨 Mess' },
              { type: 'TRIP', label: '✈️ Tour' },
              { type: 'FLATMATES', label: '🏠 Flat' },
              { type: 'PERSONAL', label: '👥 Friends' }
            ].map(tab => (
              <button
                key={tab.type}
                onClick={() => setSelectedWorkflowType(tab.type)}
                style={{
                  background: selectedWorkflowType === tab.type ? activeConfig.color : 'transparent',
                  color: selectedWorkflowType === tab.type ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: selectedWorkflowType === tab.type ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={toggleExpand}
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? (
              <>
                <span>Hide Guide</span> <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Show Guide</span> <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Step-by-Step Interactive Workflow */}
      {isExpanded && (
        <div style={{ marginTop: '1.15rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.4' }}>
            {activeConfig.description}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.85rem'
          }}>
            {activeConfig.steps.map((st) => (
              <div
                key={st.step}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Step Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: activeConfig.color,
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 10px ${activeConfig.color}80`
                    }}>
                      {st.step}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      Step {st.step} of 4
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.15rem' }}>
                    {st.title}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: activeConfig.color, fontWeight: 600, display: 'block', marginBottom: '0.45rem' }}>
                    {st.sub}
                  </span>

                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: '1.35' }}>
                    {st.desc}
                  </p>
                </div>

                {/* Direct Action Button */}
                {st.onClick && (
                  <button
                    onClick={st.onClick}
                    className="btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${activeConfig.color}50`,
                      color: '#f8fafc',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = activeConfig.color;
                      e.currentTarget.style.borderColor = activeConfig.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = `${activeConfig.color}50`;
                    }}
                  >
                    {st.actionIcon} {st.actionText} <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
