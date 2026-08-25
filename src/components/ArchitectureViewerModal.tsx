import React from 'react';
import {
  Layers,
  X,
  Video,
  Scan,
  GitBranch,
  Maximize2,
  Sliders,
  FileSpreadsheet,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ArchitectureViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureViewerModal: React.FC<ArchitectureViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const modules = [
    {
      stage: 'Stage 1',
      name: 'Video Ingestion',
      icon: Video,
      responsibility: 'Read frames from CCTV, RTSP live feeds, dashcam video files, or optical webcam sensors.',
      lib: 'OpenCV / HTML5 Video Stream',
      color: 'border-sky-500/50 bg-sky-950/40 text-sky-400',
    },
    {
      stage: 'Stage 2',
      name: 'Object Detection',
      icon: Scan,
      responsibility: 'Locate vehicles, riders, helmets, no-helmets, and license plates per frame.',
      lib: 'Ultralytics YOLOv8 (Helmet Fine-Tuned)',
      color: 'border-amber-500/50 bg-amber-950/40 text-amber-400',
    },
    {
      stage: 'Stage 3',
      name: 'Multi-Object Tracking',
      icon: GitBranch,
      responsibility: 'Assign persistent IDs across frames, maintain Kalman trajectory buffers and velocity vectors.',
      lib: 'ByteTrack / Supervision',
      color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400',
    },
    {
      stage: 'Stage 4',
      name: 'Homography & Rule Engine',
      icon: Maximize2,
      responsibility: '4-Point perspective warp to real-world meters. Check N-frame helmet compliance, speed limit, zigzag oscillation, and deceleration.',
      lib: 'cv2.findHomography + Custom Logic',
      color: 'border-purple-500/50 bg-purple-950/40 text-purple-400',
    },
    {
      stage: 'Stage 5',
      name: 'Alert & Logging Layer',
      icon: FileSpreadsheet,
      responsibility: 'Annotated video canvas, CSV/DB structured logging, photographic evidence capture, and AI Gemini E-Challan issuance.',
      lib: 'SQLite / CSV / Gemini 3.7 Flash',
      color: 'border-rose-500/50 bg-rose-950/40 text-rose-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full p-6 text-slate-100 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  5-Stage System Architecture & Module Breakdown
                </h2>
                <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                  PDF Specification Blueprint
                </span>
              </div>
              <p className="text-xs text-slate-400">
                End-to-end computer vision pipeline architecture for automated road safety monitoring.
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

        {/* Pipeline Diagram Cards */}
        <div className="my-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Sequential Data Pipeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            {modules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.stage}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${mod.color} relative shadow-md`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase opacity-80">
                        {mod.stage}
                      </span>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1.5">
                      {mod.name}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {mod.responsibility}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 text-[10px] font-mono text-slate-200">
                    📦 {mod.lib}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Logic & Formulas from PDF */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <h4 className="text-xs font-bold text-sky-400 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              3.1 Helmet Compliance Verification Logic
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong>YOLOv8 Fine-Tuned Classes:</strong> rider, helmet, no-helmet, number-plate.
              </li>
              <li>
                <strong>IoU Spatial Association:</strong> For every detected rider bounding box, calculate overlap with detected helmet / no-helmet head box.
              </li>
              <li>
                <strong>N Consecutive Frame Filter:</strong> If no-helmet is confirmed for $N \ge 5$ consecutive frames, trigger violation log (eliminates single-frame false positives).
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              3.2 Rash Driving Detection Logic
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Speed Estimation:</strong> Convert pixel displacement to real-world meters via Homography transform ($cv2.findHomography$), divide by elapsed time $\Delta t$.
              </li>
              <li>
                <strong>Zigzag / Lane-Weaving:</strong> Monitor lateral ($x$-axis) oscillation variance of centroid in rolling time window relative to lane width.
              </li>
              <li>
                <strong>Sudden Deceleration:</strong> Flag if vehicle speed drops by &gt;40% in under 1 second.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close Architecture
          </button>
        </div>
      </div>
    </div>
  );
};
