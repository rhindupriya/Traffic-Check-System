import React, { useState } from 'react';
import { SeverityLevel, ViolationRecord, ViolationType } from '../types';
import {
  ShieldAlert,
  Search,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Zap,
  Activity,
  Sparkles,
  Filter,
} from 'lucide-react';

interface ViolationLogTableProps {
  violations: ViolationRecord[];
  onSelectViolation: (violation: ViolationRecord) => void;
  onUpdateStatus: (id: string, status: ViolationRecord['status']) => void;
  onClearLogs: () => void;
}

export const ViolationLogTable: React.FC<ViolationLogTableProps> = ({
  violations,
  onSelectViolation,
  onUpdateStatus,
  onClearLogs,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredList = violations.filter((v) => {
    if (filterType !== 'ALL' && v.type !== filterType) return false;
    if (filterSeverity !== 'ALL' && v.severity !== filterSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.plateNumber.toLowerCase().includes(q) ||
        v.trackId.toString().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    if (violations.length === 0) return;
    const headers = [
      'Violation_ID',
      'Track_ID',
      'Violation_Type',
      'Timestamp',
      'Vehicle_Type',
      'License_Plate',
      'Recorded_Speed_kmh',
      'Speed_Limit_kmh',
      'Severity',
      'Status',
      'Location',
      'Metric_Value',
      'Reason',
    ];

    const rows = violations.map((v) => [
      v.id,
      v.trackId,
      v.type,
      new Date(v.timestamp).toISOString(),
      v.vehicleType,
      v.plateNumber,
      v.speedKmh,
      v.speedLimit,
      v.severity,
      v.status,
      `"${v.location}"`,
      `"${v.ruleDetails?.metricValue || ''}"`,
      `"${v.ruleDetails?.reason || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_violations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    if (violations.length === 0) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(violations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `traffic_violations_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getViolationBadge = (type: ViolationType) => {
    switch (type) {
      case 'NO_HELMET':
        return (
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            🪖 No Helmet
          </span>
        );
      case 'OVERSPEEDING':
        return (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            ⚡ Overspeeding
          </span>
        );
      case 'ZIGZAG_WEAVING':
        return (
          <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            〰️ Rash Zigzag
          </span>
        );
      case 'SUDDEN_BRAKING':
        return (
          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            🛑 Sudden Braking
          </span>
        );
      case 'TAILGATING':
        return (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            🚗 Tailgating
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="bg-red-950 text-red-300 border border-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col gap-4">
      {/* Header & Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Structured Violation Log
              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                {violations.length} Incidents
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time audit log with telemetry snapshots, rule engine triggers, and E-Challan issuance.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-csv"
            onClick={exportCSV}
            disabled={violations.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition flex items-center gap-1.5"
            title="Export CSV Log for Law Enforcement Database"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>

          <button
            id="btn-export-json"
            onClick={exportJSON}
            disabled={violations.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition flex items-center gap-1.5"
            title="Export JSON Structured Log"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            JSON
          </button>

          {violations.length > 0 && (
            <button
              onClick={onClearLogs}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 transition"
            >
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Plate (e.g. MH-12), Track ID, or Location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-slate-100 placeholder-slate-500 w-full focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Violation Types</option>
            <option value="NO_HELMET">🪖 No Helmet</option>
            <option value="OVERSPEEDING">⚡ Overspeeding</option>
            <option value="ZIGZAG_WEAVING">〰️ Rash Zigzag</option>
            <option value="SUDDEN_BRAKING">🛑 Sudden Braking</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Snapshot</th>
              <th className="py-2.5 px-3">ID & Time</th>
              <th className="py-2.5 px-3">Violation</th>
              <th className="py-2.5 px-3">Vehicle & Plate</th>
              <th className="py-2.5 px-3">Telemetry Metric</th>
              <th className="py-2.5 px-3">Severity</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                  {violations.length === 0
                    ? 'No safety violations detected yet. Watching optical CCTV stream...'
                    : 'No violations match your active search filters.'}
                </td>
              </tr>
            ) : (
              filteredList.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-slate-800/50 transition cursor-pointer"
                  onClick={() => onSelectViolation(v)}
                >
                  {/* Thumbnail */}
                  <td className="py-2 px-3">
                    <div className="w-16 h-10 bg-slate-950 rounded border border-slate-700 overflow-hidden relative group">
                      {v.snapshotUrl ? (
                        <img
                          src={v.snapshotUrl}
                          alt="Violation Snapshot"
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-600">
                          SNAP
                        </div>
                      )}
                    </div>
                  </td>

                  {/* ID & Time */}
                  <td className="py-2 px-3 font-mono">
                    <div className="font-bold text-sky-400">#{v.trackId}</div>
                    <div className="text-[10px] text-slate-400">{v.formattedTime}</div>
                  </td>

                  {/* Violation Type */}
                  <td className="py-2 px-3">{getViolationBadge(v.type)}</td>

                  {/* Vehicle & Plate */}
                  <td className="py-2 px-3">
                    <div className="font-semibold text-slate-200">
                      {v.vehicleType}
                    </div>
                    <div className="font-mono text-[10px] bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-slate-800">
                      {v.plateNumber}
                    </div>
                  </td>

                  {/* Telemetry Metric */}
                  <td className="py-2 px-3 font-mono">
                    <div className="text-amber-300 font-bold">
                      {v.ruleDetails?.metricValue || `${v.speedKmh} km/h`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {v.ruleDetails?.threshold || `Limit: ${v.speedLimit} km/h`}
                    </div>
                  </td>

                  {/* Severity */}
                  <td className="py-2 px-3">{getSeverityBadge(v.severity)}</td>

                  {/* Status */}
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        v.status === 'CHALLAN_ISSUED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : v.status === 'VERIFIED'
                          ? 'bg-sky-950 text-sky-300 border-sky-700'
                          : v.status === 'DISMISSED'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-red-950/60 text-red-300 border-red-800/60'
                      }`}
                    >
                      {v.status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td
                    className="py-2 px-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectViolation(v)}
                        className="px-2.5 py-1 rounded bg-sky-600/80 hover:bg-sky-500 text-white font-medium text-[11px] transition flex items-center gap-1 shadow-sm"
                        title="Open Full Evidence & Generate AI E-Challan"
                      >
                        <Sparkles className="w-3 h-3" />
                        Inspect / Challan
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
