import React, { useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

/* ── Helpers ── */
function riskInfo(score) {
  if (score > 0.65) return { label: 'High Risk', color: 'var(--error)', bg: 'oklch(0.65 0.18 22 / 0.12)' };
  if (score > 0.35) return { label: 'Medium Risk', color: 'var(--warn)', bg: 'oklch(0.75 0.14 60 / 0.12)' };
  return { label: 'Low Risk', color: 'var(--success)', bg: 'oklch(0.68 0.14 155 / 0.12)' };
}

function formatModelName(name) {
  return name.replace('.pkl', '').replace('.joblib', '').replace(/_/g, ' ');
}

/* ── Gauge Chart (using PieChart) ── */
function RiskGauge({ score }) {
  const r = riskInfo(score);
  const pct = score * 100;
  const data = [
    { name: 'Risk', value: pct },
    { name: 'Remaining', value: 100 - pct },
  ];
  const colorMap = {
    'var(--error)': '#ef4444',
    'var(--warn)': '#f59e0b',
    'var(--success)': '#22c55e',
  };
  const fillColor = colorMap[r.color] || '#22c55e';

  return (
    <div className="gauge-container">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="75%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={fillColor} />
            <Cell fill="oklch(0.28 0.012 248)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="gauge-label">
        <div className="gauge-value" style={{ color: r.color }}>{pct.toFixed(1)}%</div>
        <div className="gauge-text" style={{ color: r.color }}>{r.label}</div>
      </div>
    </div>
  );
}

/* ── Tab: Risk Analytics ── */
function TabAnalytics({ result, allPredictions = [] }) {
  const r = riskInfo(result.final_risk_score);

  // Bar chart data: individual model scores
  const barData = Object.entries(result.base_model_predictions || {}).map(([name, score]) => ({
    name: formatModelName(name),
    score: (score * 100).toFixed(1),
    fill: score > 0.65 ? '#ef4444' : score > 0.35 ? '#f59e0b' : '#22c55e',
  }));

  // Trend line data: risk scores over time (if multiple predictions)
  const trendData = allPredictions
    .slice()
    .reverse()
    .map((pred, i) => ({
      name: new Date(pred.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: (pred.final_risk_score * 100).toFixed(1),
    }));

  return (
    <div className="tab-content">
      {/* Risk Score Gauge */}
      <div className="analytics-section">
        <div className="section-label">Overall Risk Assessment</div>
        <div className="metric-grid">
          <div className="metric-card" style={{ gridColumn: '1 / -1' }}>
            <RiskGauge score={result.final_risk_score} />
          </div>
        </div>
      </div>

      {/* Base Model Comparison */}
      {barData.length > 0 && (
        <div className="analytics-section">
          <div className="section-label">Model Score Comparison</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.012 248)" />
                <XAxis dataKey="name" tick={{ fill: 'oklch(0.62 0.01 248)', fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: 'oklch(0.62 0.01 248)', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'oklch(0.21 0.01 248)', border: '1px solid oklch(0.28 0.012 248)', borderRadius: 8, fontSize: 12, color: '#e5e5e5' }}
                  formatter={(value) => [`${value}%`, 'Score']}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Risk Trend Over Time */}
      {trendData.length > 1 && (
        <div className="analytics-section">
          <div className="section-label">Risk Trend Over Time</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.012 248)" />
                <XAxis dataKey="name" tick={{ fill: 'oklch(0.62 0.01 248)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'oklch(0.62 0.01 248)', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'oklch(0.21 0.01 248)', border: '1px solid oklch(0.28 0.012 248)', borderRadius: 8, fontSize: 12, color: '#e5e5e5' }}
                  formatter={(value) => [`${value}%`, 'Risk Score']}
                />
                <Line type="monotone" dataKey="score" stroke="#2dd4bf" strokeWidth={2} dot={{ fill: '#2dd4bf', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Risk Score</div>
          <div className="metric-val" style={{ color: r.color }}>{(result.final_risk_score * 100).toFixed(1)}%</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: (result.final_risk_score * 100) + '%', background: r.color }} /></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Models Used</div>
          <div className="metric-val" style={{ color: 'var(--teal)', fontSize: 18 }}>{Object.keys(result.base_model_predictions || {}).length}</div>
          <div className="metric-sub">Multi-modal ensemble</div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: AI Explainability ── */
function TabExplainability({ result }) {
  // Radar chart data from attention weights
  const radarData = Object.entries(result.explainability_attention || {}).map(([name, weight]) => ({
    model: formatModelName(name),
    weight: parseFloat(weight) || 0,
  }));

  return (
    <div className="tab-content">
      {/* Attention Radar */}
      {radarData.length > 0 && (
        <div className="analytics-section">
          <div className="section-label">Model Attention Distribution</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="oklch(0.28 0.012 248)" />
                <PolarAngleAxis dataKey="model" tick={{ fill: 'oklch(0.62 0.01 248)', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: 'oklch(0.42 0.01 248)', fontSize: 10 }} />
                <Radar name="Attention" dataKey="weight" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gemini Clinical Insight */}
      <div className="analytics-section">
        <div className="section-label">Gemini AI Clinical Insight</div>
        <div className="insight-card">
          <div className="insight-icon">🧠</div>
          <div className="insight-text" style={{ whiteSpace: 'pre-wrap' }}>
            {result.clinical_insight}
          </div>
        </div>
      </div>

      {/* Feature Dependencies */}
      <div className="analytics-section">
        <div className="section-label">Feature Dependencies & Model Reasoning</div>
        <div className="finding-list">
          {Object.entries(result.feature_dependencies || {}).map(([model, deps]) => (
            <div className="finding-item" key={model}>
              <div className="finding-dot" style={{ background: 'var(--teal)' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>{formatModelName(model)}</strong>
                <p style={{ marginTop: 4 }}>{deps}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Medical Report ── */
function TabReport({ result, patient }) {
  const reportRef = useRef(null);
  const r = riskInfo(result.final_risk_score);

  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Medical Report - ${patient?.name || 'Patient'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.6; }
          .report-header { text-align: center; border-bottom: 2px solid #2dd4bf; padding-bottom: 20px; margin-bottom: 24px; }
          .report-header h1 { font-size: 22px; color: #0f766e; margin-bottom: 4px; }
          .report-header p { font-size: 12px; color: #666; }
          .report-section { margin-bottom: 20px; }
          .report-section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #0f766e; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f8fafc; font-weight: 600; color: #374151; }
          .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; }
          .risk-high { background: #fef2f2; color: #dc2626; }
          .risk-medium { background: #fffbeb; color: #d97706; }
          .risk-low { background: #f0fdf4; color: #16a34a; }
          .insight-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  const riskClass = result.final_risk_score > 0.65 ? 'high' : result.final_risk_score > 0.35 ? 'medium' : 'low';

  return (
    <div className="tab-content">
      <div className="report-actions">
        <button className="print-btn" onClick={handlePrint}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          Print / Save as PDF
        </button>
      </div>

      <div className="report-preview" ref={reportRef}>
        {/* Report Header */}
        <div className="report-header">
          <h1>OralScan AI — Diagnostic Report</h1>
          <p>Multimodal Oral Cancer Risk Assessment System</p>
        </div>

        {/* Patient Info */}
        {patient && (
          <div className="report-section">
            <h2>Patient Information</h2>
            <table>
              <tbody>
                <tr><th>Name</th><td>{patient.name}</td></tr>
                <tr><th>Age</th><td>{patient.age} years</td></tr>
                <tr><th>Gender</th><td>{patient.gender}</td></tr>
                {patient.phone && <tr><th>Phone</th><td>{patient.phone}</td></tr>}
                <tr><th>Report Date</th><td>{new Date(result.created_at || Date.now()).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Risk Assessment */}
        <div className="report-section">
          <h2>Risk Assessment</h2>
          <table>
            <tbody>
              <tr>
                <th>Overall Risk</th>
                <td><span className={`risk-badge risk-${riskClass}`}>{r.label}</span></td>
              </tr>
              <tr><th>Risk Score</th><td>{(result.final_risk_score * 100).toFixed(1)}%</td></tr>
            </tbody>
          </table>
        </div>

        {/* Model Breakdown */}
        <div className="report-section">
          <h2>Model Analysis Breakdown</h2>
          <table>
            <thead>
              <tr><th>Model</th><th>Score</th><th>Attention Weight</th></tr>
            </thead>
            <tbody>
              {Object.entries(result.base_model_predictions || {}).map(([name, score]) => (
                <tr key={name}>
                  <td>{formatModelName(name)}</td>
                  <td>{(score * 100).toFixed(1)}%</td>
                  <td>{result.explainability_attention?.[name] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Clinical Insight */}
        <div className="report-section">
          <h2>AI Clinical Insight</h2>
          <div className="insight-box">{result.clinical_insight}</div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>Generated by OralScan AI Diagnostic System • {new Date().toLocaleString()}</p>
          <p>This report is generated by an AI system and should be reviewed by a qualified medical professional.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main ResultTabs Component ── */
export default function ResultTabs({ result, patient, allPredictions = [] }) {
  const [activeTab, setActiveTab] = useState('analytics');

  const tabs = [
    { id: 'analytics', label: '📊 Risk Analytics' },
    { id: 'explainability', label: '🧠 AI Explainability' },
    { id: 'report', label: '📄 Medical Report' },
  ];

  return (
    <div className="result-tabs-container">
      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-panel">
        {activeTab === 'analytics' && <TabAnalytics result={result} allPredictions={allPredictions} />}
        {activeTab === 'explainability' && <TabExplainability result={result} />}
        {activeTab === 'report' && <TabReport result={result} patient={patient} />}
      </div>
    </div>
  );
}
