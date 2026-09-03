import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Download, 
  FileText, 
  Utensils, 
  Plane, 
  Home, 
  Users, 
  QrCode, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building,
  Globe
} from 'lucide-react';
import { api } from '../services/api';

export default function DemoCenterModal({ isOpen, onClose, initialType = 'MESS' }) {
  const [activeType, setActiveType] = useState(initialType);
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('app_workflow_lang') || 'BN');

  if (!isOpen) return null;

  const handleDownloadDemoPDF = async (type) => {
    setDownloading(true);
    try {
      await api.downloadDemoPDF(type);
    } catch (err) {
      alert(`Failed to download demo PDF: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const demoScenarios = {
    MESS: {
      title: lang === 'BN' ? '🏨 ১. হোস্টেল ও মেস ডেমো হিসাব' : '🏨 1. Hostel & Mess Demo Calculation',
      subtitle: lang === 'BN' ? 'হাতে লেখা খাতার ফর্মুলা • ডাইনামিক মিল রেট • গেস্ট মিল ও বাজার হিসাব' : 'Handwritten Khatabook Formula • Dynamic Meal Rate • Guest & Bazar Ledger',
      color: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(15, 23, 42, 0.85))',
      borderColor: 'rgba(59, 130, 246, 0.4)',
      summaryMetrics: [
        { label: lang === 'BN' ? 'মোট বাজার খরচ' : 'Total Bazar Spend', value: '₹13,850', color: '#34d399' },
        { label: lang === 'BN' ? 'ফিক্সড এস্টাব্লিশমেন্ট' : 'Fixed Est. (Masi/Gas)', value: '₹4,200', color: '#60a5fa' },
        { label: lang === 'BN' ? 'মোট খাওয়া মিল' : 'Total Eaten Meals', value: '210.0', color: '#fbbf24' },
        { label: lang === 'BN' ? 'অটোমেটিক মিল রেট' : 'Dynamic Meal Rate', value: '₹65.95 / meal', color: '#f43f5e' }
      ],
      scenarioStory: lang === 'BN'
        ? '💡 মেসের বাস্তব পরিস্থিতি: ৪ জন বর্ডারের মেস। সুভদীপ ম্যানেজার হিসেবে ₹৪,৫০০ বাজার করেছে এবং রান্নার মাসি (₹৩,০০০) ও গ্যাসের (₹৯৫০) ফিক্সড বিল পরিশোধ করা হয়েছে। রাহুল ও বিশ্বজিৎও নির্দিষ্ট দিন বাজার করেছে। মোট ২১০টি মিল খাওয়া হয়েছে, যার ওপর ভিত্তি করে স্বয়ংক্রিয় মিল রেট এসেছে ₹৬৫.৯৫/মিল।'
        : '💡 Realistic Scenario: A 4-boarder hostel mess. Subhadip (Manager) did ₹4,500 marketing. Fixed cook wages (₹3,000) and gas (₹950) were divided equally (₹1,050/head). A total of 210 meals were consumed, producing an exact dynamic meal rate of ₹65.95 per meal.',
      members: [
        { name: 'Subhadip Roy (Manager)', deposit: '₹4,000', mkt: '₹4,500 (8d)', meals: '56', guest: '+₹150', due: '₹4,893.20', paid: '₹8,500', net: '+₹3,606.80', status: 'Refund (Pawa Jabe)' },
        { name: 'Rahul Karmakar', deposit: '₹3,500', mkt: '₹3,200 (5d)', meals: '52', guest: '—', due: '₹4,479.40', paid: '₹6,700', net: '+₹2,220.60', status: 'Refund (Pawa Jabe)' },
        { name: 'Biswajit Das', deposit: '₹4,000', mkt: '₹6,150 (11d)', meals: '58', guest: '+₹220', due: '₹5,095.10', paid: '₹10,150', net: '+₹5,054.90', status: 'Refund (Pawa Jabe)' },
        { name: 'Joydeb Ghosh', deposit: '₹3,000', mkt: '₹0 (0d)', meals: '44', guest: '+₹75', due: '₹4,026.80', paid: '₹3,000', net: '-₹1,026.80', status: 'Due (Dite Habe)' }
      ],
      settlementPlan: [
        { payer: 'Joydeb Ghosh', payee: 'Biswajit Das', amount: '₹1,026.80', upi: 'biswajit@ybl', method: 'Instant UPI QR Scan' }
      ]
    },

    TRIP: {
      title: lang === 'BN' ? '✈️ ২. ট্যুর ও ট্রিপ স্প্লিটার ডেমো' : '✈️ 2. Tour & Trip Splitter Demo',
      subtitle: lang === 'BN' ? 'হোটেল, ক্যাব, ফ্লাইট টিকিট • মিনিমাম ক্যাশফ্লো সেটেলমেন্ট গ্রাফ' : 'Hotel, Flight, Cab & Dining • Minimum Cashflow Settlement Matrix',
      color: '#06b6d4',
      bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(15, 23, 42, 0.85))',
      borderColor: 'rgba(6, 182, 212, 0.4)',
      summaryMetrics: [
        { label: lang === 'BN' ? 'মোট ট্রিপ খরচ' : 'Total Trip Expense', value: '₹58,800', color: '#38bdf8' },
        { label: lang === 'BN' ? 'জনপ্রতি সমান শেয়ার' : 'Per Person Equal Share', value: '₹14,700', color: '#a78bfa' },
        { label: lang === 'BN' ? 'ভ্রমণকারী সদস্য' : 'Total Travelers', value: '4 Friends', color: '#34d399' },
        { label: lang === 'BN' ? 'সর্বনিম্ন ট্রানজেকশন' : 'Minimised Transfers', value: '3 Payments Only', color: '#fbbf24' }
      ],
      scenarioStory: lang === 'BN'
        ? '💡 গোয়া ট্রিপের বাস্তব পরিস্থিতি: ৪ বন্ধু গোয়া ঘুরতে গিয়ে রোহন ফ্লাইট ও ক্যাব (₹২৪,০০০) দিল, অনিক রিসোর্ট বুকিং (₹১৮,০০০) দিল, সায়ান স্কুবা ডাইভিং (₹৮,৮০০) দিল আর প্রীতম সি-ফুড ডিনার (₹৮,০০০) দিল। ট্রিপ শেষে জটিলভাবে ১২ বার টাকা না পাঠিয়ে আমাদের গ্রাফ অ্যালগরিদম মাত্র ৩টি সহজ পেমেন্টে পুরো ট্রিপ সেটেল করে দিয়েছে।'
        : '💡 Goa Trip Scenario: 4 friends went to Goa. Rohan paid Flights & Thar Cab (₹24,000), Anik paid Beach Resort (₹18,000), Sayan paid Scuba Sports (₹8,800), and Pritam paid Dinners (₹8,000). Instead of 12 confusing peer payments, our graph engine settled the entire trip with only 3 minimal transfers.',
      members: [
        { name: 'Rohan Sen (Flight & Cab)', spent: '₹24,000', deposit: '₹5,000', share: '₹14,700', net: '+₹14,300', status: 'To Receive (Pabe)' },
        { name: 'Anik Mukherjee (Beach Resort)', spent: '₹18,000', deposit: '₹5,000', share: '₹14,700', net: '+₹8,300', status: 'To Receive (Pabe)' },
        { name: 'Sayan Banerjee (Scuba Sports)', spent: '₹8,800', deposit: '₹5,000', share: '₹14,700', net: '-₹900', status: 'To Pay (Dite Habe)' },
        { name: 'Pritam Dutta (Seafood Dinners)', spent: '₹8,000', deposit: '₹5,000', share: '₹14,700', net: '-₹21,700', status: 'To Pay (Dite Habe)' }
      ],
      settlementPlan: [
        { payer: 'Pritam Dutta', payee: 'Rohan Sen', amount: '₹14,300.00', upi: 'rohan@okhdfcbank', method: 'Direct GPay/PhonePe' },
        { payer: 'Pritam Dutta', payee: 'Anik Mukherjee', amount: '₹7,400.00', upi: 'anik@icici', method: 'Direct GPay/PhonePe' },
        { payer: 'Sayan Banerjee', payee: 'Anik Mukherjee', amount: '₹900.00', upi: 'anik@icici', method: 'Direct GPay/PhonePe' }
      ]
    },

    FLATMATES: {
      title: lang === 'BN' ? '🏠 ৩. ফ্ল্যাটমেট ও রুমমেট শেয়ারিং ডেমো' : '🏠 3. Flatmates & Roommates Demo',
      subtitle: lang === 'BN' ? 'বাড়িভাড়া, কারেন্ট বিল, কাজের মাসির বেতন ও গ্রোসারি শেয়ারিং' : 'Apartment Rent, Electricity, WiFi, Maid & Shared Groceries',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.85))',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      summaryMetrics: [
        { label: lang === 'BN' ? 'মোট ফ্ল্যাটের খরচ' : 'Total Flat Living Cost', value: '₹36,900', color: '#34d399' },
        { label: lang === 'BN' ? 'জনপ্রতি শেয়ার' : 'Per Roommate Share', value: '₹12,300', color: '#60a5fa' },
        { label: lang === 'BN' ? 'মোট রুমমেট' : 'Flatmates', value: '3 Roommates', color: '#a78bfa' },
        { label: lang === 'BN' ? 'সেটেলমেন্ট মাধ্যম' : 'Settlement Mode', value: 'Direct QR Pay', color: '#fbbf24' }
      ],
      scenarioStory: lang === 'BN'
        ? '💡 ব্যাঙ্গালোর/কলকাতা ৩BHK ফ্ল্যাটের পরিস্থিতি: অয়ন বাড়িওয়ালার পুরো রেন্ট (₹২৪,০০০) দিয়েছে, সৌরভ কাজের মাসি ও ওয়াইফাই (₹৬,৫০০) দিয়েছে এবং দেবজিৎ ইলেকট্রিসিটি ও গ্রোসারি (₹৬,৪০০) দিয়েছে। মাসের শেষে সৌরভ ও দেবজিৎ সরাসরি অয়নকে তাদের অতিরিক্ত বাকি অংশ মিটিয়ে ব্যালেন্স শূন্য করে।'
        : '💡 3BHK Flat Scenario: Ayan paid the full house rent (₹24,000), Sourav paid the maid & WiFi bills (₹6,500), and Debjit paid electricity & shared groceries (₹6,400). At month end, Sourav and Debjit pay Ayan directly to settle all living expenses.',
      members: [
        { name: 'Ayan Chatterjee (Rent Payer)', spent: '₹24,000', share: '₹12,300', net: '+₹11,700', status: 'To Receive (Pabe)' },
        { name: 'Sourav Ganguly (Maid & WiFi)', spent: '₹6,500', share: '₹12,300', net: '-₹5,800', status: 'To Pay (Dite Habe)' },
        { name: 'Debjit Paul (Current & Grocery)', spent: '₹6,400', share: '₹12,300', net: '-₹5,900', status: 'To Pay (Dite Habe)' }
      ],
      settlementPlan: [
        { payer: 'Sourav Ganguly', payee: 'Ayan Chatterjee', amount: '₹5,800.00', upi: 'ayan@paytm', method: 'Instant Paytm/GPay' },
        { payer: 'Debjit Paul', payee: 'Ayan Chatterjee', amount: '₹5,900.00', upi: 'ayan@paytm', method: 'Instant Paytm/GPay' }
      ]
    },

    PERSONAL: {
      title: lang === 'BN' ? '👥 ৪. ফ্রেন্ডস ও পার্টি স্প্লিটার ডেমো' : '👥 4. Friends & Outing Split Demo',
      subtitle: lang === 'BN' ? 'রেস্তোরাঁ ডিনার, মুভি টিকিট ও ক্যাফে আড্ডা বিল ভাগাভাগি' : 'Dinner Buffet, IMAX Movies, Cafe Drinks & Instant QR Pay',
      color: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(15, 23, 42, 0.85))',
      borderColor: 'rgba(139, 92, 246, 0.4)',
      summaryMetrics: [
        { label: lang === 'BN' ? 'মোট আড্ডার খরচ' : 'Total Outing Spend', value: '₹8,400', color: '#c084fc' },
        { label: lang === 'BN' ? 'জনপ্রতি শেয়ার' : 'Equal Share', value: '₹2,100', color: '#60a5fa' },
        { label: lang === 'BN' ? 'অংশগ্রহণকারী বন্ধু' : 'Friends', value: '4 Friends', color: '#34d399' },
        { label: lang === 'BN' ? 'পেমেন্ট মেথড' : 'Payment Type', value: 'Instant UPI QR', color: '#fbbf24' }
      ],
      scenarioStory: lang === 'BN'
        ? '💡 উইকেন্ড আড্ডার পরিস্থিতি: অর্ণব সবার জন্য বারবিকিউ ডিনার (₹৪,৮০০) দিল, নীলাঞ্জন আইম্যাক্স মুভি টিকিট (₹২,০০০) দিল, তন্ময় ক্যাফে ও কোল্ড ড্রিংকস (₹১,৬০০) দিল এবং সুমন সরাসরি অংশগ্রহণ করল। আড্ডা শেষে সবাই অর্ণবের QR কোড স্ক্যান করে তাদের পাওনা মিটিয়ে দেয়।'
        : '💡 Weekend Outing Scenario: Arnab paid the Barbeque Buffet (₹4,800), Nilanjan paid IMAX movie tickets (₹2,000), Tanmoy paid cafe drinks (₹1,600), and Suman joined. Suman, Tanmoy, and Nilanjan scan Arnab’s QR to clear their remaining dues instantly.',
      members: [
        { name: 'Arnab Roy (Barbeque Dinner)', spent: '₹4,800', share: '₹2,100', net: '+₹2,700', status: 'To Receive (Pabe)' },
        { name: 'Nilanjan Mitra (IMAX Tickets)', spent: '₹2,000', share: '₹2,100', net: '-₹100', status: 'To Pay (Dite Habe)' },
        { name: 'Tanmoy Paul (Cafe & Snacks)', spent: '₹1,600', share: '₹2,100', net: '-₹500', status: 'To Pay (Dite Habe)' },
        { name: 'Suman Roy', spent: '₹0', share: '₹2,100', net: '-₹2,100', status: 'To Pay (Dite Habe)' }
      ],
      settlementPlan: [
        { payer: 'Suman Roy', payee: 'Arnab Roy', amount: '₹2,100.00', upi: 'arnab@ybl', method: 'Instant PhonePe/GPay QR' },
        { payer: 'Tanmoy Paul', payee: 'Arnab Roy', amount: '₹500.00', upi: 'arnab@ybl', method: 'Instant PhonePe/GPay QR' },
        { payer: 'Nilanjan Mitra', payee: 'Arnab Roy', amount: '₹100.00', upi: 'arnab@ybl', method: 'Instant PhonePe/GPay QR' }
      ]
    }
  };

  const current = demoScenarios[activeType] || demoScenarios.MESS;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '840px', 
          width: '100%', 
          maxHeight: '92vh',
          padding: '1.5rem',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {/* Modal Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {lang === 'BN' ? '✨ লাইভ ডেমো হিসাব ও PDF প্রিভিউ' : '✨ Live Demo Calculations & PDF Preview'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                {lang === 'BN' ? '৪টি ভিন্ন ভিন্ন গ্রুপের বাস্তব হিসাব ও প্রস্তুতকৃত অডিট PDF দেখুন' : 'Inspect 4 authentic calculation models and download tailored sample PDF reports'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Lang Switcher */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => setLang('BN')}
                style={{
                  background: lang === 'BN' ? '#3b82f6' : 'transparent',
                  color: lang === 'BN' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                বাংলা 🇮🇳
              </button>
              <button
                type="button"
                onClick={() => setLang('EN')}
                style={{
                  background: lang === 'EN' ? '#3b82f6' : 'transparent',
                  color: lang === 'EN' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                English 🇬🇧
              </button>
            </div>

            <button onClick={onClose} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 4 Type Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[
            { type: 'MESS', icon: '🏨', label: lang === 'BN' ? '১. মেস ও হোস্টেল' : '1. Hostel & Mess' },
            { type: 'TRIP', icon: '✈️', label: lang === 'BN' ? '২. ট্যুর ও ট্রাভেল' : '2. Tour & Travel' },
            { type: 'FLATMATES', icon: '🏠', label: lang === 'BN' ? '৩. ফ্ল্যাটমেট শেয়ার' : '3. Flatmates Living' },
            { type: 'PERSONAL', icon: '👥', label: lang === 'BN' ? '৪. ফ্রেন্ডস আড্ডা' : '4. Friends Outing' }
          ].map(tab => (
            <button
              key={tab.type}
              onClick={() => setActiveType(tab.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 0.75rem',
                borderRadius: '10px',
                border: activeType === tab.type ? `2px solid ${demoScenarios[tab.type].color}` : '1px solid rgba(255,255,255,0.08)',
                background: activeType === tab.type ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.6)',
                color: activeType === tab.type ? '#f8fafc' : '#94a3b8',
                fontWeight: activeType === tab.type ? 800 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeType === tab.type ? `0 4px 14px ${demoScenarios[tab.type].color}35` : 'none'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Active Demo Card */}
        <div style={{
          background: current.bgGradient,
          border: `1px solid ${current.borderColor}`,
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.25rem'
        }}>
          {/* Header & PDF Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {current.title}
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '0.2rem', margin: 0 }}>
                {current.subtitle}
              </p>
            </div>

            <button
              type="button"
              disabled={downloading}
              onClick={() => handleDownloadDemoPDF(activeType)}
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1.1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${current.color}, #1d4ed8)`,
                boxShadow: `0 4px 14px ${current.color}40`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Download size={15} />
              {downloading ? (lang === 'BN' ? 'ডাউনলোড হচ্ছে...' : 'Downloading...') : (lang === 'BN' ? '📄 এই ডেমোর আসল PDF ডাউনলোড করুন' : '📄 Download Sample PDF Report')}
            </button>
          </div>

          {/* Scenario Story */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '0.75rem 0.95rem',
            marginBottom: '1rem',
            fontSize: '0.78rem',
            color: '#e2e8f0',
            lineHeight: '1.45'
          }}>
            {current.scenarioStory}
          </div>

          {/* Summary Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.15rem' }}>
            {current.summaryMetrics.map((met, i) => (
              <div key={i} style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.65rem 0.8rem' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>{met.label}</span>
                <strong style={{ fontSize: '1rem', color: met.color, fontWeight: 800 }}>{met.value}</strong>
              </div>
            ))}
          </div>

          {/* Balance Sheet / Calculation Table */}
          <div style={{ marginBottom: '1.15rem' }}>
            <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#93c5fd', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>📋 {lang === 'BN' ? 'ব্যালেন্স শিট ও সদস্যদের হিসাব তালিকা' : 'Member Ledger & Balances'}</span>
            </h4>
            
            <div style={{ overflowX: 'auto', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '0.55rem', textAlign: 'left', color: '#94a3b8' }}>{lang === 'BN' ? 'সদস্যের নাম' : 'Member Name'}</th>
                    {activeType === 'MESS' ? (
                      <>
                        <th style={{ padding: '0.55rem', textAlign: 'right', color: '#94a3b8' }}>{lang === 'BN' ? 'ডিপোজিট' : 'Deposit'}</th>
                        <th style={{ padding: '0.55rem', textAlign: 'right', color: '#94a3b8' }}>{lang === 'BN' ? 'বাজার খরচ' : 'Bazar Paid'}</th>
                        <th style={{ padding: '0.55rem', textAlign: 'center', color: '#94a3b8' }}>{lang === 'BN' ? 'মিল' : 'Meals'}</th>
                        <th style={{ padding: '0.55rem', textAlign: 'right', color: '#94a3b8' }}>{lang === 'BN' ? 'মোট বিল' : 'Total Due'}</th>
                        <th style={{ padding: '0.55rem', textAlign: 'right', color: '#94a3b8' }}>{lang === 'BN' ? 'মোট দেওয়া' : 'Total Paid'}</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '0.55rem', textAlign: 'right', color: '#94a3b8' }}>{lang === 'BN' ? 'প্রকৃত খরচ' : 'Spent'}</th>
                        <th style={{ padding: '0.55rem', textAlign: 'right', color: '#94a3b8' }}>{lang === 'BN' ? 'শেয়ার' : 'Share'}</th>
                      </>
                    )}
                    <th style={{ padding: '0.55rem', textAlign: 'right', color: '#94a3b8' }}>{lang === 'BN' ? 'নেট স্ট্যাটাস' : 'Net Balance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {current.members.map((m, idx) => {
                    const isPositive = m.net.startsWith('+');
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.55rem', fontWeight: 600, color: '#f8fafc' }}>{m.name}</td>
                        {activeType === 'MESS' ? (
                          <>
                            <td style={{ padding: '0.55rem', textAlign: 'right', color: '#cbd5e1' }}>{m.deposit}</td>
                            <td style={{ padding: '0.55rem', textAlign: 'right', color: '#34d399' }}>{m.mkt}</td>
                            <td style={{ padding: '0.55rem', textAlign: 'center', color: '#fbbf24', fontWeight: 700 }}>{m.meals}</td>
                            <td style={{ padding: '0.55rem', textAlign: 'right', color: '#cbd5e1' }}>{m.due}</td>
                            <td style={{ padding: '0.55rem', textAlign: 'right', color: '#60a5fa', fontWeight: 700 }}>{m.paid}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '0.55rem', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>{m.spent}</td>
                            <td style={{ padding: '0.55rem', textAlign: 'right', color: '#cbd5e1' }}>{m.share}</td>
                          </>
                        )}
                        <td style={{ padding: '0.55rem', textAlign: 'right', fontWeight: 800, color: isPositive ? '#34d399' : '#f87171' }}>
                          {m.net}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Minimal Debt Settlement Plan */}
          <div>
            <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>⚡ {lang === 'BN' ? 'স্মার্ট মিনিমাম সেটেলমেন্ট ট্রান্সফার (কে কাকে কত দেবে)' : 'Automated Minimal Settlement Transfers'}</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.55rem' }}>
              {current.settlementPlan.map((p, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 700 }}>
                      <span style={{ color: '#f87171' }}>{p.payer}</span> ➔ <span style={{ color: '#34d399' }}>{p.payee}</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>UPI: {p.upi} • {p.method}</span>
                  </div>
                  <strong style={{ fontSize: '0.95rem', color: '#fbbf24', fontWeight: 800 }}>{p.amount}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {lang === 'BN' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
