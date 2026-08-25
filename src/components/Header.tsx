import React from 'react';
import {
  CameraPreset,
  EvaluationMetrics,
  RuleEngineConfig,
  HomographyConfig,
} from '../types';
import { CAMERA_PRESETS } from '../utils/mockTraffic';
import {
  ShieldAlert,
  Sliders,
  Maximize2,
  BarChart3,
  Layers,
  Sparkles,
  Video,
  Upload,
  Camera,
  Activity,
} from 'lucide-react';

interface HeaderProps {
  currentPreset: CameraPreset;
  onSelectPreset: (preset: CameraPreset) => void;
  onOpenCalibration: () => void;
  onOpenRules: () => void;
  onOpenMetrics: () => void;
  onOpenArchitecture: () => void;
  onOpenSafetyAudit: () => void;
  activeViolationsCount: number;
  trackedCount: number;
  fps: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPreset,
  onSelectPreset,
  onOpenCalibration,
  onOpenRules,
  onOpenMetrics,
  onOpenArchitecture,
  onOpenSafetyAudit,
  activeViolationsCount,
  trackedCount,
  fps,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-inner">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Traffic Safety Violation Detection System
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-mono font-semibold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              YOLOv8 Helmet Compliance & Homography Rash Driving Analytics
            </p>
          </div>
        </div>

        {/* Camera Preset Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <label className="text-xs font-semibold text-slate-300 pl-2 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-sky-400" />
            Feed:
          </label>
          <select
            id="camera-preset-select"
            value={currentPreset}
            onChange={(e) => onSelectPreset(e.target.value as CameraPreset)}
            className="bg-slate-900 text-xs text-slate-100 font-medium py-1.5 px-3 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="urban-junction">Sector 4 Metro Junction (Urban 6-Lane)</option>
            <option value="highway-corridor">National Expressway NH-48 (High Speed)</option>
            <option value="two-wheeler-choke">Tech Park Flyover (Helmet Focus)</option>
            <option value="night-rain">Airport Bypass (Night Rain Cam)</option>
            <option value="custom-upload">📂 Upload CCTV / Dashcam Video</option>
            <option value="webcam">📷 Live Webcam Sensor</option>
          </select>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-calibration"
            onClick={onOpenCalibration}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1.5"
            title="Homography Perspective Warp Matrix Calibrator"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            Homography
          </button>

          <button
            id="btn-rules"
            onClick={onOpenRules}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1.5"
            title="Rule Engine Thresholds (Speed, N-Frames, Zigzag, Brake %)"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Rule Engine
          </button>

          <button
            id="btn-metrics"
            onClick={onOpenMetrics}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1.5"
            title="Evaluation Metrics (mAP@0.5, ID switches, Speed error)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            Metrics
          </button>

          <button
            id="btn-architecture"
            onClick={onOpenArchitecture}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1.5"
            title="5-Stage System Architecture Diagram"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Architecture
          </button>

          <button
            id="btn-ai-audit"
            onClick={onOpenSafetyAudit}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sm transition flex items-center gap-1.5"
            title="Generate AI Corridor Safety Audit Report"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-200" />
            AI Audit
          </button>
        </div>
      </div>
    </header>
  );
};
