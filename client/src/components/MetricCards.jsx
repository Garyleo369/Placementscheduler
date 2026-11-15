import React from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertOctagon,
  Percent,
  Layers,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function MetricCards({ metrics = {}, replanChurn = '0.00%', roomUtil = 'N/A' }) {
  const {
    total = 0,
    scheduled = 0,
    unscheduled = 0,
    schedulingPercentage = '0%'
  } = metrics;

  const cards = [
    {
      id: 'total',
      label: 'Total Interviews',
      value: total.toLocaleString(),
      subtext: 'Across all 4 placement days',
      icon: Calendar,
      colorClass: 'metric-icon-blue',
    },
    {
      id: 'scheduled',
      label: 'Scheduled Interviews',
      value: scheduled.toLocaleString(),
      subtext: 'Confirmed time & room slots',
      icon: CheckCircle2,
      colorClass: 'metric-icon-green',
    },
    {
      id: 'unscheduled',
      label: 'Unscheduled / Conflicts',
      value: unscheduled.toLocaleString(),
      subtext: 'Requires resolution or replan',
      icon: AlertOctagon,
      colorClass: 'metric-icon-red',
    },
    {
      id: 'percentage',
      label: 'Scheduling Rate',
      value: schedulingPercentage || `${total > 0 ? ((scheduled / total) * 100).toFixed(1) : 0}%`,
      subtext: 'Global placement efficiency',
      icon: Percent,
      colorClass: 'metric-icon-cyan',
    },
    {
      id: 'room-util',
      label: 'Room Utilization',
      value: roomUtil || 'N/A',
      subtext: 'Average active capacity',
      icon: Layers,
      colorClass: 'metric-icon-purple',
    },
    {
      id: 'conflicts',
      label: 'Active Conflicts',
      value: unscheduled.toLocaleString(),
      subtext: 'Hard constraint bottlenecks',
      icon: AlertTriangle,
      colorClass: 'metric-icon-amber',
    },
    {
      id: 'churn',
      label: 'Replan Churn',
      value: replanChurn || '0.00%',
      subtext: 'Disrupted schedule impact',
      icon: RefreshCw,
      colorClass: 'metric-icon-cyan',
    },
  ];

  return (
    <div className="metrics-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className="metric-card">
            <div className="metric-header">
              <span>{card.label}</span>
              <div className={`metric-icon-wrap ${card.colorClass}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="metric-value">{card.value}</div>
            <div className="metric-sub">{card.subtext}</div>
          </div>
        );
      })}
    </div>
  );
}
