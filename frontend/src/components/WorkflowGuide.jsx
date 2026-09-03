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
  ArrowRight,
  CheckCircle2,
  Languages,
  Globe,
  AlertCircle
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

  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_workflow_lang') || 'BN'; // 'BN' | 'EN'
  });

  const [showNoMembersAlert, setShowNoMembersAlert] = useState(false);

  const handleStepAction = (stepNumber, originalAction) => {
    const memberCount = group?.members?.length || 0;
    // Step 1 is "Add Member" - always allowed
    if (stepNumber > 1 && memberCount === 0) {
      setShowNoMembersAlert(true);
      return;
    }
    if (originalAction) {
      originalAction();
    }
  };
  
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

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('app_workflow_lang', newLang);
  };

  const workflows = {
    MESS: {
      color: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      BN: {
        badge: '🏨 মেস ও হোস্টেল ম্যানেজমেন্ট গাইড',
        tag: 'স্টেপ-বাই-স্টেপ গাইড',
        description: 'মেস ম্যানেজার ও বর্ডারদের জন্য মিল ট্র্যাকিং, বাজার খরচ, মাসি ও ফিক্সড বিল বিভাজন এবং অটোমেটিক মিল রেট হিসাবের নির্দেশিকা।',
        steps: [
          {
            step: 1,
            title: 'মেম্বার ও অ্যাডভান্স যোগ করুন',
            sub: 'Add Members & Deposit',
            desc: 'মেসের সব বর্ডারদের নাম ও তাদের দেওয়া প্রাথমিক অ্যাডভান্স (Deposit) যোগ করুন। ম্যানেজারের UPI ID সেট করা আবশ্যক।',
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
      EN: {
        badge: '🏨 Hostel & Mess Workflow Guide',
        tag: 'Step-by-Step Interactive Guide',
        description: 'Complete workflow for Mess Managers & Boarders: meal tracking, daily bazar marketing, cook/gas fixed charges, and automated meal rate calculations.',
        steps: [
          {
            step: 1,
            title: 'Add Members & Advance Deposit',
            sub: 'Add Boarders & Manager UPI',
            desc: 'Add boarder names and their advance mess deposits. Ensure the Mess Manager has configured their UPI ID to receive dues.',
            actionText: '+ Add Member',
            actionIcon: <UserPlus size={13} />,
            onClick: onOpenAddMember
          },
          {
            step: 2,
            title: 'Track Daily Meals & Guest Charges',
            sub: 'Daily / Monthly Meal Records',
            desc: 'Navigate to "Daily Meals" to record daily breakfast/lunch/dinner attendance or monthly summary. Log guest meals (fish/meat/egg) accurately.',
            actionText: '🍽️ Open Meal Tracker',
            actionIcon: <Utensils size={13} />,
            onClick: () => onSwitchTab('meals')
          },
          {
            step: 3,
            title: 'Log Daily Bazar & Fixed Bills',
            sub: 'Bazar & Establishment Costs',
            desc: 'Record cook wages (Masi), gas cylinder, newspaper, and daily marketing bills with "+ Add Expense". Fixed bills and grocery split automatically.',
            actionText: '+ Add Expense',
            actionIcon: <Receipt size={13} />,
            onClick: onOpenAddExpense
          },
          {
            step: 4,
            title: 'View Scoreboard, Pay QR & Export PDF',
            sub: 'Khatabook Balance & QR Pay',
            desc: 'Open "Settle Dues" to inspect dynamic meal rate, net dues/refunds, collect payments via Instant UPI QR codes, and export audit PDF.',
            actionText: '💳 View Scoreboard & QR',
            actionIcon: <QrCode size={13} />,
            onClick: () => onSwitchTab('settle')
          }
        ]
      }
    },
    TRIP: {
      color: '#06b6d4',
      bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(6, 182, 212, 0.35)',
      BN: {
        badge: '✈️ ট্যুর ও ট্রাভেল স্প্লিটার গাইড',
        tag: 'স্টেপ-বাই-স্টেপ গাইড',
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
            sub: 'Simplified Cashflow Matrix',
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
      EN: {
        badge: '✈️ Tour & Travel Splitter Guide',
        tag: 'Step-by-Step Interactive Guide',
        description: 'Seamlessly split hotels, flights, cab rides, restaurant food, and activities among trip buddies with automated minimum cashflow settlements.',
        steps: [
          {
            step: 1,
            title: 'Add Trip Buddies & Advance Pool',
            sub: 'Add Travel Members',
            desc: 'Add all members joining the trip. Record initial trip deposits if members pooled advance funds together.',
            actionText: '+ Add Trip Member',
            actionIcon: <UserPlus size={13} />,
            onClick: onOpenAddMember
          },
          {
            step: 2,
            title: 'Record Hotel, Cab & Ticket Bills',
            sub: 'Log Shared Trip Expenses',
            desc: 'Log expenses under "+ Add Expense". Choose who paid and split equally or customize specific subsets (Equal / Exact / Percentage).',
            actionText: '+ Add Trip Expense',
            actionIcon: <Receipt size={13} />,
            onClick: onOpenAddExpense
          },
          {
            step: 3,
            title: 'Optimal Minimum Cashflow Matrix',
            sub: 'Graph Simplification Engine',
            desc: 'Visit "Settle Dues" to let our debt-simplification graph engine compute the fewest possible peer-to-peer transfers.',
            actionText: '💳 Settlement Matrix',
            actionIcon: <QrCode size={13} />,
            onClick: () => onSwitchTab('settle')
          },
          {
            step: 4,
            title: 'Scan Instant UPI QR & Export PDF',
            sub: 'Direct UPI Pay & Audit Report',
            desc: 'Click "Settle QR" to pay creditors directly via GPay/PhonePe/Paytm and download a complete audit PDF for the trip.',
            actionText: '📄 Export Audit PDF',
            actionIcon: <FileText size={13} />,
            onClick: () => onSwitchTab('settle')
          }
        ]
      }
    },
    FLATMATES: {
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(16, 185, 129, 0.35)',
      BN: {
        badge: '🏠 ফ্ল্যাটমেট ও রুমমেট শেয়ারিং গাইড',
        tag: 'স্টেপ-বাই-স্টেপ গাইড',
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
      EN: {
        badge: '🏠 Flatmates & Roommates Guide',
        tag: 'Step-by-Step Interactive Guide',
        description: 'Effortless expense management for roommates: split apartment rent, high-speed WiFi, electricity bills, maid charges, and groceries.',
        steps: [
          {
            step: 1,
            title: 'Add Flatmate Roster & UPI IDs',
            sub: 'Roommate Profiles',
            desc: 'Add all roommates living in the apartment. Ensure everyone adds their UPI ID for instant end-of-month QR settlements.',
            actionText: '+ Add Roommate',
            actionIcon: <UserPlus size={13} />,
            onClick: onOpenAddMember
          },
          {
            step: 2,
            title: 'Log Rent, Utilities & Shared Groceries',
            sub: 'Rent, Electricity, Maid',
            desc: 'Record monthly rent, electricity bills, maid charges, and groceries. Easily split equally or designate custom shares.',
            actionText: '+ Add Shared Expense',
            actionIcon: <Receipt size={13} />,
            onClick: onOpenAddExpense
          },
          {
            step: 3,
            title: 'Track Net Dues & Consumption Shares',
            sub: 'Analytics & Live Balances',
            desc: 'Check live dashboard analytics and category charts to see individual spending habits and cumulative debt balances.',
            actionText: '📊 View Balances',
            actionIcon: <Sparkles size={13} />,
            onClick: () => onSwitchTab('overview')
          },
          {
            step: 4,
            title: 'Clear Dues via QR & Freeze Monthly Sheet',
            sub: 'UPI Settle & Khatabook Freeze',
            desc: 'Settle up using Instant UPI QR codes and freeze the monthly score board into the group permanent digital khatabook.',
            actionText: '💳 Settle & Freeze',
            actionIcon: <QrCode size={13} />,
            onClick: () => onSwitchTab('settle')
          }
        ]
      }
    },
    PERSONAL: {
      color: '#a855f7',
      bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(15, 23, 42, 0.75))',
      borderColor: 'rgba(168, 85, 247, 0.35)',
      BN: {
        badge: '👥 ফ্রেন্ডস ও আউটিং স্প্লিট গাইড',
        tag: 'স্টেপ-বাই-স্টেপ গাইড',
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
      },
      EN: {
        badge: '👥 Friends & Outings Split Guide',
        tag: 'Step-by-Step Interactive Guide',
        description: 'Split dinner parties, hangout bills, gifts, and personal expenses with friends quickly, transparently, and friction-free.',
        steps: [
          {
            step: 1,
            title: 'Add Friends to Group',
            sub: 'No Forced Signups',
            desc: 'Add friends by name instantly—no mandatory account signup or app downloads required for virtual members.',
            actionText: '+ Add Friend',
            actionIcon: <UserPlus size={13} />,
            onClick: onOpenAddMember
          },
          {
            step: 2,
            title: 'Split Restaurant & Party Bills',
            sub: 'Exact, Percentage or Equal',
            desc: 'Enter outing bills and split equally, by exact item amounts, or by custom percentage shares.',
            actionText: '+ Add Outing Bill',
            actionIcon: <Receipt size={13} />,
            onClick: onOpenAddExpense
          },
          {
            step: 3,
            title: 'Check Who Owes What',
            sub: 'Live Transparent Debts',
            desc: 'Navigate to "Settle Dues" to see transparent net balances and exact settlement breakdown for every friend.',
            actionText: '💳 Check Balances',
            actionIcon: <QrCode size={13} />,
            onClick: () => onSwitchTab('settle')
          },
          {
            step: 4,
            title: 'Instant Scan & Pay via UPI',
            sub: '1-Click Settlement',
            desc: 'Click "Settle QR" to generate a direct payment deep link/QR, pay via PhonePe/GPay, and mark as settled.',
            actionText: '⚡ 1-Click Settle',
            actionIcon: <CheckCircle2 size={13} />,
            onClick: () => onSwitchTab('settle')
          }
        ]
      }
    }
  };

  const currentWorkflow = workflows[selectedWorkflowType] || workflows.MESS;
  const activeContent = currentWorkflow[lang] || currentWorkflow.BN;

  return (
    <div 
      style={{
        background: currentWorkflow.bgGradient,
        border: `1px solid ${currentWorkflow.borderColor}`,
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
            <Compass size={20} color={currentWorkflow.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {activeContent.badge}
              </h3>
              <span style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(255, 255, 255, 0.06)', 
                color: '#cbd5e1', 
                padding: '0.15rem 0.5rem', 
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {activeContent.tag}
              </span>
            </div>
            {!isExpanded && (
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem', margin: 0 }}>
                {activeContent.description}
              </p>
            )}
          </div>
        </div>

        {/* Right Controls: Language Selector, Type Selector & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Language Switcher Pill (বাংলা / English) */}
          <div style={{ 
            display: 'flex', 
            background: 'rgba(0, 0, 0, 0.45)', 
            borderRadius: '8px', 
            padding: '0.2rem', 
            border: '1px solid rgba(255, 255, 255, 0.12)',
            alignItems: 'center',
            gap: '0.15rem'
          }}>
            <Globe size={13} style={{ marginLeft: '0.35rem', marginRight: '0.15rem', color: '#94a3b8' }} />
            <button
              type="button"
              onClick={() => handleLanguageChange('BN')}
              style={{
                background: lang === 'BN' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                color: lang === 'BN' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: lang === 'BN' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="বাংলা ভার্সন"
            >
              বাংলা 🇮🇳
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('EN')}
              style={{
                background: lang === 'EN' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                color: lang === 'EN' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: lang === 'EN' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="English Version"
            >
              English 🇬🇧
            </button>
          </div>

          {/* Quick Workflow Type Selector */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {[
              { type: 'MESS', label: lang === 'BN' ? '🏨 মেস' : '🏨 Mess' },
              { type: 'TRIP', label: lang === 'BN' ? '✈️ ট্যুর' : '✈️ Tour' },
              { type: 'FLATMATES', label: lang === 'BN' ? '🏠 ফ্ল্যাট' : '🏠 Flat' },
              { type: 'PERSONAL', label: lang === 'BN' ? '👥 ফ্রেন্ডস' : '👥 Friends' }
            ].map(tab => (
              <button
                key={tab.type}
                onClick={() => setSelectedWorkflowType(tab.type)}
                style={{
                  background: selectedWorkflowType === tab.type ? currentWorkflow.color : 'transparent',
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
                <span>{lang === 'BN' ? 'গাইড বন্ধ করুন' : 'Hide Guide'}</span> <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>{lang === 'BN' ? 'গাইড দেখুন' : 'Show Guide'}</span> <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Smooth Collapsible Step-by-Step Interactive Workflow */}
      <div
        style={{
          maxHeight: isExpanded ? '1200px' : '0px',
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? 'translateY(0px)' : 'translateY(-8px)',
          marginTop: isExpanded ? '1.15rem' : '0px',
          overflow: 'hidden',
          pointerEvents: isExpanded ? 'auto' : 'none',
          transition: 'max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-top 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.4' }}>
          {activeContent.description}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.85rem'
        }}>
            {activeContent.steps.map((st) => (
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
                      background: currentWorkflow.color,
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 10px ${currentWorkflow.color}80`
                    }}>
                      {st.step}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      {lang === 'BN' ? `ধাপ ${st.step} / ৪` : `Step ${st.step} of 4`}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.15rem' }}>
                    {st.title}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: currentWorkflow.color, fontWeight: 600, display: 'block', marginBottom: '0.45rem' }}>
                    {st.sub}
                  </span>

                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: '1.35' }}>
                    {st.desc}
                  </p>
                </div>

                {/* Direct Action Button */}
                {st.onClick && (
                  <button
                    onClick={() => handleStepAction(st.step, st.onClick)}
                    className="btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${currentWorkflow.color}50`,
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
                      e.currentTarget.style.background = currentWorkflow.color;
                      e.currentTarget.style.borderColor = currentWorkflow.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = `${currentWorkflow.color}50`;
                    }}
                  >
                    {st.actionIcon} {st.actionText} <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 Dependency Alert Modal if trying to calculate with 0 members */}
        {showNoMembersAlert && (
          <div className="modal-backdrop" onClick={() => setShowNoMembersAlert(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '1.75rem 1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '2px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <AlertCircle size={28} color="#fbbf24" />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.4rem' }}>
                {lang === 'BN' ? '⚠️ আগে ১ম ধাপ (Step 1) সম্পন্ন করুন' : '⚠️ Please Complete Step 1 First'}
              </h3>

              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                <div style={{ marginBottom: '0.5rem', color: '#93c5fd', fontWeight: 600 }}>
                  {lang === 'BN' 
                    ? 'আপনার এই গ্রুপে বর্তমানে কোনো মেম্বার/বর্ডার যোগ করা নেই।' 
                    : 'There are currently no members in this group.'}
                </div>
                <div style={{ color: '#94a3b8' }}>
                  {lang === 'BN'
                    ? 'মিল রেকর্ড (Meal Tracker) বা ব্যালেন্স শিট (Scoreboard) দেখার আগে অনুগ্রহ করে মেম্বারদের নাম ও ডিপোজিট যোগ করুন।'
                    : 'Before tracking daily meals or viewing the score board, please add members/boarders to the group roster.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNoMembersAlert(false);
                    if (onOpenAddMember) onOpenAddMember();
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '160px', padding: '0.6rem 1rem' }}
                >
                  <UserPlus size={16} /> {lang === 'BN' ? '+ মেম্বার যোগ করুন (Step 1)' : '+ Add Members (Step 1)'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoMembersAlert(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1rem' }}
                >
                  {lang === 'BN' ? 'বুঝেছি' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}


