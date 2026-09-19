import React, { useState } from 'react';

const Ic = ({ d, size = 16, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const IcUser = () => <Ic size={20} d={["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 3a4 4 0 100 8 4 4 0 000-8z"]} />;
const IcX = () => <Ic size={18} d={["M18 6L6 18", "M6 6l12 12"]} />;

export default function PatientForm({ onSubmit, onCancel, existingPatients = [], loading = false }) {
  const [mode, setMode] = useState('new'); // 'new' | 'existing'
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'existing') {
      if (!selectedPatientId) {
        setError('Please select a patient');
        return;
      }
      const patient = existingPatients.find(p => p.id === selectedPatientId);
      if (patient) {
        onSubmit({ isExisting: true, patient });
      }
      return;
    }

    // Validate new patient
    if (!name.trim()) { setError('Name is required'); return; }
    if (!age || parseInt(age) < 0 || parseInt(age) > 150) { setError('Please enter a valid age (0-150)'); return; }
    if (!gender) { setError('Please select gender'); return; }

    onSubmit({
      isExisting: false,
      patient: {
        name: name.trim(),
        age: parseInt(age),
        gender,
        phone: phone.trim() || null,
      },
    });
  };

  return (
    <div className="patient-form-overlay" onClick={onCancel}>
      <div className="patient-form-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pf-header">
          <div className="pf-header-left">
            <div className="pf-icon"><IcUser /></div>
            <div>
              <div className="pf-title">Patient Information</div>
              <div className="pf-subtitle">Enter patient details before running analysis</div>
            </div>
          </div>
          <button className="pf-close" onClick={onCancel}><IcX /></button>
        </div>

        {/* Mode Toggle */}
        <div className="pf-toggle">
          <button
            className={`pf-toggle-btn ${mode === 'new' ? 'active' : ''}`}
            onClick={() => setMode('new')}
          >
            New Patient
          </button>
          <button
            className={`pf-toggle-btn ${mode === 'existing' ? 'active' : ''}`}
            onClick={() => setMode('existing')}
            disabled={existingPatients.length === 0}
          >
            Existing Patient ({existingPatients.length})
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="pf-body">
          {mode === 'new' ? (
            <>
              <div className="field-group">
                <label className="field-label">Full Name *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Enter patient's full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">Age *</label>
                  <input
                    type="number"
                    className="field-input"
                    placeholder="Age"
                    min="0"
                    max="150"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Gender *</label>
                  <select className="field-select" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(Optional)</span></label>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="Phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="field-group">
              <label className="field-label">Select Patient</label>
              <select
                className="field-select"
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
              >
                <option value="">Choose a patient...</option>
                {existingPatients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.age}y, {p.gender}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="error-banner" style={{ marginTop: 4 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="run-btn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Creating...' : mode === 'new' ? 'Create & Continue' : 'Continue to Analysis'}
          </button>
        </form>
      </div>
    </div>
  );
}
