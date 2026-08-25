import React, { useState, useRef } from 'react';
import { HomographyConfig, HomographyPoint } from '../types';
import {
  computeHomographyMatrix,
  DEFAULT_HOMOGRAPHY_CONFIG,
  getCalibrationMatrices,
} from '../utils/homography';
import {
  Maximize2,
  X,
  RotateCcw,
  Check,
  HelpCircle,
  Calculator,
  Compass,
} from 'lucide-react';

interface HomographyCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: HomographyConfig;
  onSaveConfig: (config: HomographyConfig) => void;
}

export const HomographyCalibrationModal: React.FC<HomographyCalibrationModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [quad, setQuad] = useState<
    [HomographyPoint, HomographyPoint, HomographyPoint, HomographyPoint]
  >([...config.srcQuad]);
  const [widthMeters, setWidthMeters] = useState<number>(
    config.realWorldWidthMeters
  );
  const [lengthMeters, setLengthMeters] = useState<number>(
    config.realWorldLengthMeters
  );
  const [activeHandle, setActiveHandle] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handlePointerDown = (index: number) => {
    setActiveHandle(index);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandle === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));

    const updated: [
      HomographyPoint,
      HomographyPoint,
      HomographyPoint,
      HomographyPoint
    ] = [quad[0], quad[1], quad[2], quad[3]];
    updated[activeHandle] = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) };
    setQuad(updated);
  };

  const handlePointerUp = () => {
    setActiveHandle(null);
  };

  const handleReset = () => {
    setQuad([...DEFAULT_HOMOGRAPHY_CONFIG.srcQuad]);
    setWidthMeters(DEFAULT_HOMOGRAPHY_CONFIG.realWorldWidthMeters);
    setLengthMeters(DEFAULT_HOMOGRAPHY_CONFIG.realWorldLengthMeters);
  };

  const handleSave = () => {
    onSaveConfig({
      srcQuad: quad,
      realWorldWidthMeters: widthMeters,
      realWorldLengthMeters: lengthMeters,
      isCalibrated: true,
      gridOverlayEnabled: true,
    });
    onClose();
  };

  // Compute live 3x3 matrix for inspection
  const matrices = getCalibrationMatrices({
    srcQuad: quad,
    realWorldWidthMeters: widthMeters,
    realWorldLengthMeters: lengthMeters,
    isCalibrated: true,
    gridOverlayEnabled: true,
  });

  const H = matrices.H;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Homography 4-Point Perspective Calibration
              </h2>
              <p className="text-xs text-slate-400">
                Maps camera pixel coordinates to real-world metric space (meters) for accurate speed estimation & lateral zigzag classification.
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

        {/* Body Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6">
          {/* Interactive Calibration Canvas (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Interactive Perspective Trapezoid Quad (Drag 4 Corner Handles)</span>
              <span className="text-[10px] text-sky-400 font-mono">0.0 - 1.0 Normalized</span>
            </label>

            <div
              className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl border border-slate-700 overflow-hidden select-none cursor-crosshair"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Simulated Road Backdrop */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* Road Trapezoid Visualization */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <polygon
                  points={`${quad[0].x * 100}%,${quad[0].y * 100}% ${quad[1].x * 100}%,${quad[1].y * 100}% ${quad[2].x * 100}%,${quad[2].y * 100}% ${quad[3].x * 100}%,${quad[3].y * 100}%`}
                  fill="rgba(56, 189, 248, 0.15)"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
                {/* Distance Grid Lines */}
                {[0.25, 0.5, 0.75].map((t, idx) => {
                  const lx = quad[0].x + (quad[3].x - quad[0].x) * t;
                  const ly = quad[0].y + (quad[3].y - quad[0].y) * t;
                  const rx = quad[1].x + (quad[2].x - quad[1].x) * t;
                  const ry = quad[1].y + (quad[2].y - quad[1].y) * t;
                  return (
                    <line
                      key={idx}
                      x1={`${lx * 100}%`}
                      y1={`${ly * 100}%`}
                      x2={`${rx * 100}%`}
                      y2={`${ry * 100}%`}
                      stroke="rgba(56, 189, 248, 0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                    />
                  );
                })}
              </svg>

              {/* Draggable Corner Handles */}
              {quad.map((pt, idx) => {
                const labels = ['Top-Left (0,0)', `Top-Right (${widthMeters}m,0)`, `Bottom-Right (${widthMeters}m,${lengthMeters}m)`, `Bottom-Left (0,${lengthMeters}m)`];
                return (
                  <div
                    key={idx}
                    onPointerDown={() => handlePointerDown(idx)}
                    style={{
                      left: `${pt.x * 100}%`,
                      top: `${pt.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute w-6 h-6 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center border-2 shadow-lg transition-transform ${
                      activeHandle === idx
                        ? 'bg-sky-400 border-white scale-125 z-20'
                        : 'bg-sky-600 border-sky-200 hover:scale-110 z-10'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-900 font-mono">
                      P{idx + 1}
                    </span>
                    <span className="absolute whitespace-nowrap -top-6 bg-slate-900/90 text-sky-300 text-[9px] px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none font-mono">
                      {labels[idx]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-300">
              {quad.map((pt, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/80 flex flex-col"
                >
                  <span className="text-[10px] text-slate-400 font-bold">
                    Handle P{idx + 1}
                  </span>
                  <span>
                    X: {pt.x.toFixed(3)}, Y: {pt.y.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-world Metric Settings & Computed Homography Matrix (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
                <Compass className="w-4 h-4 text-emerald-400" />
                Real-World Ground Truth Measurements
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span className="font-semibold">Road Width (Meters)</span>
                    <span className="font-mono text-sky-400">{widthMeters} m</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="18.0"
                    step="0.5"
                    value={widthMeters}
                    onChange={(e) => setWidthMeters(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Standard 2-lane road: 7.0–7.5m | 3-lane road: 10.5–11.0m
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span className="font-semibold">Trap Distance Length (Meters)</span>
                    <span className="font-mono text-sky-400">{lengthMeters} m</span>
                  </div>
                  <input
                    type="range"
                    min="15.0"
                    max="80.0"
                    step="1.0"
                    value={lengthMeters}
                    onChange={(e) => setLengthMeters(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Distance between nearest and farthest road cross-markers.
                  </p>
                </div>
              </div>
            </div>

            {/* Computed 3x3 Homography Matrix */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                Computed Homography Matrix [H] (3×3)
              </h3>
              <p className="text-[10px] text-slate-400 mb-2">
                Direct Linear Transformation (DLT) mapping image pixel plane to Bird&apos;s Eye View plane.
              </p>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-sky-300 space-y-1 overflow-x-auto">
                {H.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-between gap-2">
                    {row.map((val, cIdx) => (
                      <span key={cIdx} className="w-20 text-right">
                        {val.toFixed(4)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-[10px] text-slate-400 bg-slate-800/40 p-2 rounded border border-slate-700/50">
                💡 <span className="font-semibold text-slate-300">Speed Formula:</span> v = (sqrt(ΔX² + ΔY²) / Δt) × 3.6 km/h
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
              className="px-5 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Apply Calibration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
