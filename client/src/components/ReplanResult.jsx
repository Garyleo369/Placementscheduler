import React from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Sparkles,
  X,
  UserCheck,
  DoorOpen,
  Users,
  Clock,
  Zap
} from 'lucide-react';

export default function ReplanResult({ result, onDismiss }) {
  if (!result) return null;

  const {
    disruption = {},
    summary = {},
    diff = {},
    executionTimeMs = 0
  } = result;

  const movedList = diff?.moved || [];
  const cancelledList = diff?.cancelled || [];

  return (
    <div className="replan-result-section">
      {/* Banner Header */}
      <div className="replan-header">
        <div className="replan-title-group">
          <h2>
            <Zap size={20} color="#60a5fa" />
            <span>Surgical Replan Report — {disruption.type || 'Disruption Handled'}</span>
          </h2>
          <div className="replan-desc">
            {disruption.description || 'Interviews re-allocated successfully'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Executed in {executionTimeMs}ms
          </span>
          <button className="close-btn" onClick={onDismiss} title="Dismiss Replan Summary">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="replan-stats-bar">
        <div className="replan-stat-item">
          <span className="replan-stat-label">Affected Total</span>
          <span className="replan-stat-val" style={{ color: 'var(--text-main)' }}>
            {summary.affectedInterviews || 0}
          </span>
        </div>

        <div className="replan-stat-item">
          <span className="replan-stat-label">Rescheduled</span>
          <span className="replan-stat-val" style={{ color: 'var(--success)' }}>
            {summary.moved || 0}
          </span>
        </div>

        <div className="replan-stat-item">
          <span className="replan-stat-label">Cancelled</span>
          <span className="replan-stat-val" style={{ color: 'var(--danger)' }}>
            {summary.cancelled || 0}
          </span>
        </div>

        <div className="replan-stat-item">
          <span className="replan-stat-label">Locked / Preserved</span>
          <span className="replan-stat-val" style={{ color: '#93c5fd' }}>
            {summary.preserved || 0}
          </span>
        </div>

        <div className="replan-stat-item">
          <span className="replan-stat-label">Schedule Churn</span>
          <span className="replan-stat-val" style={{ color: 'var(--accent-cyan)' }}>
            {summary.replanChurn || '0%'}
          </span>
        </div>

        <div className="replan-stat-item">
          <span className="replan-stat-label">Students Affected</span>
          <span className="replan-stat-val">
            {summary.affectedStudentCount || 0}
          </span>
        </div>

        <div className="replan-stat-item">
          <span className="replan-stat-label">Rooms Affected</span>
          <span className="replan-stat-val">
            {summary.affectedRoomCount || 0}
          </span>
        </div>

        <div className="replan-stat-item">
          <span className="replan-stat-label">Panels Affected</span>
          <span className="replan-stat-val">
            {summary.affectedPanelCount || 0}
          </span>
        </div>
      </div>

      {/* Before / After Change Tables */}
      <div className="diff-diff-grid">
        {/* Rescheduled / Moved Interviews */}
        {movedList.length > 0 && (
          <div className="diff-box">
            <div className="diff-box-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
                <CheckCircle2 size={16} /> Rescheduled Interviews ({movedList.length}) — Before vs After
              </span>
              {diff.summary?.avgDisruptionScore !== undefined && (
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Avg Penalty Score: {diff.summary.avgDisruptionScore}
                </span>
              )}
            </div>

            <div className="table-container">
              <table className="diff-table">
                <thead>
                  <tr>
                    <th>Candidate & Company</th>
                    <th>Changed Dimensions</th>
                    <th>Previous Assignment (Before)</th>
                    <th style={{ width: '20px' }}></th>
                    <th>New Assignment (After)</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {movedList.map((item, idx) => (
                    <tr key={item.interviewId || idx}>
                      <td>
                        <div className="entity-primary">{item.student}</div>
                        <div className="entity-secondary">{item.company}</div>
                      </td>
                      <td>
                        {item.changedFields?.map((field) => (
                          <span key={field} className="change-tag">
                            {field.toUpperCase()}
                          </span>
                        ))}
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          <span className="day-badge">Day {item.before?.day}</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{item.before?.slot}</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {item.before?.panel} • {item.before?.room}
                        </div>
                      </td>
                      <td>
                        <ArrowRight size={14} color="var(--primary)" />
                      </td>
                      <td>
                        <div style={{ color: 'var(--success)', fontWeight: 600 }}>
                          <span className="day-badge" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                            Day {item.after?.day}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{item.after?.slot}</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                          {item.after?.panel} • {item.after?.room}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--warning)' }}>
                          +{item.disruptionScore || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cancelled / Unscheduled Interviews */}
        {cancelledList.length > 0 && (
          <div className="diff-box">
            <div className="diff-box-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)' }}>
                <AlertOctagon size={16} /> Unscheduled / Cancelled Interviews ({cancelledList.length})
              </span>
            </div>

            <div className="table-container">
              <table className="diff-table">
                <thead>
                  <tr>
                    <th>Candidate & Company</th>
                    <th>Original Slot</th>
                    <th>Original Panel & Room</th>
                    <th>Reason / Bottleneck</th>
                  </tr>
                </thead>
                <tbody>
                  {cancelledList.map((item, idx) => (
                    <tr key={item.interviewId || idx}>
                      <td>
                        <div className="entity-primary">{item.student}</div>
                        <div className="entity-secondary">{item.company}</div>
                      </td>
                      <td>
                        <span className="day-badge">Day {item.originalDay}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                          {item.originalSlot}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.originalPanel} • {item.originalRoom}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-conflict">
                          {item.reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
