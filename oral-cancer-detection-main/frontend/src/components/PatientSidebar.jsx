import React, { useState, useMemo } from 'react';

/* ── SVG Icons ── */
const Ic = ({ d, size = 16, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const IcPlus = () => <Ic size={16} d={["M12 5v14", "M5 12h14"]} />;
const IcSearch = () => <Ic size={14} d={["M21 21l-6-6", "M11 19a8 8 0 100-16 8 8 0 000 16z"]} />;
const IcUser = () => <Ic size={14} d={["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 3a4 4 0 100 8 4 4 0 000-8z"]} />;
const IcClock = () => <Ic size={11} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 6v6l4 2"]} />;
const IcChevron = ({ open }) => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const IcActivity = () => <Ic size={13} d="M22 12h-4l-3 9L9 3l-3 9H2" />;
const IcTrash = () => <Ic size={13} d={["M3 6h18", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"]} />;
const IcLogout = () => <Ic size={15} d={["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4", "M16 17l5-5-5-5", "M21 12H9"]} />;

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function riskColor(level) {
  if (!level) return 'var(--text-muted)';
  switch (level.toLowerCase()) {
    case 'high': return 'var(--error)';
    case 'medium': return 'var(--warn)';
    case 'low': return 'var(--success)';
    default: return 'var(--text-muted)';
  }
}

function riskLevel(score) {
  if (score == null) return null;
  if (score > 0.65) return 'High';
  if (score > 0.35) return 'Medium';
  return 'Low';
}

export default function PatientSidebar({
  patients = [],
  selectedPatientId,
  selectedReportId,
  onSelectPatient,
  onSelectReport,
  onNewPatient,
  onDeletePatient,
  onLogout,
}) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(selectedPatientId || null);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q));
  }, [patients, search]);

  const handlePatientClick = (patient) => {
    const isExpanding = expandedId !== patient.id;
    setExpandedId(isExpanding ? patient.id : null);
    onSelectPatient(patient);
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">OS</div>
        <div>
          <div className="logo-name">OralScan AI</div>
          <div className="logo-sub">Diagnostic</div>
        </div>
      </div>

      {/* New Patient Button */}
      <div className="sidebar-new-patient">
        <button className="new-patient-btn" onClick={onNewPatient}>
          <IcPlus /> New Patient
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <IcSearch />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Patient List */}
      <div className="sidebar-patients">
        {filtered.length === 0 && (
          <div className="sidebar-empty">
            <IcUser />
            <span>{search ? 'No matches found' : 'No patients yet'}</span>
          </div>
        )}

        {filtered.map(patient => {
          const isExpanded = expandedId === patient.id;
          const isSelected = selectedPatientId === patient.id;

          return (
            <div key={patient.id} className={`patient-item ${isSelected ? 'selected' : ''}`}>
              {/* Patient Row */}
              <div className="patient-row" onClick={() => handlePatientClick(patient)}>
                <div className="patient-avatar" style={{ borderColor: riskColor(patient.latest_risk_level) }}>
                  {patient.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="patient-info">
                  <div className="patient-name">{patient.name}</div>
                  <div className="patient-meta">
                    {patient.age}y • {patient.gender}
                    {patient.prediction_count > 0 && (
                      <span className="patient-count"> • {patient.prediction_count} report{patient.prediction_count !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="patient-row-right">
                  {patient.latest_risk_level && (
                    <div className="patient-risk-dot" style={{ background: riskColor(patient.latest_risk_level) }} title={patient.latest_risk_level + ' Risk'} />
                  )}
                  <ChevronIcon open={isExpanded} />
                </div>
              </div>

              {/* Expanded Timeline */}
              <div className={`patient-timeline ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded && patient.predictions && patient.predictions.length > 0 ? (
                  patient.predictions.map(pred => {
                    const level = riskLevel(pred.final_risk_score);
                    const isActive = selectedReportId === pred.id;
                    return (
                      <div
                        key={pred.id}
                        className={`timeline-item ${isActive ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onSelectReport(patient, pred); }}
                      >
                        <div className="timeline-dot" style={{ background: riskColor(level) }} />
                        <div className="timeline-content">
                          <div className="timeline-label">
                            {level ? `${level} Risk` : 'Analysis'}
                            <span className="timeline-score">
                              {(pred.final_risk_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="timeline-date">
                            <IcClock /> {formatReportDate(pred.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : isExpanded ? (
                  <div className="timeline-empty">No reports yet — run an analysis</div>
                ) : null}

                {isExpanded && (
                  <button
                    className="patient-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDeletePatient(patient.id); }}
                    title="Delete patient"
                  >
                    <IcTrash /> Remove patient
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="nav-item" style={{ color: 'var(--error)', opacity: 0.8 }} onClick={onLogout}>
          <IcLogout />Logout
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(90deg)' : 'rotate(0)', opacity: 0.4, flexShrink: 0 }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
