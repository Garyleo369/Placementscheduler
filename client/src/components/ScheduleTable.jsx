import React from 'react';
import {
  Clock,
  Building,
  User,
  DoorOpen,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function ScheduleTable({
  interviews = [],
  total = 0,
  page = 1,
  pages = 1,
  limit = 50,
  selectedDay = 'all',
  selectedStatus = 'all',
  searchCompany = '',
  loading = false,
  onDayChange,
  onStatusChange,
  onSearchChange,
  onPageChange,
  onLimitChange,
}) {
  const dayOptions = [
    { value: 'all', label: 'All Days' },
    { value: '1', label: 'Day 1' },
    { value: '2', label: 'Day 2' },
    { value: '3', label: 'Day 3' },
    { value: '4', label: 'Day 4' },
  ];

  const getStatusBadge = (status, unscheduledReason) => {
    switch (status) {
      case 'scheduled':
        return <span className="badge badge-scheduled">Scheduled</span>;
      case 'conflict':
        return (
          <span className="badge badge-conflict" title={unscheduledReason || 'Scheduling Conflict'}>
            Conflict: {unscheduledReason || 'Unscheduled'}
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge badge-cancelled" title={unscheduledReason || 'Cancelled'}>
            Cancelled ({unscheduledReason || 'Disrupted'})
          </span>
        );
      default:
        return <span className="badge badge-conflict">{status || 'Unknown'}</span>;
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <Clock size={18} className="text-primary" />
          <span>Placement Schedule Table</span>
          <span className="badge badge-scheduled" style={{ marginLeft: '0.5rem' }}>
            {total} Total Records
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="schedule-controls">
        <div className="filter-group">
          {dayOptions.map((opt) => (
            <button
              key={opt.value}
              className={`tab-btn ${selectedDay === opt.value ? 'active' : ''}`}
              onClick={() => onDayChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Filter company..."
              className="search-input"
              value={searchCompany}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              className="select-input"
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled Only</option>
              <option value="conflict">Conflicts Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '140px' }}>Time & Day</th>
              <th>Company</th>
              <th>Student</th>
              <th>Room</th>
              <th>Panel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem' }}>
                    <div className="spinner" />
                    <span>Loading placement schedule...</span>
                  </div>
                </td>
              </tr>
            ) : interviews.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <p>No interviews found matching the current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              interviews.map((iv) => {
                const companyName = iv.company?.name || '—';
                const companyTier = iv.company?.tier || '';
                const studentName = iv.student?.name || 'Unassigned';
                const studentRoll = iv.student?.rollNumber || '';
                const studentCgpa = iv.student?.cgpa ? `CGPA ${iv.student.cgpa}` : '';
                const roomNum = iv.room?.roomNumber || '—';
                const roomBldg = iv.room?.building ? `(${iv.room.building})` : '';
                const panelName = iv.panel?.name || '—';
                const timeStr = iv.startTime && iv.endTime ? `${iv.startTime} – ${iv.endTime}` : 'No Slot';

                return (
                  <tr key={iv._id}>
                    <td>
                      <div>
                        {iv.day && <span className="day-badge">Day {iv.day}</span>}
                        <span className="time-badge">{timeStr}</span>
                      </div>
                    </td>
                    <td>
                      <div className="entity-primary">
                        {companyName}
                        {companyTier && <span className="badge-tier">{companyTier}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="entity-primary">{studentName}</div>
                      <div className="entity-secondary">
                        {studentRoll} {studentCgpa && `• ${studentCgpa}`}
                      </div>
                    </td>
                    <td>
                      <div className="entity-primary">{roomNum}</div>
                      <div className="entity-secondary">{roomBldg}</div>
                    </td>
                    <td>
                      <div className="entity-primary">{panelName}</div>
                    </td>
                    <td>
                      {getStatusBadge(iv.status, iv.unscheduledReason)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="pagination-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>
            Showing Page <strong>{page}</strong> of <strong>{pages || 1}</strong> ({total} total)
          </span>
          <select
            className="select-input"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages || loading}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
