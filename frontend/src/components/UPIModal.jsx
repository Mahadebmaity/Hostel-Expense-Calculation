import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Smartphone,
  ShieldCheck,
  Share2,
  Download,
  Edit3,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function UPIModal({ transaction, group, onClose, onMarkSettled, onMemberUpdated }) {
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);
  const [shareStatus, setShareStatus] = useState('idle'); // 'idle' | 'shared' | 'downloaded'

  // Helper to detect Manager UPI from group
  const getMemberUpi = (m) => m?.upi_id || m?.member_upi_id || m?.user?.upi_id || '';
  const managerMember = 
    group?.members?.find(m => (m.role || '').toUpperCase() === 'MANAGER') ||
    group?.members?.find(m => (m.role || '').toUpperCase() === 'ADMIN') ||
    group?.members?.[0];
  const detectedManagerUpi = getMemberUpi(managerMember) ||
    group?.members?.map(getMemberUpi).find(Boolean) ||
    '';

  const effectivePayeeUpi = transaction.payee_upi_id || (group?.group_type === 'MESS' ? detectedManagerUpi : '');

  // Dynamic UPI states
  const [currentUpiId, setCurrentUpiId] = useState(effectivePayeeUpi || '');
  const [currentQrBase64, setCurrentQrBase64] = useState(transaction.upi_qr_base64 || '');
  const [currentUpiUri, setCurrentUpiUri] = useState(transaction.upi_uri || '');
  const [isEditingUpi, setIsEditingUpi] = useState(!effectivePayeeUpi);
  const [upiInput, setUpiInput] = useState(effectivePayeeUpi || '');
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiError, setUpiError] = useState('');

  // Auto-generate QR code and deep-link if UPI ID is present but QR not pre-generated
  useEffect(() => {
    let isMounted = true;
    if (currentUpiId && !currentQrBase64) {
      setSavingUpi(true);
      api.generateUPI({
        upi_id: currentUpiId,
        payee_name: transaction.payee_name || (group?.group_type === 'MESS' ? 'Mess Manager' : 'Payee'),
        amount: transaction.amount || 0,
        note: `${group?.name || 'Mess'} Settlement`
      }).then(res => {
        if (isMounted && res?.upi_qr_base64) {
          setCurrentQrBase64(res.upi_qr_base64);
          setCurrentUpiUri(res.upi_uri);
          setIsEditingUpi(false);
        }
      }).catch(err => {
        console.warn('Auto UPI QR generation failed:', err);
      }).finally(() => {
        if (isMounted) setSavingUpi(false);
      });
    }
    return () => { isMounted = false; };
  }, [currentUpiId, currentQrBase64, transaction.payee_name, transaction.amount, group?.name, group?.group_type]);

  const upiHandles = ['@oksbi', '@okhdfc', '@paytm', '@ybl', '@axl', '@ibl'];

  const copyUpiId = () => {
    if (currentUpiId) {
      navigator.clipboard.writeText(currentUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyHandle = (handle) => {
    const raw = upiInput.split('@')[0].trim();
    if (raw) {
      setUpiInput(`${raw}${handle}`);
    } else {
      setUpiInput(handle);
    }
  };

  const handleSaveAndGenerateUPI = async (e) => {
    if (e) e.preventDefault();
    const cleanUpi = upiInput.trim();
    if (!cleanUpi || !cleanUpi.includes('@') || cleanUpi.startsWith('@') || cleanUpi.endsWith('@')) {
      setUpiError('Please enter a valid UPI ID (e.g. 9876543210@paytm or name@oksbi)');
      return;
    }
    setUpiError('');
    setSavingUpi(true);

    try {
      // 1. Generate live QR & Deep Link from backend
      const res = await api.generateUPI({
        upi_id: cleanUpi,
        payee_name: transaction.payee_name || 'Payee',
        amount: transaction.amount || 0,
        note: `${group?.name || 'Mess'} Settlement`
      });

      if (res.upi_qr_base64) {
        setCurrentQrBase64(res.upi_qr_base64);
        setCurrentUpiUri(res.upi_uri);
        setCurrentUpiId(cleanUpi);
      }

      // 2. Persist to group member / payee profile if IDs available
      if (group?.id && (transaction.payee_id || transaction.payee_member_id)) {
        const targetId = transaction.payee_member_id || transaction.payee_id;
        try {
          await api.updateMember(group.id, targetId, { upi_id: cleanUpi });
          if (onMemberUpdated) onMemberUpdated();
        } catch (memberErr) {
          console.warn('Could not auto-save UPI ID to member:', memberErr);
        }
      }

      setIsEditingUpi(false);
    } catch (err) {
      setUpiError(err.message || 'Failed to generate UPI QR code');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleShareQR = async () => {
    if (!currentQrBase64) return;

    const payeeName = transaction.payee_name || 'Payee';
    const amount = transaction.amount ? transaction.amount.toFixed(2) : '0';
    const fileName = `UPI_QR_${payeeName.replace(/\s+/g, '_')}_${amount}.png`;
    const shareTitle = `UPI Payment QR - ₹${amount}`;
    const shareText = `Pay ₹${amount} to ${payeeName} via UPI${currentUpiId ? ` (${currentUpiId})` : ''}. Scan QR code or open UPI link.`;

    try {
      const res = await fetch(currentQrBase64);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file]
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 3000);
        return;
      } else if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUpiUri || undefined
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 3000);
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('Web Share failed, falling back to download:', err);
    }

    handleDownloadQR();
  };

  const handleDownloadQR = () => {
    if (!currentQrBase64) return;

    const payeeName = transaction.payee_name || 'Payee';
    const amount = transaction.amount ? transaction.amount.toFixed(2) : '0';
    const fileName = `UPI_QR_${payeeName.replace(/\s+/g, '_')}_${amount}.png`;

    const link = document.createElement('a');
    link.href = currentQrBase64;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShareStatus('downloaded');
    setTimeout(() => setShareStatus('idle'), 3000);
  };

  const curr = transaction.currency === 'INR' ? '₹' : (transaction.currency || '₹');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Smartphone size={20} color="#3b82f6" /> Instant UPI Payment
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Payment Amount Display */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-glass)' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Amount to Pay</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', margin: '0.25rem 0' }}>
            {curr}{transaction.amount.toFixed(2)}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            To <strong>{transaction.payee_name}</strong>
          </p>
        </div>

        {/* Inline UPI ID Entry / Edit Form */}
        {isEditingUpi ? (
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '1.1rem',
            marginBottom: '1.25rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Sparkles size={16} color="#60a5fa" />
              <strong style={{ fontSize: '0.88rem', color: '#93c5fd' }}>
                {currentUpiId ? `Update UPI ID for ${transaction.payee_name}` : `Add UPI ID for ${transaction.payee_name}`}
              </strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Enter the payee/manager's UPI ID to generate an instant QR Code & direct UPI payment link:
            </p>

            <form onSubmit={handleSaveAndGenerateUPI}>
              <div style={{ marginBottom: '0.6rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9876543210@paytm or name@oksbi"
                  value={upiInput}
                  onChange={(e) => {
                    setUpiInput(e.target.value);
                    if (upiError) setUpiError('');
                  }}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  autoFocus
                />
              </div>

              {detectedManagerUpi && upiInput !== detectedManagerUpi && (
                <div style={{ marginBottom: '0.65rem', textAlign: 'left' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUpiInput(detectedManagerUpi);
                      if (upiError) setUpiError('');
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      color: '#60a5fa',
                      borderRadius: '8px',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    ⚡ Use Mess Manager UPI ({detectedManagerUpi})
                  </button>
                </div>
              )}

              {/* Quick UPI Handle Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
                {upiHandles.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleApplyHandle(h)}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.45rem',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>

              {upiError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.65rem' }}>
                  <AlertCircle size={14} /> {upiError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {currentUpiId && (
                  <button
                    type="button"
                    onClick={() => setIsEditingUpi(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingUpi}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  <QrCode size={14} /> {savingUpi ? 'Generating...' : 'Save & Generate QR'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* QR Code Container */}
            {currentQrBase64 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{
                  background: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  display: 'inline-block'
                }}>
                  <img
                    src={currentQrBase64}
                    alt="UPI QR Code"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem', marginBottom: '0.75rem' }}>
                  Scan using Google Pay, PhonePe, Paytm, or BHIM
                </p>

                {/* Share & Download QR Buttons */}
                <div style={{ display: 'flex', gap: '0.6rem', width: '100%', maxWidth: '300px' }}>
                  <button
                    onClick={handleShareQR}
                    className="btn"
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.35))',
                      border: '1px solid rgba(59, 130, 246, 0.45)',
                      color: 'var(--accent-primary)',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    {shareStatus === 'shared' ? (
                      <>
                        <Check size={15} color="#34d399" /> Shared!
                      </>
                    ) : (
                      <>
                        <Share2 size={15} /> Share QR
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadQR}
                    className="btn"
                    title="Download QR Image"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-secondary)',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {shareStatus === 'downloaded' ? (
                      <>
                        <Check size={15} color="#34d399" /> Saved!
                      </>
                    ) : (
                      <>
                        <Download size={15} /> Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.82rem', color: '#fbbf24', marginBottom: '0.75rem' }}>
                  ⚠️ Payee has not added a UPI ID yet.
                </p>
                <button
                  onClick={() => setIsEditingUpi(true)}
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                >
                  <Sparkles size={14} /> Add Payee's UPI ID Now
                </button>
              </div>
            )}

            {/* Payee UPI ID Copy & Edit Row */}
            {currentUpiId && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '0.6rem 0.85rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem'
              }}>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{currentUpiId}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={copyUpiId}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}
                  >
                    {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => {
                      setUpiInput(currentUpiId);
                      setIsEditingUpi(true);
                    }}
                    title="Change or Edit UPI ID"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                </div>
              </div>
            )}

            {/* Direct Mobile UPI Deep Link */}
            {currentUpiUri && (
              <a
                href={currentUpiUri}
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '0.75rem', padding: '0.75rem' }}
              >
                <ExternalLink size={16} /> Open in UPI App (PhonePe / GPay)
              </a>
            )}
          </>
        )}

        {/* Mark as Settled Button */}
        <button
          onClick={async () => {
            setMarking(true);
            await onMarkSettled();
            setMarking(false);
          }}
          disabled={marking}
          className="btn btn-success"
          style={{ width: '100%', padding: '0.75rem' }}
        >
          <CheckCircle2 size={16} /> {marking ? 'Recording...' : 'Mark Settlement as Completed'}
        </button>
      </div>
    </div>
  );
}
