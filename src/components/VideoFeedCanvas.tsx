import React, { useRef, useEffect, useState } from 'react';
import {
  CameraPreset,
  HomographyConfig,
  RuleEngineConfig,
  TrackedObject,
  ViolationRecord,
} from '../types';
import { TrafficCVEngine } from '../utils/cvEngine';
import { CAMERA_PRESETS } from '../utils/mockTraffic';
import { BirdEyeViewRadar } from './BirdEyeViewRadar';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  Grid,
  Zap,
  ShieldAlert,
  Sliders,
  AlertTriangle,
  Upload,
  Gauge,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface VideoFeedCanvasProps {
  currentPreset: CameraPreset;
  homographyConfig: HomographyConfig;
  ruleConfig: RuleEngineConfig;
  onViolationDetected: (violation: ViolationRecord) => void;
  onSelectPreset: (preset: CameraPreset) => void;
}

export const VideoFeedCanvas: React.FC<VideoFeedCanvasProps> = ({
  currentPreset,
  homographyConfig,
  ruleConfig,
  onViolationDetected,
  onSelectPreset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<TrafficCVEngine | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const [fps, setFps] = useState(30);
  const [activeViolationsCount, setActiveViolationsCount] = useState(0);

  // File upload state
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  // Initialize and update engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new TrafficCVEngine(
      canvas,
      { ...homographyConfig, gridOverlayEnabled: gridEnabled },
      ruleConfig,
      currentPreset,
      onViolationDetected
    );
    engineRef.current = engine;

    if (videoRef.current && (currentPreset === 'custom-upload' || currentPreset === 'webcam')) {
      engine.setExternalVideo(videoRef.current);
    }

    let animationFrameId: number;

    const loop = () => {
      if (isPlaying && engineRef.current) {
        const stats = engineRef.current.processFrame(playbackSpeed);
        setFps(stats.fps);
        setActiveViolationsCount(stats.activeViolations);
        setTrackedObjects(engineRef.current.getTrackedObjects());
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentPreset]);

  // Keep engine config in sync
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(
        { ...homographyConfig, gridOverlayEnabled: gridEnabled },
        ruleConfig,
        currentPreset
      );
    }
  }, [homographyConfig, ruleConfig, gridEnabled, currentPreset]);

  // Handle Video Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedVideoUrl(url);
      onSelectPreset('custom-upload');
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.play();
        if (engineRef.current) {
          engineRef.current.setExternalVideo(videoRef.current);
        }
      }
    }
  };

  // Handle Webcam start
  const handleStartWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsWebcamActive(true);
        onSelectPreset('webcam');
        if (engineRef.current) {
          engineRef.current.setExternalVideo(videoRef.current);
        }
      }
    } catch (err) {
      alert('Could not access webcam device. Please verify camera permissions.');
    }
  };

  const triggerScenario = (scenario: 'helmet-violation' | 'overspeeding' | 'zigzag' | 'sudden-brake') => {
    if (engineRef.current) {
      engineRef.current.triggerTestScenario(scenario);
    }
  };

  const presetInfo = CAMERA_PRESETS[currentPreset];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Main Stream Player Column (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-3">
        {/* Stream Header Info Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                {presetInfo.name}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {presetInfo.location} • Speed Limit: <span className="text-amber-400 font-bold">{presetInfo.speedLimitKmh} km/h</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              ⚡ {fps} FPS
            </span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              🚘 {trackedObjects.length} Active Tracks
            </span>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl aspect-[16/9] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            className="w-full h-full object-contain"
          />

          {/* Hidden video element for custom file / webcam inputs */}
          <video
            ref={videoRef}
            playsInline
            muted
            loop
            className="hidden"
          />

          {/* Upload Drop Overlay when in custom-upload mode and no file loaded */}
          {currentPreset === 'custom-upload' && !uploadedVideoUrl && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Upload className="w-12 h-12 text-sky-400 mb-3 animate-bounce" />
              <h3 className="text-base font-bold text-white mb-1">
                Upload CCTV / Dashcam Traffic Video
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Upload MP4 or WebM video footage to execute real-time YOLOv8 helmet detection and homography rash driving rule checks.
              </p>
              <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition shadow-md">
                Select Video File
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Webcam mode activator overlay */}
          {currentPreset === 'webcam' && !isWebcamActive && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Camera className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                Activate Live Webcam Sensor
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Run optical detection on local camera for helmet compliance & bounding box tracking.
              </p>
              <button
                onClick={handleStartWebcam}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition shadow-md"
              >
                Allow & Start Camera
              </button>
            </div>
          )}
        </div>

        {/* Player Controls & Test Scenario Triggers Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              id="btn-play-pause"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
              title={isPlaying ? 'Pause Stream' : 'Resume Stream'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Playback Speed Switcher */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-mono">
              {[0.5, 1.0, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackSpeed(rate)}
                  className={`px-2 py-1 rounded-md transition ${
                    playbackSpeed === rate
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Grid Overlay Toggle */}
            <button
              id="btn-toggle-grid"
              onClick={() => setGridEnabled(!gridEnabled)}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                gridEnabled
                  ? 'bg-slate-800 text-sky-400 border-sky-500/40'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700'
              }`}
              title="Toggle Homography Calibration Trap Grid"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Trap Grid</span>
            </button>
          </div>

          {/* Test Violation Injection Triggers */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Test Scenario:
            </span>

            <button
              id="btn-test-helmet"
              onClick={() => triggerScenario('helmet-violation')}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/50 transition"
              title="Inject Helmet-less Motorcycle Rider"
            >
              🪖 No Helmet
            </button>

            <button
              id="btn-test-overspeed"
              onClick={() => triggerScenario('overspeeding')}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800/50 transition"
              title="Inject Overspeeding Vehicle (>80 km/h)"
            >
              ⚡ Overspeed
            </button>

            <button
              id="btn-test-zigzag"
              onClick={() => triggerScenario('zigzag')}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-800/50 transition"
              title="Inject Rash Zigzag / Lane-Weaving Motion"
            >
              〰️ Zigzag Weave
            </button>

            <button
              id="btn-test-brake"
              onClick={() => triggerScenario('sudden-brake')}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-orange-950/70 hover:bg-orange-900 text-orange-300 border border-orange-800/50 transition"
              title="Inject Sudden Deceleration (>40% drop in <1s)"
            >
              🛑 Brake Check
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Live Radar + Active Telemetry (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        {/* Bird's Eye View Radar Map */}
        <div className="h-[280px]">
          <BirdEyeViewRadar
            trackedObjects={trackedObjects}
            homographyConfig={homographyConfig}
            speedLimitKmh={presetInfo.speedLimitKmh}
          />
        </div>

        {/* Live Multi-Object Tracking Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 shadow-lg flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              ByteTrack Live Telemetry
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              {trackedObjects.length} Targets
            </span>
          </div>

          <div className="overflow-y-auto flex-1 max-h-[220px] space-y-1.5 pr-1 text-xs">
            {trackedObjects.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Scanning optical frame for vehicles...
              </div>
            ) : (
              trackedObjects.map((obj) => {
                const speed = Math.round(obj.velocity.speedKmh);
                const isOver = speed > presetInfo.speedLimitKmh;

                return (
                  <div
                    key={obj.id}
                    className={`p-2 rounded-lg border transition flex items-center justify-between ${
                      obj.isViolating
                        ? 'bg-red-950/40 border-red-800/60 text-red-200'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sky-400">
                          #{obj.id}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-300">
                          {obj.vehicleClass}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded">
                          {obj.plateNumber}
                        </span>
                      </div>

                      {/* Sub-status badges */}
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        {obj.vehicleClass === 'motorcycle' && (
                          <span
                            className={`flex items-center gap-1 font-semibold ${
                              obj.helmetStatus === 'helmet'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {obj.helmetStatus === 'helmet' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {obj.helmetStatus === 'helmet' ? 'Helmet ON' : 'No Helmet'}
                          </span>
                        )}

                        {obj.currentViolations.length > 0 && (
                          <span className="bg-red-500/20 text-red-300 font-bold px-1.5 py-0.5 rounded text-[9px]">
                            {obj.currentViolations.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Speed indicator */}
                    <div className="text-right font-mono">
                      <div
                        className={`font-bold text-sm ${
                          isOver ? 'text-red-400' : 'text-slate-100'
                        }`}
                      >
                        {speed} <span className="text-[10px] font-normal">km/h</span>
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {isOver ? `+${speed - presetInfo.speedLimitKmh} km/h` : 'Compliant'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
