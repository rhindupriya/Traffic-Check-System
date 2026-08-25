import React, { useRef, useEffect } from 'react';
import { HomographyConfig, TrackedObject } from '../types';
import { Compass } from 'lucide-react';

interface BirdEyeViewRadarProps {
  trackedObjects: TrackedObject[];
  homographyConfig: HomographyConfig;
  speedLimitKmh: number;
}

export const BirdEyeViewRadar: React.FC<BirdEyeViewRadarProps> = ({
  trackedObjects,
  homographyConfig,
  speedLimitKmh,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const roadWidthM = homographyConfig.realWorldWidthMeters;
    const roadLengthM = homographyConfig.realWorldLengthMeters;

    // Margins
    const padX = 20;
    const padY = 25;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;

    // Road surface rectangle (Bird's Eye View)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(padX, padY, plotW, plotH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padX, padY, plotW, plotH);

    // Lane dividers in BEV (assuming 2 or 3 lanes)
    const lanes = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    for (let l = 1; l < lanes; l++) {
      const lx = padX + (plotW * l) / lanes;
      ctx.beginPath();
      ctx.moveTo(lx, padY);
      ctx.lineTo(lx, padY + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Longitudinal metric distance markers (every 10m)
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    const numMarkers = 4;
    for (let i = 0; i <= numMarkers; i++) {
      const my = padY + (plotH * i) / numMarkers;
      const meters = Math.round((i / numMarkers) * roadLengthM);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.beginPath();
      ctx.moveTo(padX, my);
      ctx.lineTo(padX + plotW, my);
      ctx.stroke();
      ctx.fillText(`${meters}m`, 2, my + 3);
    }

    // Plot tracked vehicles in real-world metric space
    for (const obj of trackedObjects) {
      if (obj.trajectory.length === 0) continue;
      const latest = obj.trajectory[obj.trajectory.length - 1];

      // Map worldX (0..roadWidthM) -> (padX .. padX + plotW)
      const normX = Math.max(0, Math.min(1, latest.worldX / roadWidthM));
      const normY = Math.max(0, Math.min(1, latest.worldY / roadLengthM));

      const px = padX + normX * plotW;
      const py = padY + normY * plotH;

      const isViolating = obj.isViolating;
      const dotColor = isViolating ? '#ef4444' : '#10b981';

      // Vehicle dot & heading arrow
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(px, py, obj.vehicleClass === 'motorcycle' ? 4 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Vehicle ID & Speed tag
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`#${obj.id}`, px + 8, py - 2);

      ctx.fillStyle = isViolating ? '#f87171' : '#38bdf8';
      ctx.fillText(`${Math.round(obj.velocity.speedKmh)}k`, px + 8, py + 7);
    }
  }, [trackedObjects, homographyConfig, speedLimitKmh]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span>Bird&apos;s Eye View (BEV) Radar</span>
        </div>
        <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
          Homography Transformed
        </span>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-[220px]">
        <canvas
          ref={canvasRef}
          width={180}
          height={260}
          className="rounded-lg border border-slate-800 bg-slate-950"
        />
      </div>

      <div className="pt-2 mt-auto border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Trap: {homographyConfig.realWorldLengthMeters}m</span>
        <span>Width: {homographyConfig.realWorldWidthMeters}m</span>
        <span className="text-emerald-400">● Safe</span>
        <span className="text-red-400">● Violation</span>
      </div>
    </div>
  );
};
