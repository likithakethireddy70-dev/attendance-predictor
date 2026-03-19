import { useState, useCallback } from 'react';
import './index.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, annotationPlugin);

// ── Constants ──────────────────────────────────────────────────────────────
const THRESHOLD = 75;

// ── useAttendance hook ─────────────────────────────────────────────────────
function useAttendance() {
  const [total,    setTotal]    = useState('');
  const [attended, setAttended] = useState('');
  const [bunkNext, setBunkNext] = useState('');
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  const calculate = useCallback(() => {
    const t = parseInt(total,    10);
    const a = parseInt(attended, 10);

    if (!total || !attended)   { setError('Please fill in both fields.'); return; }
    if (isNaN(t) || isNaN(a))  { setError('Enter valid whole numbers.'); return; }
    if (t <= 0)                 { setError('Total classes must be greater than 0.'); return; }
    if (a < 0)                  { setError('Attended classes cannot be negative.'); return; }
    if (a > t)                  { setError('Attended classes cannot exceed total classes.'); return; }

    setError('');

    const percentage = (a / t) * 100;
    const isSafe     = percentage >= THRESHOLD;

    const canBunk    = isSafe  ? Math.floor(a / (THRESHOLD / 100) - t) : 0;
    const mustAttend = !isSafe ? Math.ceil((THRESHOLD / 100 * t - a) / (1 - THRESHOLD / 100)) : 0;

    setResult({ total: t, attended: a, percentage, isSafe, canBunk, mustAttend });
  }, [total, attended]);

  // Simulation: what happens if I bunk the next N classes?
  const simulation = (() => {
    if (!result) return null;
    const n = parseInt(bunkNext, 10);
    if (bunkNext === '' || isNaN(n) || n < 0) return null;
    const newTotal      = result.total + n;
    const newPercentage = (result.attended / newTotal) * 100;
    const isSafe        = newPercentage >= THRESHOLD;
    const drop          = result.percentage - newPercentage;
    return { n, newTotal, newPercentage, isSafe, drop };
  })();

  const reset = useCallback(() => {
    setTotal('');
    setAttended('');
    setBunkNext('');
    setResult(null);
    setError('');
  }, []);

  return { total, setTotal, attended, setAttended, bunkNext, setBunkNext, result, simulation, error, calculate, reset };
}

