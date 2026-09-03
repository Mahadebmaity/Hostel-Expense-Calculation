import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Heart, 
  Globe, 
  Mail, 
  Phone, 
  Settings, 
  ExternalLink,
  Building2,
  Sparkles,
  Code
} from 'lucide-react';
import EditFooterModal from './EditFooterModal';

export default function Footer() {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [config, setConfig] = useState({
    developer_name: 'Mahadeb Maity',
    developer_title: 'Full Stack Developer & Software Engineer',
    portfolio_url: 'https://github.com/Mahadebmaity',
    github_url: 'https://github.com/Mahadebmaity',
    linkedin_url: 'https://linkedin.com/in/mahadebmaity',
    email: 'mahadebmaity.dev@gmail.com',
    phone: '+91 9876543210',
    custom_tagline: 'Crafted with passion for college students, mess managers, and roommates.',
    project_name: 'Hostel & Group Expense Manager',
    copyright_year: '2026'
  });

  useEffect(() => {
    let isMounted = true;
    api.getFooterConfig()
      .then(res => {
        if (isMounted && res) {
          setConfig(prev => ({ ...prev, ...res }));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  return (
    <>
      <footer style={{
        marginTop: '3.5rem',
        borderTop: '1px solid var(--border-glass)',
        background: 'var(--bg-secondary)',
        padding: '2.5rem 1.5rem 1.75rem 1.5rem',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem'
        }}>
          {/* Main Footer Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            {/* Left: Platform Branding */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  padding: '0.4rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                }}>
                  <Building2 size={18} color="#ffffff" />
                </div>
                <h4 style={{ 
                  fontSize: '1.05rem', 
                  fontWeight: 800, 
                  color: 'var(--text-primary)', 
                  letterSpacing: '-0.01em',
                  margin: 0
                }}>
                  {config.project_name || 'Mess & Expense Splitter'}
                </h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, maxWidth: '420px', lineHeight: '1.45' }}>
                {config.custom_tagline || 'Simplifying hostel mess management, travel bill splitting, flatmate utilities, and shared outings with automated Khatabook accounting.'}
              </p>
            </div>

            {/* Middle: Developer Spotlight Card */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              borderRadius: '14px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                }}>
                  {config.developer_name ? config.developer_name[0].toUpperCase() : 'D'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Designed & Developed by
                    </span>
                  </div>
                  <a 
                    href={config.portfolio_url || config.github_url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  >
                    <span>{config.developer_name || 'Mahadeb Maity'}</span>
                    <ExternalLink size={12} />
                  </a>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {config.developer_title || 'Full Stack Engineer'}
                  </div>
                </div>
              </div>

              {/* Social / Contact Links Pill Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-glass)', paddingLeft: '0.85rem' }}>
                {config.portfolio_url && (
                  <a 
                    href={config.portfolio_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.72rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}
                    title="Developer Portfolio"
                  >
                    <Globe size={13} color="#34d399" />
                    <span>Portfolio</span>
                  </a>
                )}

                {config.github_url && (
                  <a 
                    href={config.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.55rem', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}
                    title="GitHub Profile"
                  >
                    <Code size={14} color="#60a5fa" />
                  </a>
                )}

                {config.linkedin_url && (
                  <a 
                    href={config.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.55rem', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}
                    title="LinkedIn Profile"
                  >
                    <Globe size={14} color="#0ea5e9" />
                  </a>
                )}

                {config.email && (
                  <a 
                    href={`mailto:${config.email}`}
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.55rem', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}
                    title={`Email: ${config.email}`}
                  >
                    <Mail size={14} color="#f59e0b" />
                  </a>
                )}

                {config.phone && (
                  <a 
                    href={`https://wa.me/${config.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.55rem', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}
                    title={`WhatsApp / Phone: ${config.phone}`}
                  >
                    <Phone size={14} color="#10b981" />
                  </a>
                )}
              </div>
            </div>

            {/* Right: Admin Customize Footer Button */}
            {user?.is_admin && (
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '10px',
                  padding: '0.45rem 0.85rem',
                  color: '#60a5fa',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Edit developer name, portfolio and footer text"
              >
                <Settings size={14} />
                <span>⚙️ Customize Footer</span>
              </button>
            )}
          </div>

          {/* Bottom Copyright Row */}
          <div style={{
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              © {config.copyright_year || '2026'} <strong>{config.project_name || 'Hostel Expense Manager'}</strong>. Built for seamless group accounting.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Engineered with</span>
              <Heart size={13} color="#f43f5e" fill="#f43f5e" />
              <span>by <strong>{config.developer_name || 'Mahadeb Maity'}</strong></span>
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Live Footer Customization Modal */}
      <EditFooterModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        currentConfig={config}
        onConfigUpdated={(updated) => setConfig(prev => ({ ...prev, ...updated }))}
      />
    </>
  );
}
