import React, { useState } from 'react';
import { RuleEngineConfig } from '../types';
import {
  Sliders,
  X,
  RotateCcw,
  Check,
  ShieldAlert,
  Gauge,
  Activity,
  AlertOctagon,
} from 'lucide-react';

interface RuleEngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RuleEngineConfig;
  onSaveConfig: (config: RuleEngineConfig) => void;
}

export const DEFAULT_RULE_CONFIG: RuleEngineConfig = {
  speedLimitKmh: 50,
  overspeedToleranceKmh: 5,
  helmetConsecutiveFrames: 5, // from PDF Section 3.1
  helmetIoUThreshold: 0.25,
  zigzagVarianceThresholdMeters: 0.75, // from PDF Section 3.2
  suddenBrakingDropPct: 40, // from PDF Section 3.2 (>40% drop in <1s)
  suddenBrakingTimeWindowSec: 1.0,
  tailgatingMinDistanceMeters: 7.0,
  minDetectionConfidence: 0.5,
};

export const RuleEngineSettingsModal: React.FC<RuleEngineSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [rules, setRules] = useState<RuleEngineConfig>({ ...config });

  if (!isOpen) return null;

  const handleReset = () => {
    setRules({ ...DEFAULT_RULE_CONFIG });
  };

  const handleSave = () => {
    onSaveConfig(rules);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Violation Rule Engine Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Tune exact mathematical thresholds for helmet compliance, speed governing, lateral zigzag weaving, and sudden braking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-5 my-6 max-h-[60vh] overflow-y-auto pr-1">
          {/* Section 1: Helmet Compliance Rules */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              1. Helmet Compliance Rule Engine (IoU & Frame Buffer)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold">Consecutive Confirm Frames (N)</span>
                  <span className="font-mono text-amber-400">
                    {rules.helmetConsecutiveFrames} frames
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  step="1"
                  value={rules.helmetConsecutiveFrames}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      helmetConsecutiveFrames: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  PDF Spec Section 3.1: Minimum consecutive frames of no-helmet detection required to eliminate single-frame false positives (default: 5).
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold">Rider-Head IoU Overlap Threshold</span>
                  <span className="font-mono text-amber-400">
                    {rules.helmetIoUThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={rules.helmetIoUThreshold}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      helmetIoUThreshold: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Intersection-over-Union bounding box spatial association between rider body and head/helmet box.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Speed Estimation & Overspeeding */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
              <Gauge className="w-4 h-4 text-sky-400" />
              2. Homography Speed Estimation & Enforcement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold">Posted Speed Limit</span>
                  <span className="font-mono text-sky-400">
                    {rules.speedLimitKmh} km/h
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="5"
                  value={rules.speedLimitKmh}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      speedLimitKmh: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Design speed for active corridor segment.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold">Overspeed Tolerance Buffer</span>
                  <span className="font-mono text-sky-400">
                    +{rules.overspeedToleranceKmh} km/h
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={rules.overspeedToleranceKmh}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      overspeedToleranceKmh: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Allowance before triggering statutory enforcement citation.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Rash Driving - Zigzag & Sudden Braking */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
              <Activity className="w-4 h-4 text-purple-400" />
              3. Rash Driving & Reckless Trajectory Detection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold">Zigzag Lateral Variance (σ)</span>
                  <span className="font-mono text-purple-400">
                    {rules.zigzagVarianceThresholdMeters.toFixed(2)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="1.80"
                  step="0.05"
                  value={rules.zigzagVarianceThresholdMeters}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      zigzagVarianceThresholdMeters: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  PDF Spec Section 3.2: Lateral (x-axis) centroid oscillation threshold relative to lane width.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold">Sudden Braking Drop %</span>
                  <span className="font-mono text-orange-400">
                    &gt; {rules.suddenBrakingDropPct}% in {rules.suddenBrakingTimeWindowSec}s
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="70"
                  step="5"
                  value={rules.suddenBrakingDropPct}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      suddenBrakingDropPct: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  PDF Spec Section 3.2: Flag if speed drops by &gt;40% within under 1 second.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Rule Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