// ── ProgressBar ────────────────────────────────────────────────────────────
function ProgressBar({ percentage }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const color   = clamped >= THRESHOLD ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '0.5rem',
      }}>
        <span>Attendance</span>
        <span style={{ color, fontWeight: 700 }}>{clamped.toFixed(1)}%</span>
      </div>

      {/* Track */}
      <div style={{
        height: 10, borderRadius: 99,
        background: 'var(--bg4)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Threshold marker */}
        <div style={{
          position: 'absolute',
          left: `${THRESHOLD}%`,
          top: 0, bottom: 0,
          width: 2,
          background: 'rgba(255,255,255,0.2)',
          zIndex: 2,
        }} />
        {/* Fill */}
        <div style={{
          height: '100%',
          width: `${clamped}%`,
          borderRadius: 99,
          background: clamped >= THRESHOLD
            ? 'linear-gradient(90deg, #059669, #10b981)'
            : 'linear-gradient(90deg, #b91c1c, #ef4444)',
          animation: 'fillBar 0.8s cubic-bezier(0.22,1,0.36,1) both',
          boxShadow: `0 0 10px ${color}55`,
          transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>

      {/* 75% label */}
      <div style={{
        position: 'relative',
        height: 16,
        marginTop: 4,
      }}>
        <span style={{
          position: 'absolute',
          left: `${THRESHOLD}%`,
          transform: 'translateX(-50%)',
          fontSize: '0.68rem',
          color: 'var(--text3)',
        }}>75%</span>
      </div>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--bg3)',
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: '1rem',
      textAlign: 'center',
      animation: 'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: '0.2rem', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ── AttendanceChart ────────────────────────────────────────────────────────
function AttendanceChart({ current, predicted }) {
  const hasPredicted = predicted !== null && predicted !== undefined;

  const barColor = (pct) =>
    pct >= THRESHOLD ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.85)';
  const borderColor = (pct) =>
    pct >= THRESHOLD ? '#10b981' : '#ef4444';

  const labels = hasPredicted ? ['Current', 'Predicted'] : ['Current'];
  const values = hasPredicted ? [current, predicted] : [current];

  const data = {
    labels,
    datasets: [
      {
        label: 'Attendance %',
        data: values,
        backgroundColor: values.map(barColor),
        borderColor:      values.map(borderColor),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 56,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    scales: {
      x: {
        grid:  { display: false },
        ticks: { color: '#8b92a8', font: { size: 12, weight: '600' } },
        border: { color: 'rgba(255,255,255,0.07)' },
      },
      y: {
        min: 0,
        max: 100,
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: '#8b92a8',
          font: { size: 11 },
          callback: (v) => `${v}%`,
          stepSize: 25,
        },
        border: { color: 'rgba(255,255,255,0.07)' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1e2a',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#e8eaf0',
        bodyColor: '#8b92a8',
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y.toFixed(1)}%`,
        },
      },
      annotation: {
        annotations: {
          threshold: {
            type: 'line',
            yMin: THRESHOLD,
            yMax: THRESHOLD,
            borderColor: 'rgba(245,158,11,0.7)',
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
              display: true,
              content: '75% required',
              position: 'end',
              color: '#f59e0b',
              font: { size: 11, weight: '600' },
              backgroundColor: 'rgba(245,158,11,0.12)',
              padding: { x: 6, y: 3 },
              borderRadius: 4,
            },
          },
        },
      },
    },
  };

  return (
    <div style={{
      marginTop: '1.5rem',
      background: 'var(--bg3)',
      border: '1px solid var(--border2)',
      borderRadius: 14,
      padding: '1.25rem',
      animation: 'fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6"  y1="20" x2="6"  y2="14"/>
        </svg>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Attendance Chart
        </span>
        {hasPredicted && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.7rem', fontWeight: 600,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.2)',
            color: 'var(--accent)',
            padding: '0.15rem 0.5rem',
            borderRadius: 20,
          }}>
            + Prediction
          </span>
        )}
      </div>

      {/* Chart */}
      <div style={{ height: 200 }}>
        <Bar data={data} options={options} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text3)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981', display: 'inline-block' }} />
          Above 75%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text3)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
          Below 75%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text3)' }}>
          <span style={{ width: 16, height: 2, background: '#f59e0b', display: 'inline-block', borderRadius: 2 }} />
          Threshold
        </div>
      </div>
    </div>
  );
}

// ── SimulationCard ─────────────────────────────────────────────────────────
function SimulationCard({ simulation, bunkNext, setBunkNext }) {
  const safe  = simulation?.isSafe;
  const color = safe ? 'var(--success)' : 'var(--danger)';
  const borderColor = safe
    ? 'rgba(16,185,129,0.25)'
    : 'rgba(239,68,68,0.25)';
  const bgColor = safe
    ? 'rgba(16,185,129,0.06)'
    : 'rgba(239,68,68,0.06)';

  return (
    <div style={{
      marginTop: '1.5rem',
      background: 'var(--bg3)',
      border: '1px solid var(--border2)',
      borderRadius: 14,
      padding: '1.25rem',
      animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Future Simulation
        </span>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
          If I bunk next
        </span>
        <input
          type="number"
          min="0"
          value={bunkNext}
          onChange={(e) => setBunkNext(e.target.value)}
          placeholder="0"
          style={{
            width: 72,
            background: 'var(--bg4)',
            border: '1px solid var(--border2)',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
            color: 'var(--text)',
            fontSize: '1rem',
            fontWeight: 700,
            outline: 'none',
            textAlign: 'center',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent)';
            e.target.style.boxShadow   = '0 0 0 3px rgba(99,102,241,0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border2)';
            e.target.style.boxShadow   = 'none';
          }}
        />
        <span style={{ fontSize: '0.88rem', color: 'var(--text2)' }}>
          class{bunkNext !== '1' ? 'es' : ''}
        </span>
      </div>

      {/* Result */}
      {simulation && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: 10,
          background: bgColor,
          border: `1px solid ${borderColor}`,
          animation: 'scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {/* Percentage row */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>
              Attendance after {simulation.n} bunk{simulation.n !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>
              {simulation.newPercentage.toFixed(1)}%
            </span>
          </div>

          {/* Mini progress bar */}
          <div style={{ height: 6, borderRadius: 99, background: 'var(--bg4)', overflow: 'hidden', position: 'relative', marginBottom: '0.75rem' }}>
            <div style={{ position: 'absolute', left: `${THRESHOLD}%`, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.2)', zIndex: 2 }} />
            <div style={{
              height: '100%',
              width: `${Math.min(100, simulation.newPercentage)}%`,
              borderRadius: 99,
              background: safe
                ? 'linear-gradient(90deg, #059669, #10b981)'
                : 'linear-gradient(90deg, #b91c1c, #ef4444)',
              animation: 'fillBar 0.7s cubic-bezier(0.22,1,0.36,1) both',
              boxShadow: `0 0 8px ${color}55`,
            }} />
          </div>

          {/* Status + drop */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {safe ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )}
              <span style={{ fontSize: '0.83rem', fontWeight: 700, color }}>
                {safe ? 'Still safe' : 'Below 75% — risky!'}
              </span>
            </div>
            {simulation.drop > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                ↓ {simulation.drop.toFixed(1)}% drop
              </span>
            )}
          </div>

          {/* Insight */}
          <p style={{ marginTop: '0.6rem', fontSize: '0.76rem', color: 'var(--text3)', lineHeight: 1.5 }}>
            {safe
              ? `Bunking ${simulation.n} class${simulation.n !== 1 ? 'es' : ''} keeps you above the 75% threshold (${simulation.newTotal} total classes).`
              : `Bunking ${simulation.n} class${simulation.n !== 1 ? 'es' : ''} will drop you below 75%. Attendance will fall to ${simulation.newPercentage.toFixed(1)}%.`
            }
          </p>
        </div>
      )}

      {/* Placeholder when no input yet */}
      {!simulation && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text3)' }}>
          Enter a number above to see how bunking affects your attendance.
        </p>
      )}
    </div>
  );
}

// ── InputField ─────────────────────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{
        fontSize: '0.78rem', fontWeight: 600,
        color: 'var(--text2)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border2)',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          color: 'var(--text)',
          fontSize: '1rem',
          fontWeight: 500,
          outline: 'none',
          width: '100%',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.boxShadow   = '0 0 0 3px rgba(99,102,241,0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border2)';
          e.target.style.boxShadow   = 'none';
        }}
      />
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const { total, setTotal, attended, setAttended, bunkNext, setBunkNext, result, simulation, error, calculate, reset } = useAttendance();

  return (
    <div className="dashboard-root">
      <style>{`
        .dashboard-root {
          width: 100%;
          min-height: 100vh;
          padding: 2rem 1.5rem 3rem;
          box-sizing: border-box;
        }
        .dashboard-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.75rem;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 3fr;
          gap: 1.25rem;
          align-items: start;
          max-width: 1100px;
          margin: 0 auto;
        }
        .dash-col {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .dash-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.35);
        }
        .section-label {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text2);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .dashboard-root { padding: 1.25rem 1rem 2.5rem; }
        }
      `}</style>

      {/* ── Top header bar ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="dashboard-header">
          <div style={{
            width: 40, height: 40, flexShrink: 0,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 2.5s ease-in-out infinite',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8"  y1="2" x2="8"  y2="6"/>
              <line x1="3"  y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 800, lineHeight: 1.1,
              background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}>
              Attendance Predictor
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
              Track, analyze and simulate your attendance
            </p>
          </div>
          {result && (
            <div style={{
              marginLeft: 'auto',
              padding: '0.35rem 0.9rem',
              borderRadius: 20,
              background: result.isSafe ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.isSafe ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: result.isSafe ? '#6ee7b7' : '#fca5a5',
              fontSize: '0.78rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: result.isSafe ? '#10b981' : '#ef4444',
                display: 'inline-block',
              }} />
              {result.percentage.toFixed(1)}% — {result.isSafe ? 'Safe' : 'At Risk'}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="dashboard-grid">

        {/* ════ LEFT COLUMN ════ */}
        <div className="dash-col">

          {/* Input card */}
          <div className="dash-card">
            <div className="section-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Input Data
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <InputField label="Total Classes"    value={total}    onChange={setTotal}    placeholder="e.g. 60" />
              <InputField label="Classes Attended" value={attended} onChange={setAttended} placeholder="e.g. 45" />
            </div>

            {error && (
              <div style={{
                marginTop: '0.9rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                padding: '0.6rem 0.85rem',
                color: '#fca5a5',
                fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '0.45rem',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.1rem' }}>
              <button
                onClick={calculate}
                style={{
                  flex: 1, padding: '0.75rem',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: '0.88rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'opacity 0.2s, transform 0.1s',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                onMouseDown={(e)  => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e)    => e.currentTarget.style.transform = 'scale(1)'}
              >
                Calculate
              </button>
              <button
                onClick={reset}
                style={{
                  padding: '0.75rem 1.1rem',
                  background: 'var(--bg4)',
                  border: '1px solid var(--border2)',
                  borderRadius: 10,
                  color: 'var(--text2)', fontSize: '0.88rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Result summary card — only when calculated */}
          {result && (
            <div className="dash-card" style={{ animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
              <div className="section-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Summary
              </div>

              <ProgressBar percentage={result.percentage} />

              {/* Status badge */}
              <div style={{
                marginTop: '1rem',
                padding: '0.8rem 1rem',
                borderRadius: 10,
                background: result.isSafe ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${result.isSafe ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                display: 'flex', alignItems: 'center', gap: '0.55rem',
              }}>
                {result.isSafe ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: result.isSafe ? '#6ee7b7' : '#fca5a5' }}>
                    {result.isSafe ? 'You are safe' : 'You are below requirement'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginTop: '0.1rem' }}>
                    {result.attended} of {result.total} classes attended
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.9rem' }}>
                {result.isSafe ? (
                  <StatCard
                    label="Can still bunk"
                    value={result.canBunk}
                    color="var(--success)"
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>}
                  />
                ) : (
                  <StatCard
                    label="Need to attend"
                    value={result.mustAttend}
                    color="var(--danger)"
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                  />
                )}
                <StatCard
                  label="Attendance"
                  value={`${result.percentage.toFixed(1)}%`}
                  color={result.isSafe ? 'var(--success)' : 'var(--danger)'}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={result.isSafe ? '#10b981' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                />
              </div>

              <p style={{ marginTop: '0.85rem', fontSize: '0.76rem', color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
                {result.isSafe
                  ? `You can skip up to ${result.canBunk} more class${result.canBunk !== 1 ? 'es' : ''} and stay above 75%.`
                  : `Attend the next ${result.mustAttend} consecutive class${result.mustAttend !== 1 ? 'es' : ''} to reach 75%.`
                }
              </p>
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="dash-col">

          {/* Empty state for right column */}
          {!result && (
            <div className="dash-card" style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 320, textAlign: 'center', gap: '0.75rem',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="14"/>
              </svg>
              <p style={{ color: 'var(--text3)', fontSize: '0.88rem' }}>
                Enter your attendance data and click<br />
                <strong style={{ color: 'var(--text2)' }}>Calculate</strong> to see your dashboard
              </p>
            </div>
          )}

          {/* Chart */}
          {result && (
            <AttendanceChart
              current={result.percentage}
              predicted={simulation ? simulation.newPercentage : null}
            />
          )}

          {/* Simulation */}
          {result && (
            <SimulationCard
              simulation={simulation}
              bunkNext={bunkNext}
              setBunkNext={setBunkNext}
            />
          )}
        </div>

      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.72rem', marginTop: '1.5rem' }}>
        Minimum required attendance: 75%
      </p>
    </div>
  );
}
