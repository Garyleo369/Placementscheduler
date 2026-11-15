import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Play, Sparkles, Clock, DoorOpen, Users, UserX } from 'lucide-react';
import api from '../services/api';

const DISRUPTION_TYPES = [
  {
    type: 'COMPANY_DELAY',
    label: 'Company Delay',
    desc: 'Company starts late; morning slots rescheduled',
    icon: Clock,
  },
  {
    type: 'PANEL_DROP',
    label: 'Panel Drop',
    desc: 'Interviewer panel unavailable; slots shifted to sibling panels',
    icon: Users,
  },
  {
    type: 'ROOM_UNAVAILABLE',
    label: 'Room Unavailable',
    desc: 'Room blocked for a day; reallocates to free rooms',
    icon: DoorOpen,
  },
  {
    type: 'STUDENT_WITHDRAW',
    label: 'Student Withdraw',
    desc: 'Student drops placement; frees occupied interview slots',
    icon: UserX,
  },
];

export default function ReplanModal({ isOpen, onClose, onReplanSuccess }) {
  const [selectedType, setSelectedType] = useState('COMPANY_DELAY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sampleData, setSampleData] = useState(null);
  const [loadingSamples, setLoadingSamples] = useState(false);

  // Form Fields
  const [companyId, setCompanyId] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(60);
  const [affectedDays, setAffectedDays] = useState([1]);

  const [panelId, setPanelId] = useState('');

  const [roomId, setRoomId] = useState('');
  const [roomDay, setRoomDay] = useState(1);

  const [studentId, setStudentId] = useState('');

  // Fetch sample IDs whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchSamples();
    }
  }, [isOpen]);

  const fetchSamples = async () => {
    setLoadingSamples(true);
    try {
      const res = await api.getReplanSampleIds();
      if (res?.sampleIds) {
        setSampleData(res.sampleIds);
        // Pre-fill initial defaults
        if (res.sampleIds.companyId) setCompanyId(res.sampleIds.companyId);
        if (res.sampleIds.panelId) setPanelId(res.sampleIds.panelId);
        if (res.sampleIds.roomId) setRoomId(res.sampleIds.roomId);
        if (res.sampleIds.studentId) setStudentId(res.sampleIds.studentId);
      }
    } catch (err) {
      console.warn('Could not fetch sample IDs:', err);
    } finally {
      setLoadingSamples(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let payload = { type: selectedType };

      if (selectedType === 'COMPANY_DELAY') {
        if (!companyId.trim()) throw new Error('Company ID is required');
        payload.companyId = companyId.trim();
        payload.delayMinutes = Number(delayMinutes);
        if (affectedDays && affectedDays.length > 0) {
          payload.affectedDays = affectedDays.map(Number);
        }
      } else if (selectedType === 'PANEL_DROP') {
        if (!panelId.trim()) throw new Error('Panel ID is required');
        payload.panelId = panelId.trim();
      } else if (selectedType === 'ROOM_UNAVAILABLE') {
        if (!roomId.trim()) throw new Error('Room ID is required');
        payload.roomId = roomId.trim();
        if (roomDay) payload.day = Number(roomDay);
      } else if (selectedType === 'STUDENT_WITHDRAW') {
        if (!studentId.trim()) throw new Error('Student ID is required');
        payload.studentId = studentId.trim();
      }

      const result = await api.submitReplan(payload);
      onReplanSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to execute replan');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (d) => {
    if (affectedDays.includes(d)) {
      setAffectedDays(affectedDays.filter((x) => x !== d));
    } else {
      setAffectedDays([...affectedDays, d]);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
            <span>Surgical Replan / Disruption Workflow</span>
          </div>
          <button className="close-btn" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Type Picker */}
            <div className="form-group">
              <label className="form-label">Select Disruption Scenario</label>
              <div className="disruption-type-grid">
                {DISRUPTION_TYPES.map((dt) => {
                  const Icon = dt.icon;
                  const isSelected = selectedType === dt.type;
                  return (
                    <div
                      key={dt.type}
                      className={`type-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedType(dt.type)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Icon size={16} color={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} />
                        <span className="type-name">{dt.label}</span>
                      </div>
                      <span className="type-desc">{dt.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sample Quick-fill Helper */}
            {sampleData && (
              <div className="sample-ids-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} color="var(--primary)" /> Quick-Fill Sample ID from Database:
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1-Click Pre-populate</span>
                </div>

                {selectedType === 'COMPANY_DELAY' && sampleData.companyId && (
                  <button
                    type="button"
                    className="sample-btn"
                    onClick={() => {
                      setCompanyId(sampleData.companyId);
                      if (sampleData.companyOperatingDays) setAffectedDays(sampleData.companyOperatingDays);
                    }}
                  >
                    Use Sample Company: <strong>{sampleData.companyName || sampleData.companyId}</strong>
                  </button>
                )}

                {selectedType === 'PANEL_DROP' && sampleData.panelId && (
                  <button
                    type="button"
                    className="sample-btn"
                    onClick={() => setPanelId(sampleData.panelId)}
                  >
                    Use Sample Panel: <strong>{sampleData.panelName || sampleData.panelId}</strong>
                  </button>
                )}

                {selectedType === 'ROOM_UNAVAILABLE' && sampleData.roomId && (
                  <button
                    type="button"
                    className="sample-btn"
                    onClick={() => setRoomId(sampleData.roomId)}
                  >
                    Use Sample Room: <strong>{sampleData.roomNumber ? `Room ${sampleData.roomNumber}` : sampleData.roomId}</strong>
                  </button>
                )}

                {selectedType === 'STUDENT_WITHDRAW' && sampleData.studentId && (
                  <button
                    type="button"
                    className="sample-btn"
                    onClick={() => setStudentId(sampleData.studentId)}
                  >
                    Use Sample Student: <strong>{sampleData.studentName || sampleData.studentId}</strong>
                  </button>
                )}
              </div>
            )}

            {/* Dynamic Form Fields per Type */}
            {selectedType === 'COMPANY_DELAY' && (
              <>
                <div className="form-group">
                  <label className="form-label">Company ID (ObjectId)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 64df..."
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Delay in Minutes (e.g. 60, 90, 120)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    max="480"
                    className="form-control"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Affected Placement Days</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`tab-btn ${affectedDays.includes(d) ? 'active' : ''}`}
                        onClick={() => toggleDay(d)}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedType === 'PANEL_DROP' && (
              <div className="form-group">
                <label className="form-label">Panel ID (ObjectId)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 64df..."
                  value={panelId}
                  onChange={(e) => setPanelId(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Interviews assigned to this panel will be surgically moved to sibling panels without touching unaffected slots.
                </span>
              </div>
            )}

            {selectedType === 'ROOM_UNAVAILABLE' && (
              <>
                <div className="form-group">
                  <label className="form-label">Room ID (ObjectId)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 64df..."
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Disrupted Day</label>
                  <select
                    className="form-control"
                    value={roomDay}
                    onChange={(e) => setRoomDay(e.target.value)}
                  >
                    <option value="">All Days</option>
                    <option value="1">Day 1</option>
                    <option value="2">Day 2</option>
                    <option value="3">Day 3</option>
                    <option value="4">Day 4</option>
                  </select>
                </div>
              </>
            )}

            {selectedType === 'STUDENT_WITHDRAW' && (
              <div className="form-group">
                <label className="form-label">Student ID (ObjectId)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 64df..."
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  All scheduled interviews for this student will be cancelled, immediately releasing capacity for other candidates.
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-disruption" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="spinner" />
                  <span>Surgically Replanning...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>Execute Replan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
