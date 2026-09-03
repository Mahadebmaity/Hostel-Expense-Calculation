import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Save, User, Globe, Mail, Phone, Heart, Sparkles, Link2 } from 'lucide-react';

export default function EditFooterModal({ isOpen, onClose, currentConfig, onConfigUpdated }) {
  const [formData, setFormData] = useState(() => ({
    developer_name: currentConfig?.developer_name || 'Mahadeb Maity',
    developer_title: currentConfig?.developer_title || 'Full Stack Developer & Software Engineer',
    portfolio_url: currentConfig?.portfolio_url || 'https://github.com/Mahadebmaity',
    github_url: currentConfig?.github_url || 'https://github.com/Mahadebmaity',
    linkedin_url: currentConfig?.linkedin_url || 'https://linkedin.com/in/mahadebmaity',
    email: currentConfig?.email || 'mahadebmaity.dev@gmail.com',
    phone: currentConfig?.phone || '+91 9876543210',
    custom_tagline: currentConfig?.custom_tagline || 'Crafted with passion for students, mess managers, and roommates.',
    project_name: currentConfig?.project_name || 'Hostel & Group Expense Manager',
    copyright_year: currentConfig?.copyright_year || '2026'
  }));

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateFooterConfig(formData);
      if (onConfigUpdated) onConfigUpdated(res.config || formData);
      alert('Developer footer & portfolio details updated successfully!');
      onClose();
    } catch (err) {
      alert(`Failed to save footer settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '560px', 
          width: '100%',
          maxHeight: '90vh',
          padding: '1.5rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                ⚙️ Customize Developer & Footer Info
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                Edit your developer name, portfolio link, contact information and footer branding.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <User size={13} color="#60a5fa" /> Developer Name
              </label>
              <input
                type="text"
                name="developer_name"
                className="form-input"
                placeholder="e.g. Mahadeb Maity"
                value={formData.developer_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Professional Title</label>
              <input
                type="text"
                name="developer_title"
                className="form-input"
                placeholder="e.g. Full Stack Developer"
                value={formData.developer_title}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Globe size={13} color="#34d399" /> Portfolio Website URL
            </label>
            <input
              type="url"
              name="portfolio_url"
              className="form-input"
              placeholder="https://yourportfolio.com or GitHub profile"
              value={formData.portfolio_url}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Link2 size={13} /> GitHub Profile URL
              </label>
              <input
                type="url"
                name="github_url"
                className="form-input"
                placeholder="https://github.com/Mahadebmaity"
                value={formData.github_url}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Link2 size={13} color="#0ea5e9" /> LinkedIn Profile URL
              </label>
              <input
                type="url"
                name="linkedin_url"
                className="form-input"
                placeholder="https://linkedin.com/in/yourprofile"
                value={formData.linkedin_url}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={13} color="#f59e0b" /> Contact Email
              </label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="developer@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Phone size={13} color="#10b981" /> WhatsApp / Phone
              </label>
              <input
                type="text"
                name="phone"
                className="form-input"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Custom Footer Tagline</label>
            <input
              type="text"
              name="custom_tagline"
              className="form-input"
              placeholder="e.g. Crafted with passion for students, mess managers, and travelers."
              value={formData.custom_tagline}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                name="project_name"
                className="form-input"
                value={formData.project_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Copyright Year</label>
              <input
                type="text"
                name="copyright_year"
                className="form-input"
                value={formData.copyright_year}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save size={15} /> {saving ? 'Saving...' : 'Save & Publish Footer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
