import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Building2, ShieldCheck, Zap, Sparkles, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        login(res);
      } else {
        const res = await api.register({
          name,
          email,
          phone: phone || null,
          upi_id: upiId || null,
          password
        });
        login(res);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email: demoEmail, password: 'password123' });
      login(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%)'
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        alignItems: 'center'
      }}>
        {/* Left Side: Brand & Value Pitch */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.4rem 0.85rem', borderRadius: '20px', marginBottom: '1.25rem' }}>
            <Sparkles size={16} color="#60a5fa" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>Next-Gen Mess & Expense Splitter</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
            Simplify Hostel & Group Expenses in <span style={{ background: 'linear-gradient(90deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Seconds</span>.
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            No more manual calculations or ledger disputes. Automatically calculate daily meal rates, split utility bills, settle up with UPI QR codes, and export audit PDF sheets.
          </p>

          {/* Feature Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
              <div style={{ padding: '0.3rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>✓</div>
              <span><strong>Dynamic Meal Rate</strong> (Variable Grocery ÷ Total Meals)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
              <div style={{ padding: '0.3rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>✓</div>
              <span><strong>Min-Cashflow Graph Solver</strong> (Fewer debt transactions)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
              <div style={{ padding: '0.3rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>✓</div>
              <span><strong>Instant UPI QR & Deep Links</strong> for GPay & PhonePe</span>
            </div>
          </div>
        </div>

        {/* Right Side: Glassmorphism Auth Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                background: isLogin ? '#3b82f6' : 'transparent',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                background: !isLogin ? '#3b82f6' : 'transparent',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="Mahadeb Maity"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label className="form-label">UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. name@oksbi"
                  className="form-input"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In to Dashboard' : 'Register Account')}
            </button>
          </form>

          {isLogin && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.5rem', textAlign: 'center' }}>
                Quick Fill Credentials:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@hostel.com');
                    setPassword('admin123');
                  }}
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    color: '#c084fc',
                    borderRadius: '20px',
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Superadmin credentials"
                >
                  👑 Admin (admin@hostel.com)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('mahadeb@example.com');
                    setPassword('password123');
                  }}
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    borderRadius: '20px',
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Demo user credentials"
                >
                  👤 Demo User (mahadeb@example.com)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
