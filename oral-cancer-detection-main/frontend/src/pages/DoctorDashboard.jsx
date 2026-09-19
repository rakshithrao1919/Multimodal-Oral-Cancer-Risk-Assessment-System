import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken, isDemoAuthMode, signOut, supabaseConfigError } from '../supabaseClient';
import PatientSidebar from '../components/PatientSidebar';
import PatientForm from '../components/PatientForm';
import ResultTabs from '../components/ResultTabs';
import '../styles/Dashboard.css';

/* ── SVG Icons ── */
const Ic = ({ d, size = 16, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const IcUpload = () => <Ic size={22} d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]} />;
const IcFile = () => <Ic size={14} d={["M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z", "M13 2v7h7"]} />;
const IcData = () => <Ic size={13} d={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6"]} />;
const IcPlay = () => <Ic size={16} d="M5 3l14 9-14 9V3z" />;
const IcCheck = () => <Ic size={14} sw={2.5} d="M20 6L9 17l-5-5" />;
const IcAlert = () => <Ic size={14} d={["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4", "M12 17h.01"]} />;
const IcActivity = () => <Ic size={24} d="M22 12h-4l-3 9L9 3l-3 9H2" />;
const IcDna = () => <Ic size={13} d={["M2 15c6.667-6 13.333 0 20-6", "M2 9c6.667 6 13.333 0 20 6"]} />;
const IcEye = () => <Ic size={13} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 9a3 3 0 100 6 3 3 0 000-6z"]} />;
const IcArrowLeft = () => <Ic size={16} d={["M19 12H5", "M12 19l-7-7 7-7"]} />;

/* ── Upload Zone ── */
function UploadZone({ label, hint, optional, onFile, file }) {
  const [drag, setDrag] = useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div className={`upload-zone ${drag ? 'drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      >
        <input type="file" accept="image/*" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
        <div className="upload-icon"><IcUpload /></div>
        <div className="upload-title">{label}{optional && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (Optional)</span>}</div>
        <div className="upload-hint">{hint}</div>
        {file && <div className="upload-file"><IcFile /> {file.name}</div>}
      </div>
      {file && file.type && file.type.startsWith('image/') && (
        <div className="upload-preview" style={{ marginTop: 8 }}>
          <img src={URL.createObjectURL(file)} alt="preview" />
        </div>
      )}
    </div>
  );
}

/* ── Analysis Steps ── */
const STEPS = [
  { id: 'img', label: 'Image preprocessing', sub: 'Normalising intra-oral image', icon: <IcEye /> },
  { id: 'hist', label: 'Histopathology analysis', sub: 'Segmentation & feature extraction', icon: <IcFile /> },
  { id: 'clin', label: 'Clinical correlation', sub: 'Age, gender, tobacco risk weighting', icon: <IcData /> },
  { id: 'gen', label: 'Genomic integration', sub: 'Gene expression cross-referencing', icon: <IcDna /> },
  { id: 'inf', label: 'AI inference', sub: 'Ensemble model prediction', icon: <IcActivity /> },
];

function AnalysisSteps({ step }) {
  return (
    <div className="running-state">
      {STEPS.map((s, i) => {
        const status = i < step ? 'complete' : i === step ? 'active' : 'pending';
        return (
          <div className="analysis-step" key={s.id} style={{ animationDelay: i * 0.08 + 's' }}>
            <div className={`step-icon ${status}`}>{s.icon}</div>
            <div>
              <div className="step-name">{s.label}</div>
              <div className="step-sub">{s.sub}</div>
            </div>
            {status === 'active' && <div className="step-spinner" />}
            {status === 'complete' && <div style={{ marginLeft: 'auto', color: 'var(--success)' }}><IcCheck /></div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Dashboard ── */
const DoctorDashboard = () => {
  const navigate = useNavigate();

  // Patient management
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientFormLoading, setPatientFormLoading] = useState(false);

  // Upload state
  const [oralImg, setOralImg] = useState(null);
  const [histImg, setHistImg] = useState(null);
  const [clinReport, setClinReport] = useState(null);
  const [geneReport, setGeneReport] = useState(null);

  // Analysis state
  const [status, setStatus] = useState('idle');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // View mode
  const [viewMode, setViewMode] = useState('upload'); // 'upload' | 'results' | 'history'

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1').replace(/^['"]|['"]$/g, '');

  // ── Load patients on mount ──
  const loadPatients = useCallback(async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`${apiUrl}/patients/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (err) {
      console.warn('Could not load patients:', err.message);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // ── Load patient detail (with predictions) ──
  const loadPatientDetail = useCallback(async (patientId) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return null;

      const response = await fetch(`${apiUrl}/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Could not load patient detail:', err.message);
    }
    return null;
  }, [apiUrl]);

  // ── Handlers ──
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNewPatient = () => {
    setShowPatientForm(true);
  };

  const handlePatientFormSubmit = async ({ isExisting, patient }) => {
    if (isExisting) {
      // Existing patient selected — load details and go to upload
      setPatientFormLoading(true);
      const detail = await loadPatientDetail(patient.id);
      if (detail) {
        setSelectedPatient(detail);
      } else {
        setSelectedPatient(patient);
      }
      setPatientFormLoading(false);
      setShowPatientForm(false);
      setViewMode('upload');
      resetUploadState();
      return;
    }

    // Create new patient
    setPatientFormLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) { navigate('/login'); return; }

      const response = await fetch(`${apiUrl}/patients/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patient),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail);
      }

      const newPatient = await response.json();
      setSelectedPatient(newPatient);
      setShowPatientForm(false);
      setViewMode('upload');
      resetUploadState();
      await loadPatients();
    } catch (err) {
      console.error('Failed to create patient:', err);
      setError(`Failed to create patient: ${err.message}`);
    } finally {
      setPatientFormLoading(false);
    }
  };

  const handleSelectPatient = async (patient) => {
    const detail = await loadPatientDetail(patient.id);
    if (detail) {
      setSelectedPatient(detail);
    } else {
      setSelectedPatient(patient);
    }
    setSelectedReport(null);
    if (detail?.predictions?.length > 0) {
      setViewMode('history');
    } else {
      setViewMode('upload');
    }
    setResult(null);
    setStatus('idle');
  };

  const handleSelectReport = (patient, report) => {
    setSelectedPatient(prev => {
      if (prev?.id === patient.id) return prev;
      return patient;
    });
    setSelectedReport(report);
    setResult(report);
    setViewMode('results');
    setStatus('done');
  };

  const handleDeletePatient = async (patientId) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      await fetch(`${apiUrl}/patients/${patientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
        setSelectedReport(null);
        setResult(null);
        setViewMode('upload');
      }
      await loadPatients();
    } catch (err) {
      console.error('Failed to delete patient:', err);
    }
  };

  const resetUploadState = () => {
    setOralImg(null);
    setHistImg(null);
    setClinReport(null);
    setGeneReport(null);
    setError('');
    setResult(null);
    setStatus('idle');
    setStep(0);
    setSelectedReport(null);
  };

  const runAnalysis = async (e) => {
    e.preventDefault();
    if (!oralImg && !clinReport && !histImg && !geneReport) {
      setError('Please upload at least one piece of patient data to run the analysis.');
      return;
    }
    setError('');
    setStatus('running');
    setStep(0);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Session not found. Please login again.');
      }

      const stepInterval = setInterval(() => {
        setStep(s => (s < STEPS.length - 1 ? s + 1 : s));
      }, 800);

      const formData = new FormData();
      if (histImg) formData.append('histopathology_image', histImg);
      if (oralImg) formData.append('intra_oral_image', oralImg);
      if (clinReport) formData.append('clinical_report', clinReport);
      if (geneReport) formData.append('gene_report', geneReport);

      // Attach patient info if available
      if (selectedPatient?.id) {
        formData.append('patient_id', selectedPatient.id);
        formData.append('patient_name', selectedPatient.name || '');
      }

      const response = await fetch(`${apiUrl}/predict/multimodal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      clearInterval(stepInterval);
      setStep(STEPS.length);

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`API Error ${response.status}: ${detail}`);
      }

      const data = await response.json();
      setResult(data);
      setStatus('done');
      setViewMode('results');

      // Reload patient data to get updated predictions
      if (selectedPatient?.id) {
        const updatedDetail = await loadPatientDetail(selectedPatient.id);
        if (updatedDetail) {
          setSelectedPatient(updatedDetail);
        }
        await loadPatients();
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to run prediction: ${err.message}`);
      setStatus('idle');
    }
  };

  const badgeEl = status === 'idle' ? <span className="results-badge badge-waiting">Awaiting input</span>
    : status === 'running' ? <span className="results-badge badge-running">Analysing...</span>
      : <span className="results-badge badge-done">Complete</span>;

  return (
    <div className="dashboard-root">
      <div className="app">
        {/* Sidebar */}
        <PatientSidebar
          patients={patients}
          selectedPatientId={selectedPatient?.id}
          selectedReportId={selectedReport?.id}
          onSelectPatient={handleSelectPatient}
          onSelectReport={handleSelectReport}
          onNewPatient={handleNewPatient}
          onDeletePatient={handleDeletePatient}
          onLogout={handleLogout}
        />

        {/* Patient Form Modal */}
        {showPatientForm && (
          <PatientForm
            onSubmit={handlePatientFormSubmit}
            onCancel={() => setShowPatientForm(false)}
            existingPatients={patients}
            loading={patientFormLoading}
          />
        )}

        {/* Main Content */}
        <div className="main">
          {/* Top Bar */}
          <div className="topbar">
            {selectedPatient ? (
              <div className="topbar-patient">
                <div className="topbar-patient-info">
                  <div className="topbar-title">
                    {selectedPatient.name}
                    <span className="topbar-patient-badge">{selectedPatient.age}y • {selectedPatient.gender}</span>
                  </div>
                  <div className="topbar-sub">
                    {viewMode === 'upload'
                      ? 'Upload patient data for AI analysis'
                      : viewMode === 'results'
                        ? 'Prediction results & insights'
                        : `${selectedPatient.prediction_count || 0} previous report${(selectedPatient.prediction_count || 0) !== 1 ? 's' : ''}`
                    }
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="topbar-title">Clinical Decision Support</div>
                <div className="topbar-sub">Select a patient or create a new one to begin</div>
              </>
            )}
            {isDemoAuthMode && <div style={{ color: 'var(--warn)', fontSize: '12px', marginTop: '4px' }}>{supabaseConfigError}</div>}
          </div>

          <div className="content">
            {/* No Patient Selected */}
            {!selectedPatient && viewMode !== 'results' && (
              <div className="empty-state-full">
                <div className="empty-state-inner">
                  <div className="pulse-ring"><IcActivity /></div>
                  <div className="waiting-title">Welcome to OralScan AI</div>
                  <div className="waiting-sub">Click "+ New Patient" to register a patient and start the multimodal AI analysis workflow.</div>
                  <button className="run-btn" style={{ maxWidth: 260, marginTop: 12 }} onClick={handleNewPatient}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14" /><path d="M5 12h14" />
                    </svg>
                    New Patient
                  </button>
                </div>
              </div>
            )}

            {/* Upload Form (when patient is selected) */}
            {selectedPatient && viewMode === 'upload' && (
              <>
                <div className="form-col">
                  <div className="card">
                    <div className="card-header"><IcData />Patient Data Input</div>
                    <div className="card-body">
                      <UploadZone label="Upload Intra-Oral Image" hint="JPG, PNG up to 10 MB" file={oralImg} onFile={setOralImg} />
                      <UploadZone label="Upload Histopathology" hint="JPG, PNG up to 10 MB" optional file={histImg} onFile={setHistImg} />
                      <UploadZone label="Upload Clinical Report" hint="JPG, PNG up to 10 MB" file={clinReport} onFile={setClinReport} />
                      <UploadZone label="Upload Gene Report" hint="JPG, PNG up to 10 MB" file={geneReport} onFile={setGeneReport} />

                      {error && (
                        <div className="error-banner"><IcAlert />{error}</div>
                      )}

                      <button className={`run-btn ${status === 'running' ? 'loading' : ''}`}
                        disabled={status === 'running'}
                        onClick={runAnalysis}>
                        {status === 'running' ? <>Analysing patient data...</> : <><IcPlay />Run AI Analysis</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="results-col">
                  <div className="results-header">
                    <div className="results-title">Analysis Results</div>
                    {badgeEl}
                  </div>
                  <div className="results-body">
                    {status === 'idle' && (
                      <div className="waiting-state">
                        <div className="pulse-ring"><IcActivity /></div>
                        <div className="waiting-title">Awaiting patient data</div>
                        <div className="waiting-sub">Fill in the patient form and run AI analysis to see diagnostic results here.</div>
                      </div>
                    )}
                    {status === 'running' && <AnalysisSteps step={step} />}
                    {status === 'done' && result && (
                      <ResultTabs
                        result={result}
                        patient={selectedPatient}
                        allPredictions={selectedPatient?.predictions || []}
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Results View (past report clicked or just finished analysis) */}
            {selectedPatient && viewMode === 'results' && result && (
              <div className="results-col full-width">
                <div className="results-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="back-btn" onClick={() => {
                      if (selectedPatient?.predictions?.length > 0) {
                        setViewMode('history');
                      } else {
                        setViewMode('upload');
                      }
                      setSelectedReport(null);
                    }}>
                      <IcArrowLeft />
                    </button>
                    <div className="results-title">Analysis Results</div>
                  </div>
                  <span className="results-badge badge-done">Complete</span>
                </div>
                <div className="results-body">
                  <ResultTabs
                    result={result}
                    patient={selectedPatient}
                    allPredictions={selectedPatient?.predictions || []}
                  />
                </div>
              </div>
            )}

            {/* History View */}
            {selectedPatient && viewMode === 'history' && (
              <div className="results-col full-width">
                <div className="results-header">
                  <div className="results-title">Patient History — {selectedPatient.name}</div>
                  <button className="run-btn" style={{ width: 'auto', padding: '8px 20px', fontSize: 13 }} onClick={() => { resetUploadState(); setViewMode('upload'); }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14" /><path d="M5 12h14" />
                    </svg>
                    New Analysis
                  </button>
                </div>
                <div className="results-body">
                  {(!selectedPatient.predictions || selectedPatient.predictions.length === 0) ? (
                    <div className="waiting-state">
                      <div className="pulse-ring"><IcActivity /></div>
                      <div className="waiting-title">No reports yet</div>
                      <div className="waiting-sub">Run an AI analysis to generate the first diagnostic report for this patient.</div>
                    </div>
                  ) : (
                    <div className="history-grid">
                      {selectedPatient.predictions.map(pred => {
                        const score = pred.final_risk_score;
                        const level = score > 0.65 ? 'High' : score > 0.35 ? 'Medium' : 'Low';
                        const color = score > 0.65 ? 'var(--error)' : score > 0.35 ? 'var(--warn)' : 'var(--success)';
                        return (
                          <div
                            key={pred.id}
                            className="history-card"
                            onClick={() => handleSelectReport(selectedPatient, pred)}
                          >
                            <div className="history-card-top">
                              <div className="history-risk" style={{ color }}>{level} Risk</div>
                              <div className="history-score" style={{ color }}>{(score * 100).toFixed(1)}%</div>
                            </div>
                            <div className="bar-track" style={{ marginTop: 8 }}>
                              <div className="bar-fill" style={{ width: (score * 100) + '%', background: color }} />
                            </div>
                            <div className="history-date">
                              {new Date(pred.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {' '}
                              {new Date(pred.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="history-models">
                              {Object.keys(pred.base_model_predictions || {}).length} models • Ensemble analysis
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
