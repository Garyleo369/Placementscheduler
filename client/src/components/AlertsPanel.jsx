import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export default function AlertsPanel({
  failureBreakdown = {},
  conflictInterviews = [],
  onFilterConflictCompany,
  onOpenReplanModal
}) {
  const breakdownEntries = Object.entries(failureBreakdown);
  const totalConflicts = breakdownEntries.reduce((sum, [, count]) => sum + count, 0);

  const formatReason = (reason) => {
    switch (reason) {
      case 'NO_ROOM_AVAILABLE':
        return 'No Room Available';
      case 'COMPANY_WINDOW_EXPIRED':
        return 'Company Window Expired';
      case 'NO_STUDENT_AVAILABILITY':
        return 'Student Double-Booked / Busy';
      case 'NO_PANEL_AVAILABLE':
        return 'No Panel Available';
      case 'STUDENT_WITHDREW':
        return 'Student Withdrew';
      default:
        return reason || 'Conflict';
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
          <span>Bottlenecks & Alerts</span>
        </div>
        {totalConflicts > 0 && (
          <span className="badge badge-conflict">{totalConflicts} Issues</span>
        )}
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Failure Breakdown Pills */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Unscheduled Breakdown by Constraint
          </div>
          {breakdownEntries.length === 0 ? (
            <div style={{ fontSize: '0.775rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Info size={14} /> No active bottlenecks detected.
            </div>
          ) : (
            <div className="reasons-breakdown">
              {breakdownEntries.map(([reason, count]) => (
                <div key={reason} className="reason-row">
                  <span className="reason-name">{formatReason(reason)}</span>
                  <span className="reason-count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Action Button for Coordinator */}
        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangle size={15} /> One-Click Replanner
          </div>
          <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            Surgically resolve room shortages, delays, panel drops, or student withdrawals.
          </p>
          <button
            className="btn btn-disruption btn-sm"
            style={{ width: '100%' }}
            onClick={onOpenReplanModal}
          >
            Trigger Disruption / Replan
          </button>
        </div>

        {/* Recent Conflict Highlights */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Unresolved Conflict Queue
          </div>

          {conflictInterviews.length === 0 ? (
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              No individual conflict records loaded.
            </div>
          ) : (
            <div className="alerts-list">
              {conflictInterviews.slice(0, 5).map((iv) => (
                <div key={iv._id} className="alert-item">
                  <div className="alert-header">
                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      {iv.company?.name || 'Company'}
                    </span>
                    <span className="alert-reason-tag">
                      {iv.unscheduledReason || 'CONFLICT'}
                    </span>
                  </div>
                  <div className="alert-desc">
                    Student: <strong>{iv.student?.name || 'Student'}</strong> ({iv.student?.rollNumber})
                    {iv.day && <span> • Day {iv.day}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
