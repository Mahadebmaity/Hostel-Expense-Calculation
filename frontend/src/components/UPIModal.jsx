import React, { useState } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Smartphone,
  ShieldCheck,
  Share2,
  Download
} from 'lucide-react';

export default function UPIModal({ transaction, onClose, onMarkSettled }) {
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);
  const [shareStatus, setShareStatus] = useState('idle'); // 'idle' | 'shared' | 'downloaded'

  const copyUpiId = () => {
    if (transaction.payee_upi_id) {
      navigator.clipboard.writeText(transaction.payee_upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareQR = async () => {
    if (!transaction.upi_qr_base64) return;

    const payeeName = transaction.payee_name || 'Payee';
    const amount = transaction.amount ? transaction.amount.toFixed(2) : '0';
    const fileName = `UPI_QR_${payeeName.replace(/\s+/g, '_')}_${amount}.png`;
    const shareTitle = `UPI Payment QR - ₹${amount}`;
    const shareText = `Pay ₹${amount} to ${payeeName} via UPI${transaction.payee_upi_id ? ` (${transaction.payee_upi_id})` : ''}. Scan QR code or open UPI link.`;

    try {
      // Convert base64 data to Blob -> File
      const res = await fetch(transaction.upi_qr_base64);
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
          url: transaction.upi_uri || undefined
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 3000);
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User closed native share sheet, ignore error
        return;
      }
      console.warn('Web Share failed, falling back to download:', err);
    }

    // Fallback if Web Share is not supported or failed
    handleDownloadQR();
  };

  const handleDownloadQR = () => {
    if (!transaction.upi_qr_base64) return;

    const payeeName = transaction.payee_name || 'Payee';
    const amount = transaction.amount ? transaction.amount.toFixed(2) : '0';
    const fileName = `UPI_QR_${payeeName.replace(/\s+/g, '_')}_${amount}.png`;

    const link = document.createElement('a');
    link.href = transaction.upi_qr_base64;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShareStatus('downloaded');
    setTimeout(() => setShareStatus('idle'), 3000);
  };

  const curr = transaction.currency === 'INR' ? '₹' : transaction.currency;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Smartphone size={20} color="#3b82f6" /> Instant UPI Payment
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Payment Amount Display */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Amount to Pay</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', margin: '0.25rem 0' }}>
            {curr}{transaction.amount.toFixed(2)}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
            To <strong>{transaction.payee_name}</strong>
          </p>
        </div>

        {/* QR Code Container */}
        {transaction.upi_qr_base64 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{
              background: '#ffffff',
              padding: '0.85rem',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'inline-block'
            }}>
              <img
                src={transaction.upi_qr_base64}
                alt="UPI QR Code"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.65rem', marginBottom: '0.75rem' }}>
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
                  color: '#93c5fd',
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
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
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
            <p style={{ fontSize: '0.82rem', color: '#fbbf24' }}>
              ⚠️ Payee has not added a UPI ID yet. You can pay via cash or ask them to add their UPI ID in profile.
            </p>
          </div>
        )}

        {/* Payee UPI ID Copy Row */}
        {transaction.payee_upi_id && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            marginBottom: '1.25rem',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>{transaction.payee_upi_id}</span>
            <button
              onClick={copyUpiId}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {/* Direct Mobile UPI Deep Link */}
        {transaction.upi_uri && (
          <a
            href={transaction.upi_uri}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '0.75rem', padding: '0.75rem' }}
          >
            <ExternalLink size={16} /> Open in UPI App (PhonePe / GPay)
          </a>
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

