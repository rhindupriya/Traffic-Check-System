import React, { useState, useCallback } from 'react';
import {
  CameraPreset,
  EvaluationMetrics,
  HomographyConfig,
  RuleEngineConfig,
  ViolationRecord,
} from './types';
import { Header } from './components/Header';
import { VideoFeedCanvas } from './components/VideoFeedCanvas';
import { ViolationLogTable } from './components/ViolationLogTable';
import { HomographyCalibrationModal } from './components/HomographyCalibrationModal';
import {
  DEFAULT_RULE_CONFIG,
  RuleEngineSettingsModal,
} from './components/RuleEngineSettingsModal';
import { ViolationDetailModal } from './components/ViolationDetailModal';
import { EvaluationMetricsDashboard } from './components/EvaluationMetricsDashboard';
import { ArchitectureViewerModal } from './components/ArchitectureViewerModal';
import { DEFAULT_HOMOGRAPHY_CONFIG } from './utils/homography';
import { INITIAL_EVALUATION_METRICS, SAMPLE_PLATES } from './utils/mockTraffic';

// Initial seed violations for instant review
const INITIAL_VIOLATIONS: ViolationRecord[] = [
  {
    id: 'VIO-849201-102',
    trackId: 102,
    type: 'NO_HELMET',
    timestamp: Date.now() - 140000,
    formattedTime: new Date(Date.now() - 140000).toLocaleTimeString(),
    speedKmh: 48,
    speedLimit: 50,
    confidence: 0.95,
    vehicleType: 'Motorcycle / Two-Wheeler',
    plateNumber: 'MH-12-DE-4821',
    location: 'Sector 4 Metro Junction (CCTV #01)',
    snapshotUrl: '',
    severity: 'HIGH',
    status: 'FLAGGED',
    ruleDetails: {
      metricName: 'Consecutive Non-Helmet Frames',
      metricValue: '7 consecutive frames',
      threshold: 'N >= 5 frames',
      reason: 'Rider detected operating motorcycle without protective headgear. Head bbox IoU overlap confirmed unhelmeted.',
    },
  },
  {
    id: 'VIO-849188-105',
    trackId: 105,
    type: 'OVERSPEEDING',
    timestamp: Date.now() - 320000,
    formattedTime: new Date(Date.now() - 320000).toLocaleTimeString(),
    speedKmh: 82,
    speedLimit: 50,
    confidence: 0.97,
    vehicleType: 'CAR',
    plateNumber: 'DL-03-CB-9942',
    location: 'Sector 4 Metro Junction (CCTV #01)',
    snapshotUrl: '',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    ruleDetails: {
      metricName: 'Homography Estimated Speed',
      metricValue: '82 km/h',
      threshold: 'Speed Limit: 50 km/h (+5 tolerance)',
      reason: 'Vehicle exceeded corridor speed limit by +32 km/h across calibrated homography perspective trap.',
    },
  },
  {
    id: 'VIO-849150-108',
    trackId: 108,
    type: 'ZIGZAG_WEAVING',
    timestamp: Date.now() - 580000,
    formattedTime: new Date(Date.now() - 580000).toLocaleTimeString(),
    speedKmh: 64,
    speedLimit: 50,
    confidence: 0.92,
    vehicleType: 'CAR',
    plateNumber: 'KA-01-MJ-6712',
    location: 'Sector 4 Metro Junction (CCTV #01)',
    snapshotUrl: '',
    severity: 'CRITICAL',
    status: 'CHALLAN_ISSUED',
    ruleDetails: {
      metricName: 'Lateral Centroid Oscillation',
      metricValue: 'σ = 1.14m (Peak: 2.6m)',
      threshold: 'Max Allowed σ = 0.75m',
      reason: 'Aggressive lane weaving and lateral trajectory oscillation detected without indicator signaling.',
    },
    aiAnalysis: {
      challanNumber: 'E-CHL-2026-99381',
      legalSection: 'Motor Vehicles Act Section 184 (Dangerous / Rash Driving)',
      penaltyFineAmount: 2500,
      executiveSummary: 'Vehicle #108 engaged in reckless lateral lane-weaving at 64 km/h creating severe collision hazards.',
      riskRating: 'CRITICAL',
      evidenceEvaluation: 'ByteTrack continuous trajectory verified rapid lateral standard deviation σ = 1.14m across 30-frame window.',
      correctiveAction: 'Issue immediate digital citation with penalty points on driver license.',
      roadSafetyNote: 'Stabilizing vehicular trajectories prevents high-impact lateral clipping collisions.',
    },
  },
];

