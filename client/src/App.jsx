import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Play,
  Database,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Activity
} from 'lucide-react';
import api from './services/api';
import MetricCards from './components/MetricCards';
import ScheduleTable from './components/ScheduleTable';
import AlertsPanel from './components/AlertsPanel';
import ReplanModal from './components/ReplanModal';
import ReplanResult from './components/ReplanResult';

export default function App() {
  // Global State
  const [backendHealth, setBackendHealth] = useState('CHECKING');
  const [loading, setLoading] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [generatingData, setGeneratingData] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  // Summary Metrics State
  const [summaryData, setSummaryData] = useState({
    total: 0,
    scheduled: 0,
    unscheduled: 0,
    schedulingPercentage: '0%',
  });
  const [failureBreakdown, setFailureBreakdown] = useState({});
  const [roomUtil, setRoomUtil] = useState('N/A');
  const [replanChurn, setReplanChurn] = useState('0.00%');

  // Schedule Table State
  const [interviews, setInterviews] = useState([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [tablePages, setTablePages] = useState(1);
  const [tableLimit, setTableLimit] = useState(50);
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchCompany, setSearchCompany] = useState('');

  // Conflict list for Alerts Panel
  const [conflictInterviews, setConflictInterviews] = useState([]);

  // Replanning & Modal State
  const [isReplanModalOpen, setIsReplanModalOpen] = useState(false);
  const [latestReplanResult, setLatestReplanResult] = useState(null);

  // 1. Health Check
  const checkHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      if (res?.status === 'OK') {
        setBackendHealth('ONLINE');
      } else {
        setBackendHealth('DEGRADED');
      }
    } catch {
      setBackendHealth('OFFLINE');
    }
  }, []);

  // 2. Fetch Metrics & Summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await api.getScheduleSummary();
      if (res?.success && res.summary) {
        setSummaryData(res.summary);
        setFailureBreakdown(res.failureReasonBreakdown || {});
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, []);

  // 3. Fetch Schedule Table Data
  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSchedule({
        day: selectedDay,
        status: selectedStatus,
        company: searchCompany,
        page: tablePage,
        limit: tableLimit,
      });

      if (res?.success) {
        setInterviews(res.data || []);
        setTableTotal(res.total || 0);
        setTablePages(res.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDay, selectedStatus, searchCompany, tablePage, tableLimit]);

  // 4. Fetch Conflicts for Alerts Panel
  const loadConflicts = useCallback(async () => {
    try {
      const res = await api.getSchedule({
        status: 'conflict',
        limit: 10,
      });
      if (res?.success) {
        setConflictInterviews(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching conflicts:', err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    checkHealth();
    loadSummary();
    loadConflicts();
  }, [checkHealth, loadSummary, loadConflicts]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Handle Refresh All
  const handleRefresh = async () => {
    await Promise.all([checkHealth(), loadSummary(), loadSchedule(), loadConflicts()]);
  };

  // Trigger Initial Dataset Generator
  const handleGenerateData = async () => {
    if (!window.confirm('Generate fresh placement dataset (35 companies, 800 students, 20 rooms)?')) return;
    setGeneratingData(true);
    setErrorBanner(null);
    try {
      await api.generateData({ totalStudents: 800, clearExisting: true });
      await handleGenerateSchedule(true);
    } catch (err) {
      setErrorBanner(`Failed to generate dataset: ${err.message}`);
    } finally {
      setGeneratingData(false);
    }
  };

  // Trigger Scheduler Run
  const handleGenerateSchedule = async (isAutoAfterSeed = false) => {
    if (!isAutoAfterSeed && !window.confirm('Re-run Greedy EAS Scheduler on existing dataset?')) return;
    setGeneratingSchedule(true);
    setErrorBanner(null);
    try {
      const res = await api.generateSchedule({ clearExisting: true });
      if (res?.metrics) {
        if (res.metrics.avgRoomUtilisation) {
          setRoomUtil(res.metrics.avgRoomUtilisation);
        }
      }
      setReplanChurn('0.00%');
      setLatestReplanResult(null);
      await handleRefresh();
    } catch (err) {
      setErrorBanner(`Scheduler run error: ${err.message}`);
    } finally {
      setGeneratingSchedule(false);
    }
  };

  // Replan Completed Callback
  const handleReplanSuccess = (result) => {
    setLatestReplanResult(result);
    if (result?.summary?.replanChurn) {
      setReplanChurn(result.summary.replanChurn);
    }
    // Refresh schedule data and summary metrics
    handleRefresh();
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge">
            <Activity size={18} />
            <span>PLACEMENT OPS</span>
          </div>
          <div className="header-title-group">
            <h1>Placement Week Scheduler</h1>
            <p>Institutional Placement Coordinator Operations Dashboard</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Status Badge */}
          <div
            className={`status-indicator ${
              backendHealth === 'ONLINE'
                ? 'online'
                : backendHealth === 'OFFLINE'
                ? 'offline'
                : 'online'
            }`}
          >
            <div className="status-dot" />
            <span>Backend {backendHealth}</span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            title="Refresh All Data"
          >
            <RefreshCw size={14} /> Refresh
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleGenerateData}
            disabled={generatingData || generatingSchedule}
            title="Generate 35 Companies, 800 Students, 20 Rooms"
          >
            {generatingData ? <div className="spinner" /> : <Database size={14} />}
            <span>Seed Dataset</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleGenerateSchedule(false)}
            disabled={generatingSchedule || generatingData}
            title="Execute Earliest-Available-Slot (EAS) Scheduler"
          >
            {generatingSchedule ? <div className="spinner" /> : <Play size={14} />}
            <span>Run Initial Scheduler</span>
          </button>

          <button
            className="btn btn-disruption"
            onClick={() => setIsReplanModalOpen(true)}
            title="Open Disruption Simulator"
          >
            <AlertTriangle size={15} />
            <span>One-Click Replan</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Error Banner */}
        {errorBanner && (
          <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorBanner}</span>
            <button className="close-btn" onClick={() => setErrorBanner(null)}>✕</button>
          </div>
        )}

        {/* 1. Seven Coordinator Metric Cards */}
        <section>
          <MetricCards
            metrics={summaryData}
            replanChurn={replanChurn}
            roomUtil={roomUtil}
          />
        </section>

        {/* 2. Surgical Replan Result Report Banner (if disruption just occurred) */}
        {latestReplanResult && (
          <section>
            <ReplanResult
              result={latestReplanResult}
              onDismiss={() => setLatestReplanResult(null)}
            />
          </section>
        )}

        {/* 3. Dashboard Main Grid: Schedule Table + Alerts Panel */}
        <section className="dashboard-layout">
          {/* Main Schedule Table */}
          <div>
            <ScheduleTable
              interviews={interviews}
              total={tableTotal}
              page={tablePage}
              pages={tablePages}
              limit={tableLimit}
              selectedDay={selectedDay}
              selectedStatus={selectedStatus}
              searchCompany={searchCompany}
              loading={loading}
              onDayChange={(d) => { setSelectedDay(d); setTablePage(1); }}
              onStatusChange={(s) => { setSelectedStatus(s); setTablePage(1); }}
              onSearchChange={(c) => { setSearchCompany(c); setTablePage(1); }}
              onPageChange={(p) => setTablePage(p)}
              onLimitChange={(l) => { setTableLimit(l); setTablePage(1); }}
            />
          </div>

          {/* Side Alerts & Bottleneck Panel */}
          <div>
            <AlertsPanel
              failureBreakdown={failureBreakdown}
              conflictInterviews={conflictInterviews}
              onOpenReplanModal={() => setIsReplanModalOpen(true)}
            />
          </div>
        </section>
      </main>

      {/* Replan Modal */}
      <ReplanModal
        isOpen={isReplanModalOpen}
        onClose={() => setIsReplanModalOpen(false)}
        onReplanSuccess={handleReplanSuccess}
      />
    </div>
  );
}