export default function App() {
  const [currentPreset, setCurrentPreset] = useState<CameraPreset>('urban-junction');
  const [homographyConfig, setHomographyConfig] = useState<HomographyConfig>(DEFAULT_HOMOGRAPHY_CONFIG);
  const [ruleConfig, setRuleConfig] = useState<RuleEngineConfig>(DEFAULT_RULE_CONFIG);
  const [violations, setViolations] = useState<ViolationRecord[]>(INITIAL_VIOLATIONS);
  const [metrics, setMetrics] = useState<EvaluationMetrics>(INITIAL_EVALUATION_METRICS);

  // Modal States
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<ViolationRecord | null>(null);

  // Callback when a new violation is detected by CV Engine
  const handleViolationDetected = useCallback((newVio: ViolationRecord) => {
    setViolations((prev) => {
      // Check if duplicate for same track within 5 seconds
      const exists = prev.some(
        (v) => v.trackId === newVio.trackId && v.type === newVio.type && Math.abs(v.timestamp - newVio.timestamp) < 5000
      );
      if (exists) return prev;
      return [newVio, ...prev.slice(0, 99)];
    });

    setMetrics((prev) => ({
      ...prev,
      totalViolationsLogged: prev.totalViolationsLogged + 1,
    }));
  }, []);

  const handleUpdateStatus = (id: string, newStatus: ViolationRecord['status']) => {
    setViolations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
    );
    if (selectedViolation && selectedViolation.id === id) {
      setSelectedViolation((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleClearLogs = () => {
    setViolations([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Header
        currentPreset={currentPreset}
        onSelectPreset={setCurrentPreset}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenMetrics={() => setIsMetricsOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenSafetyAudit={() => setIsMetricsOpen(true)}
        activeViolationsCount={violations.length}
        trackedCount={8}
        fps={30}
      />

      {/* Main Dashboard Canvas & Controls */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Section 1: Video Feed Canvas & BEV Radar */}
        <section id="section-live-feed">
          <VideoFeedCanvas
            currentPreset={currentPreset}
            homographyConfig={homographyConfig}
            ruleConfig={ruleConfig}
            onViolationDetected={handleViolationDetected}
            onSelectPreset={setCurrentPreset}
          />
        </section>

        {/* Section 2: Structured Violation Log Table */}
        <section id="section-violation-logs">
          <ViolationLogTable
            violations={violations}
            onSelectViolation={(v) => setSelectedViolation(v)}
            onUpdateStatus={handleUpdateStatus}
            onClearLogs={handleClearLogs}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            Traffic Safety Violation Detection System • Automated Helmet Compliance & Rash Driving Detection
          </span>
          <span className="font-mono text-slate-500">
            Powered by YOLOv8, ByteTrack, cv2.findHomography & Gemini 3.7 Flash
          </span>
        </div>
      </footer>

      {/* Modals */}
      <HomographyCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        config={homographyConfig}
        onSaveConfig={setHomographyConfig}
      />

      <RuleEngineSettingsModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        config={ruleConfig}
        onSaveConfig={setRuleConfig}
      />

      <EvaluationMetricsDashboard
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        metrics={metrics}
        violations={violations}
      />

      <ArchitectureViewerModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <ViolationDetailModal
        violation={selectedViolation}
        onClose={() => setSelectedViolation(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
