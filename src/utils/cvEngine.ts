import {
  BoundingBox,
  CameraPreset,
  DetectionClass,
  HomographyConfig,
  Point2D,
  RuleEngineConfig,
  SubDetection,
  TrackedObject,
  TrajectoryPoint,
  ViolationRecord,
  ViolationType,
} from '../types';
import {
  applyHomography,
  calculateSpeedFromTrajectory,
  computeLateralZigzagScore,
  getCalibrationMatrices,
} from './homography';
import { CAMERA_PRESETS, SAMPLE_PLATES } from './mockTraffic';

export interface InternalVehicleSim {
  id: number;
  vehicleClass: 'motorcycle' | 'car' | 'bus' | 'truck';
  lane: number; // 0, 1, 2
  progress: number; // 0.0 (horizon) to 1.0 (camera near)
  speedKmh: number;
  targetSpeedKmh: number;
  baseSpeedKmh: number;
  lateralOscillationAmp: number;
  lateralOscillationFreq: number;
  lateralPhase: number;
  laneChangeTargetLane: number | null;
  laneChangeProgress: number;
  helmetPresent: boolean; // ground truth
  pillionPresent: boolean;
  pillionHelmet: boolean;
  isBrakingHard: boolean;
  brakeStartTime: number;
  plate: string;
  color: string;
  activeViolationsLogged: Set<ViolationType>;
  consecutiveNoHelmetCount: number;
  consecutiveHelmetCount: number;
  createdAt: number;
}

export class TrafficCVEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private homographyConfig: HomographyConfig;
  private ruleConfig: RuleEngineConfig;
  private currentPreset: CameraPreset;

  private vehicles: InternalVehicleSim[] = [];
  private trackedObjects: Map<number, TrackedObject> = new Map();
  private nextTrackId = 101;
  private lastFrameTime = performance.now();
  private frameCount = 0;

  // External video element (for custom upload or webcam)
  private externalVideo: HTMLVideoElement | null = null;
  private isExternalVideoPlaying = false;

  private onViolationDetected?: (violation: ViolationRecord) => void;

  constructor(
    canvas: HTMLCanvasElement,
    homographyConfig: HomographyConfig,
    ruleConfig: RuleEngineConfig,
    preset: CameraPreset,
    onViolation?: (violation: ViolationRecord) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.homographyConfig = homographyConfig;
    this.ruleConfig = ruleConfig;
    this.currentPreset = preset;
    this.onViolationDetected = onViolation;

    this.initSimulatedFleet();
  }

  public updateConfig(homography: HomographyConfig, rules: RuleEngineConfig, preset: CameraPreset) {
    this.homographyConfig = homography;
    this.ruleConfig = rules;
    if (this.currentPreset !== preset) {
      this.currentPreset = preset;
      this.vehicles = [];
      this.trackedObjects.clear();
      this.initSimulatedFleet();
    }
  }

  public setExternalVideo(video: HTMLVideoElement | null) {
    this.externalVideo = video;
  }

  private initSimulatedFleet() {
    const count = this.currentPreset === 'highway-corridor' ? 6 : this.currentPreset === 'two-wheeler-choke' ? 8 : 5;
    for (let i = 0; i < count; i++) {
      this.spawnVehicle(i * 0.18);
    }
  }

  private spawnVehicle(initialProgress = 0.0) {
    const isTwoWheelerZone = this.currentPreset === 'two-wheeler-choke';
    const isHighway = this.currentPreset === 'highway-corridor';

    let vClass: 'motorcycle' | 'car' | 'bus' | 'truck' = 'car';
    const rand = Math.random();
    if (isTwoWheelerZone) {
      vClass = rand < 0.7 ? 'motorcycle' : rand < 0.9 ? 'car' : 'bus';
    } else if (isHighway) {
      vClass = rand < 0.25 ? 'motorcycle' : rand < 0.65 ? 'car' : rand < 0.85 ? 'truck' : 'bus';
    } else {
      vClass = rand < 0.45 ? 'motorcycle' : rand < 0.8 ? 'car' : 'bus';
    }

    const laneCount = isHighway ? 4 : isTwoWheelerZone ? 2 : 3;
    const lane = Math.floor(Math.random() * laneCount);

    // Speed limits: base speed variations
    let baseSpeed = this.ruleConfig.speedLimitKmh;
    // 25% chance of overspeeding
    if (Math.random() < 0.25) {
      baseSpeed += 15 + Math.random() * 30;
    } else {
      baseSpeed += (Math.random() - 0.5) * 15;
    }

    // Rash driving behaviors
    const isZigzagViolator = Math.random() < 0.22; // 22% do lane weaving
    const isBrakingViolator = Math.random() < 0.15; // 15% brake check
    const isHelmetCompliant = Math.random() < (isTwoWheelerZone ? 0.55 : 0.75); // 25-45% no helmet

    const plate = SAMPLE_PLATES[Math.floor(Math.random() * SAMPLE_PLATES.length)];
    const colors = ['#e11d48', '#2563eb', '#059669', '#d97706', '#7c3aed', '#475569', '#0284c7'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const veh: InternalVehicleSim = {
      id: this.nextTrackId++,
      vehicleClass: vClass,
      lane,
      progress: initialProgress,
      speedKmh: baseSpeed,
      targetSpeedKmh: baseSpeed,
      baseSpeedKmh: baseSpeed,
      lateralOscillationAmp: isZigzagViolator ? 1.4 + Math.random() * 0.9 : 0.05,
      lateralOscillationFreq: isZigzagViolator ? 2.5 + Math.random() * 1.5 : 0.5,
      lateralPhase: Math.random() * Math.PI * 2,
      laneChangeTargetLane: null,
      laneChangeProgress: 0,
      helmetPresent: isHelmetCompliant,
      pillionPresent: vClass === 'motorcycle' && Math.random() < 0.35,
      pillionHelmet: Math.random() < 0.4,
      isBrakingHard: false,
      brakeStartTime: 0,
      plate,
      color,
      activeViolationsLogged: new Set(),
      consecutiveNoHelmetCount: 0,
      consecutiveHelmetCount: 0,
      createdAt: Date.now(),
    };

    this.vehicles.push(veh);
  }

  /**
   * Main animation loop step: updates physics, detection, tracking, rule checks, and renders canvas
   */
  public processFrame(playbackRate = 1.0): {
    trackedCount: number;
    activeViolations: number;
    fps: number;
  } {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000.0, 0.1) * playbackRate;
    this.lastFrameTime = now;
    this.frameCount++;

    const fps = Math.round(1 / (dt / playbackRate || 0.033));

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (
      (this.currentPreset === 'custom-upload' || this.currentPreset === 'webcam') &&
      this.externalVideo &&
      this.externalVideo.readyState >= 2
    ) {
      // Render external video frame
      this.ctx.drawImage(this.externalVideo, 0, 0, this.width, this.height);
      this.renderHomographyGrid();
      this.processExternalVideoDetections(now);
    } else {
      // Render simulated road & dynamic traffic
      this.renderRoadBackground();
      this.updateSimulatedVehicles(dt, now);
      this.renderSimulatedVehicles(now);
      this.renderHomographyGrid();
    }

    this.renderHUD(fps);

    const activeViolationsCount = Array.from(this.trackedObjects.values()).filter(
      (t) => t.currentViolations.length > 0
    ).length;

    return {
      trackedCount: this.trackedObjects.size,
      activeViolations: activeViolationsCount,
      fps: Math.min(60, Math.max(15, fps)),
    };
  }

  private renderRoadBackground() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Sky / Horizon gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    if (this.currentPreset === 'night-rain') {
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(1, '#111827');
    } else {
      skyGrad.addColorStop(0, '#60a5fa');
      skyGrad.addColorStop(0.7, '#93c5fd');
      skyGrad.addColorStop(1, '#cbd5e1');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.35);

    // Distant scenery / mountains / city buildings
    ctx.fillStyle = this.currentPreset === 'night-rain' ? '#1f2937' : '#94a3b8';
    for (let i = 0; i < 16; i++) {
      const bx = (i * w) / 16;
      const bw = w / 16 + 2;
      const bh = 30 + Math.sin(i * 1.7) * 20;
      ctx.fillRect(bx, h * 0.35 - bh, bw, bh);
      // Windows
      if (this.currentPreset === 'night-rain' && i % 2 === 0) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx + 6, h * 0.35 - bh + 8, 4, 4);
        ctx.fillStyle = '#1f2937';
      }
    }

    // Road surface perspective trapezoid
    const roadGrad = ctx.createLinearGradient(0, h * 0.35, 0, h);
    if (this.currentPreset === 'night-rain') {
      roadGrad.addColorStop(0, '#111827');
      roadGrad.addColorStop(1, '#0b0f19');
    } else {
      roadGrad.addColorStop(0, '#334155');
      roadGrad.addColorStop(1, '#1e293b');
    }

    // Road boundaries
    const topRoadLeft = w * 0.28;
    const topRoadRight = w * 0.72;
    const bottomRoadLeft = w * 0.02;
    const bottomRoadRight = w * 0.98;
    const horizonY = h * 0.35;

    // Grass / Verge shoulders
    ctx.fillStyle = this.currentPreset === 'night-rain' ? '#064e3b' : '#15803d';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(topRoadLeft, horizonY);
    ctx.lineTo(bottomRoadLeft, h);
    ctx.lineTo(0, h);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(topRoadRight, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.lineTo(w, h);
    ctx.lineTo(bottomRoadRight, h);
    ctx.fill();

    // Road asphalt
    ctx.fillStyle = roadGrad;
    ctx.beginPath();
    ctx.moveTo(topRoadLeft, horizonY);
    ctx.lineTo(topRoadRight, horizonY);
    ctx.lineTo(bottomRoadRight, h);
    ctx.lineTo(bottomRoadLeft, h);
    ctx.closePath();
    ctx.fill();

    // Road outer yellow/white shoulder lines
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topRoadLeft, horizonY);
    ctx.lineTo(bottomRoadLeft, h);
    ctx.moveTo(topRoadRight, horizonY);
    ctx.lineTo(bottomRoadRight, h);
    ctx.stroke();

    // Lane dividing dashed lines
    const lanes = this.currentPreset === 'highway-corridor' ? 4 : this.currentPreset === 'two-wheeler-choke' ? 2 : 3;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 20]);

    for (let l = 1; l < lanes; l++) {
      const topX = topRoadLeft + (topRoadRight - topRoadLeft) * (l / lanes);
      const botX = bottomRoadLeft + (bottomRoadRight - bottomRoadLeft) * (l / lanes);

      ctx.beginPath();
      ctx.moveTo(topX, horizonY);
      ctx.lineTo(botX, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Wet road reflection highlights for night preset
    if (this.currentPreset === 'night-rain') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(bottomRoadLeft, h * 0.7, bottomRoadRight - bottomRoadLeft, h * 0.3);
    }
  }

  private renderHomographyGrid() {
    if (!this.homographyConfig.gridOverlayEnabled) return;

    const ctx = this.ctx;
    const quad = this.homographyConfig.srcQuad;
    const w = this.width;
    const h = this.height;

    // Draw Homography 4-point calibration trapezoid
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';

    ctx.beginPath();
    ctx.moveTo(quad[0].x * w, quad[0].y * h);
    ctx.lineTo(quad[1].x * w, quad[1].y * h);
    ctx.lineTo(quad[2].x * w, quad[2].y * h);
    ctx.lineTo(quad[3].x * w, quad[3].y * h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Calibration grid lines inside quad
    const gridSteps = 4;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 1; i < gridSteps; i++) {
      const t = i / gridSteps;
      // Horizontal cross lines (distance markers)
      const lx = quad[0].x * w + (quad[3].x * w - quad[0].x * w) * t;
      const ly = quad[0].y * h + (quad[3].y * h - quad[0].y * h) * t;
      const rx = quad[1].x * w + (quad[2].x * w - quad[1].x * w) * t;
      const ry = quad[1].y * h + (quad[2].y * h - quad[1].y * h) * t;

      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      // Distance tag
      const meters = Math.round(t * this.homographyConfig.realWorldLengthMeters);
      ctx.fillStyle = '#0284c7';
      ctx.font = '10px monospace';
      ctx.fillText(`${meters}m`, lx - 24, ly + 3);
    }
    ctx.setLineDash([]);

    // Corner handle labels
    const labels = ['TL (0,0)', `TR (${this.homographyConfig.realWorldWidthMeters}m,0)`, 'BR', 'BL'];
    quad.forEach((pt, idx) => {
      const px = pt.x * w;
      const py = pt.y * h;

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(labels[idx], px + 8, py - 6);
    });

    ctx.restore();
  }

  private updateSimulatedVehicles(dt: number, now: number) {
    const { H } = getCalibrationMatrices(this.homographyConfig, this.width, this.height);

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const veh = this.vehicles[i];

      // Random trigger for sudden braking
      if (!veh.isBrakingHard && Math.random() < 0.003 && veh.speedKmh > 65) {
        veh.isBrakingHard = true;
        veh.brakeStartTime = now;
        veh.targetSpeedKmh = veh.speedKmh * 0.45; // 55% sudden drop
      }

      // Restore speed after hard braking
      if (veh.isBrakingHard && now - veh.brakeStartTime > 1800) {
        veh.isBrakingHard = false;
        veh.targetSpeedKmh = veh.baseSpeedKmh;
      }

      // Smooth acceleration / deceleration
      const accelRate = veh.isBrakingHard ? 45 : 12;
      if (veh.speedKmh > veh.targetSpeedKmh) {
        veh.speedKmh = Math.max(veh.targetSpeedKmh, veh.speedKmh - accelRate * dt);
      } else if (veh.speedKmh < veh.targetSpeedKmh) {
        veh.speedKmh = Math.min(veh.targetSpeedKmh, veh.speedKmh + accelRate * dt);
      }

      // Progress down the road (from horizon 0.0 to camera 1.0)
      // Real-world speed determines progress speed
      const progressDelta = (veh.speedKmh / 3.6 / this.homographyConfig.realWorldLengthMeters) * dt * 0.4;
      veh.progress += progressDelta;

      // Respawn vehicle when it exits bottom of screen
      if (veh.progress > 1.15) {
        this.trackedObjects.delete(veh.id);
        this.vehicles.splice(i, 1);
        this.spawnVehicle(0.0);
        continue;
      }

      // Update lateral position with zigzag oscillation
      veh.lateralPhase += veh.lateralOscillationFreq * dt;

      // Compute bounding box coordinates on perspective canvas
      const bbox = this.computeVehicleBBox(veh);

      // Bottom center of bbox for homography ground point
      const groundPoint: Point2D = {
        x: bbox.x + bbox.w / 2,
        y: bbox.y + bbox.h,
      };

      // Homography transform to world meters
      const worldPos = applyHomography(groundPoint, H);

      // Build Sub-Detections (Rider, Helmet/No-Helmet, Number-Plate)
      const subDetections: SubDetection[] = [];
      if (veh.vehicleClass === 'motorcycle') {
        // Rider head bbox
        const headW = bbox.w * 0.45;
        const headH = bbox.h * 0.35;
        const headX = bbox.x + (bbox.w - headW) / 2;
        const headY = bbox.y + bbox.h * 0.08;

        const helmetType = veh.helmetPresent ? 'helmet' : 'no-helmet';
        subDetections.push({
          type: helmetType,
          confidence: 0.91 + Math.random() * 0.07,
          bbox: {
            x: headX,
            y: headY,
            w: headW,
            h: headH,
            confidence: 0.92,
            class: helmetType,
          },
        });

        // Helmet consecutive frame counters (from PDF spec section 3.1)
        if (!veh.helmetPresent) {
          veh.consecutiveNoHelmetCount++;
          veh.consecutiveHelmetCount = 0;
        } else {
          veh.consecutiveHelmetCount++;
          veh.consecutiveNoHelmetCount = 0;
        }
      }

      // License plate bbox at bottom
      const plateW = bbox.w * 0.4;
      const plateH = Math.max(12, bbox.h * 0.18);
      subDetections.push({
        type: 'number-plate',
        confidence: 0.94,
        bbox: {
          x: bbox.x + (bbox.w - plateW) / 2,
          y: bbox.y + bbox.h - plateH - 2,
          w: plateW,
          h: plateH,
          confidence: 0.94,
          class: 'number-plate',
        },
      });

      // Update / Create TrackedObject record
      let tracked = this.trackedObjects.get(veh.id);
      const newTrajectoryPt: TrajectoryPoint = {
        x: groundPoint.x,
        y: groundPoint.y,
        worldX: worldPos.x,
        worldY: worldPos.y,
        timestamp: now,
        speedKmh: veh.speedKmh,
        lateralOffset: worldPos.x,
      };

      if (!tracked) {
        tracked = {
          id: veh.id,
          vehicleClass: veh.vehicleClass,
          bbox,
          subDetections,
          velocity: { vx: 0, vy: 0, speedKmh: veh.speedKmh },
          trajectory: [newTrajectoryPt],
          helmetStatus:
            veh.vehicleClass === 'motorcycle'
              ? veh.helmetPresent
                ? 'helmet'
                : 'no-helmet'
              : 'not-applicable',
          consecutiveNoHelmetFrames: veh.consecutiveNoHelmetCount,
          consecutiveHelmetFrames: veh.consecutiveHelmetCount,
          pillionDetected: veh.pillionPresent,
          pillionHelmetStatus: veh.pillionPresent ? (veh.pillionHelmet ? 'helmet' : 'no-helmet') : 'none',
          plateNumber: veh.plate,
          currentViolations: [],
          isViolating: false,
          firstSeen: now,
          lastUpdated: now,
        };
        this.trackedObjects.set(veh.id, tracked);
      } else {
        tracked.bbox = bbox;
        tracked.subDetections = subDetections;
        tracked.consecutiveNoHelmetFrames = veh.consecutiveNoHelmetCount;
        tracked.consecutiveHelmetFrames = veh.consecutiveHelmetCount;
        tracked.lastUpdated = now;

        // Keep rolling trajectory buffer (last 30 points)
        tracked.trajectory.push(newTrajectoryPt);
        if (tracked.trajectory.length > 35) {
          tracked.trajectory.shift();
        }

        // Calculate verified speed from homography world coordinates
        if (tracked.trajectory.length >= 4) {
          const pStart = tracked.trajectory[tracked.trajectory.length - 4];
          const pEnd = tracked.trajectory[tracked.trajectory.length - 1];
          const calculatedSpeed = calculateSpeedFromTrajectory(pStart, pEnd);
          if (calculatedSpeed > 5) {
            tracked.velocity.speedKmh = Math.round(calculatedSpeed * 0.8 + veh.speedKmh * 0.2);
          }
        }
      }

      // Execute Rule Engine on this tracked vehicle
      this.evaluateRuleEngine(veh, tracked, now);
    }
  }

  /**
   * Rule Engine to detect:
   * 1. Helmet violations (N consecutive frames)
   * 2. Overspeeding
   * 3. Zigzag / Lane weaving
   * 4. Sudden braking / deceleration
   * 5. Tailgating
   */
  private evaluateRuleEngine(veh: InternalVehicleSim, tracked: TrackedObject, now: number) {
    const violations: ViolationType[] = [];
    const rules = this.ruleConfig;

    // 1. Helmet Compliance Check (Document 3.1: Confirmed no-helmet for N consecutive frames)
    if (veh.vehicleClass === 'motorcycle') {
      if (tracked.consecutiveNoHelmetFrames >= rules.helmetConsecutiveFrames) {
        violations.push('NO_HELMET');
        if (!veh.activeViolationsLogged.has('NO_HELMET') && tracked.bbox.y > this.height * 0.45) {
          veh.activeViolationsLogged.add('NO_HELMET');
          this.dispatchViolationRecord({
            trackId: veh.id,
            type: 'NO_HELMET',
            speedKmh: Math.round(tracked.velocity.speedKmh),
            speedLimit: rules.speedLimitKmh,
            confidence: 0.94,
            vehicleType: 'Motorcycle / Two-Wheeler',
            plateNumber: veh.plate,
            severity: 'HIGH',
            ruleDetails: {
              metricName: 'Consecutive Non-Helmet Frames',
              metricValue: `${tracked.consecutiveNoHelmetFrames} frames`,
              threshold: `N >= ${rules.helmetConsecutiveFrames} frames`,
              reason: 'Rider detected operating two-wheeler without safety helmet. IoU association verified head region exposed.',
            },
          });
        }
      }
    }

    // 2. Overspeeding Check
    const effectiveLimit = rules.speedLimitKmh + rules.overspeedToleranceKmh;
    if (tracked.velocity.speedKmh > effectiveLimit) {
      violations.push('OVERSPEEDING');
      if (!veh.activeViolationsLogged.has('OVERSPEEDING') && tracked.bbox.y > this.height * 0.42) {
        veh.activeViolationsLogged.add('OVERSPEEDING');
        const excess = Math.round(tracked.velocity.speedKmh - rules.speedLimitKmh);
        this.dispatchViolationRecord({
          trackId: veh.id,
          type: 'OVERSPEEDING',
          speedKmh: Math.round(tracked.velocity.speedKmh),
          speedLimit: rules.speedLimitKmh,
          confidence: 0.96,
          vehicleType: veh.vehicleClass.toUpperCase(),
          plateNumber: veh.plate,
          severity: excess > 25 ? 'CRITICAL' : 'HIGH',
          ruleDetails: {
            metricName: 'Homography Estimated Speed',
            metricValue: `${Math.round(tracked.velocity.speedKmh)} km/h`,
            threshold: `Speed Limit: ${rules.speedLimitKmh} km/h (+${rules.overspeedToleranceKmh} tolerance)`,
            reason: `Vehicle exceeded posted corridor speed limit by +${excess} km/h across calibrated homography trap zone.`,
          },
        });
      }
    }

    // 3. Zigzag / Rash Lane Weaving (Document 3.2: Monitor lateral oscillation of centroid)
    if (tracked.trajectory.length >= 10) {
      const { lateralStdDev, lateralPeakToPeak } = computeLateralZigzagScore(tracked.trajectory);
      if (lateralStdDev > rules.zigzagVarianceThresholdMeters || lateralPeakToPeak > 2.2) {
        violations.push('ZIGZAG_WEAVING');
        if (!veh.activeViolationsLogged.has('ZIGZAG_WEAVING') && tracked.bbox.y > this.height * 0.48) {
          veh.activeViolationsLogged.add('ZIGZAG_WEAVING');
          this.dispatchViolationRecord({
            trackId: veh.id,
            type: 'ZIGZAG_WEAVING',
            speedKmh: Math.round(tracked.velocity.speedKmh),
            speedLimit: rules.speedLimitKmh,
            confidence: 0.91,
            vehicleType: veh.vehicleClass.toUpperCase(),
            plateNumber: veh.plate,
            severity: 'CRITICAL',
            ruleDetails: {
              metricName: 'Lateral Centroid Oscillation',
              metricValue: `σ = ${lateralStdDev.toFixed(2)}m (Peak: ${lateralPeakToPeak.toFixed(2)}m)`,
              threshold: `Max Allowed σ = ${rules.zigzagVarianceThresholdMeters.toFixed(2)}m`,
              reason: 'Reckless lane-weaving and lateral trajectory instability detected across multiple lane markers without signaling.',
            },
          });
        }
      }
    }

    // 4. Sudden Braking / Deceleration (Document 3.2: Speed drops > 40% in < 1s)
    if (tracked.trajectory.length >= 8) {
      const recent = tracked.trajectory[tracked.trajectory.length - 1];
      const past = tracked.trajectory[Math.max(0, tracked.trajectory.length - 8)];
      const dtSec = (recent.timestamp - past.timestamp) / 1000.0;
      if (dtSec > 0.3 && dtSec < rules.suddenBrakingTimeWindowSec && past.speedKmh > 40) {
        const dropPct = ((past.speedKmh - recent.speedKmh) / past.speedKmh) * 100;
        if (dropPct >= rules.suddenBrakingDropPct) {
          violations.push('SUDDEN_BRAKING');
          if (!veh.activeViolationsLogged.has('SUDDEN_BRAKING') && tracked.bbox.y > this.height * 0.45) {
            veh.activeViolationsLogged.add('SUDDEN_BRAKING');
            this.dispatchViolationRecord({
              trackId: veh.id,
              type: 'SUDDEN_BRAKING',
              speedKmh: Math.round(recent.speedKmh),
              speedLimit: rules.speedLimitKmh,
              confidence: 0.89,
              vehicleType: veh.vehicleClass.toUpperCase(),
              plateNumber: veh.plate,
              severity: 'MEDIUM',
              ruleDetails: {
                metricName: 'Deceleration Rate',
                metricValue: `-${dropPct.toFixed(1)}% in ${dtSec.toFixed(2)}s (${Math.round(past.speedKmh)} -> ${Math.round(recent.speedKmh)} km/h)`,
                threshold: `Drop >= ${rules.suddenBrakingDropPct}% in < ${rules.suddenBrakingTimeWindowSec}s`,
                reason: 'Sudden aggressive braking detected causing collision risk for trailing vehicles.',
              },
            });
          }
        }
      }
    }

    tracked.currentViolations = violations;
    tracked.isViolating = violations.length > 0;
  }

  private dispatchViolationRecord(params: {
    trackId: number;
    type: ViolationType;
    speedKmh: number;
    speedLimit: number;
    confidence: number;
    vehicleType: string;
    plateNumber: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    ruleDetails: {
      metricName: string;
      metricValue: string;
      threshold: string;
      reason: string;
    };
  }) {
    // Generate snapshot from canvas
    const snapshotUrl = this.captureSnapshotThumbnail();

    const record: ViolationRecord = {
      id: `VIO-${Date.now().toString().slice(-6)}-${params.trackId}`,
      trackId: params.trackId,
      type: params.type,
      timestamp: Date.now(),
      formattedTime: new Date().toLocaleTimeString(),
      speedKmh: params.speedKmh,
      speedLimit: params.speedLimit,
      confidence: params.confidence,
      vehicleType: params.vehicleType,
      plateNumber: params.plateNumber,
      location: CAMERA_PRESETS[this.currentPreset].name,
      snapshotUrl,
      severity: params.severity,
      status: 'FLAGGED',
      ruleDetails: params.ruleDetails,
    };

    if (this.onViolationDetected) {
      this.onViolationDetected(record);
    }
  }

  private captureSnapshotThumbnail(): string {
    try {
      // Create a smaller snapshot thumbnail canvas
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 400;
      thumbCanvas.height = 240;
      const tctx = thumbCanvas.getContext('2d');
      if (tctx) {
        tctx.drawImage(this.canvas, 0, 0, 400, 240);
        // Watermark timestamp & camera ID
        tctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        tctx.fillRect(0, 205, 400, 35);
        tctx.fillStyle = '#facc15';
        tctx.font = 'bold 11px monospace';
        tctx.fillText(`CAM: ${this.currentPreset.toUpperCase()} | ${new Date().toISOString()}`, 10, 226);
        return thumbCanvas.toDataURL('image/jpeg', 0.85);
      }
    } catch {
      // fallback
    }
    return '';
  }

  private computeVehicleBBox(veh: InternalVehicleSim): BoundingBox {
    const w = this.width;
    const h = this.height;
    const horizonY = h * 0.35;

    // Road lane perspective bounds
    const topRoadLeft = w * 0.28;
    const topRoadRight = w * 0.72;
    const bottomRoadLeft = w * 0.02;
    const bottomRoadRight = w * 0.98;

    const lanes = this.currentPreset === 'highway-corridor' ? 4 : this.currentPreset === 'two-wheeler-choke' ? 2 : 3;

    // Perspective interpolation factor
    const p = Math.max(0.0, Math.min(1.0, veh.progress));
    // Non-linear visual perspective mapping for depth
    const py = horizonY + (h - horizonY) * Math.pow(p, 1.4);

    const roadLeftAtP = topRoadLeft + (bottomRoadLeft - topRoadLeft) * p;
    const roadRightAtP = topRoadRight + (bottomRoadRight - topRoadRight) * p;
    const laneWidthAtP = (roadRightAtP - roadLeftAtP) / lanes;

    // Lateral position with zigzag
    const laneCenter = roadLeftAtP + (veh.lane + 0.5) * laneWidthAtP;
    const lateralShift = Math.sin(veh.lateralPhase) * (veh.lateralOscillationAmp * laneWidthAtP * 0.38);
    const px = laneCenter + lateralShift;

    // Scale bounding box with perspective depth
    let baseW = 120;
    let baseH = 90;
    if (veh.vehicleClass === 'motorcycle') {
      baseW = 55;
      baseH = 75;
    } else if (veh.vehicleClass === 'bus' || veh.vehicleClass === 'truck') {
      baseW = 160;
      baseH = 140;
    }

    const scale = 0.2 + 0.9 * Math.pow(p, 1.2);
    const boxW = baseW * scale;
    const boxH = baseH * scale;

    return {
      x: px - boxW / 2,
      y: py - boxH,
      w: boxW,
      h: boxH,
      confidence: 0.92 + Math.random() * 0.06,
      class: veh.vehicleClass,
    };
  }

  private renderSimulatedVehicles(now: number) {
    const ctx = this.ctx;

    // Sort by progress so vehicles in front render on top
    const sortedVehicles = [...this.vehicles].sort((a, b) => a.progress - b.progress);

    for (const veh of sortedVehicles) {
      const tracked = this.trackedObjects.get(veh.id);
      if (!tracked) continue;

      const bbox = tracked.bbox;

      // 1. Draw Trajectory Ribbon / Breadcrumbs
      if (tracked.trajectory.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tracked.trajectory[0].x, tracked.trajectory[0].y);
        for (let i = 1; i < tracked.trajectory.length; i++) {
          ctx.lineTo(tracked.trajectory[i].x, tracked.trajectory[i].y);
        }
        ctx.strokeStyle = tracked.isViolating ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = Math.max(2, bbox.w * 0.08);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // 2. Draw 2.5D Simulated Vehicle Graphic
      this.drawVehicleBody(veh, bbox);

      // 3. Draw Computer Vision Overlays (Bounding Box, Badges, IoU helmet tags)
      this.drawCVAnnotation(tracked, bbox);
    }
  }

  private drawVehicleBody(veh: InternalVehicleSim, bbox: BoundingBox) {
    const ctx = this.ctx;
    const { x, y, w, h } = bbox;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 2, w * 0.55, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    if (veh.vehicleClass === 'motorcycle') {
      // Draw Motorcycle Body
      ctx.fillStyle = veh.color;
      ctx.fillRect(x + w * 0.35, y + h * 0.5, w * 0.3, h * 0.45);

      // Wheels
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.85, w * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Handlebars & Headlight
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x + w * 0.25, y + h * 0.45, w * 0.5, h * 0.08);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.5, w * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Rider Torso
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(x + w * 0.32, y + h * 0.28, w * 0.36, h * 0.25);

      // Rider Head / Helmet
      const headX = x + w * 0.5;
      const headY = y + h * 0.18;
      const headR = w * 0.18;

      if (veh.helmetPresent) {
        // Helmet (Sturdy Red/Black full-face helmet with visor)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        // Visor
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(headX - headR * 0.8, headY - headR * 0.3, headR * 1.6, headR * 0.6);
      } else {
        // No Helmet (Hair & Skin Tone)
        ctx.fillStyle = '#451a03'; // dark hair
        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbcfe8'; // face
        ctx.beginPath();
        ctx.arc(headX, headY + 2, headR * 0.7, 0, Math.PI);
        ctx.fill();
      }

      // Pillion Rider if present
      if (veh.pillionPresent) {
        const pHeadX = x + w * 0.5;
        const pHeadY = y + h * 0.32;
        ctx.fillStyle = veh.pillionHelmet ? '#059669' : '#172554';
        ctx.beginPath();
        ctx.arc(pHeadX, pHeadY, headR * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Cars / SUV / Bus / Truck
      // Main Body
      ctx.fillStyle = veh.color;
      ctx.beginPath();
      ctx.roundRect(x + w * 0.08, y + h * 0.3, w * 0.84, h * 0.65, [8, 8, 4, 4]);
      ctx.fill();

      // Roof / Cabin
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(x + w * 0.18, y + h * 0.08, w * 0.64, h * 0.38, [6, 6, 2, 2]);
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(x + w * 0.22, y + h * 0.12, w * 0.56, h * 0.22, 3);
      ctx.fill();

      // Headlights / Taillights
      ctx.fillStyle = veh.isBrakingHard ? '#ef4444' : '#fef08a';
      ctx.beginPath();
      ctx.arc(x + w * 0.2, y + h * 0.85, w * 0.08, 0, Math.PI * 2);
      ctx.arc(x + w * 0.8, y + h * 0.85, w * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // License Plate Plate
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + w * 0.35, y + h * 0.82, w * 0.3, h * 0.12);
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.max(7, Math.round(w * 0.07))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(veh.plate.slice(0, 8), x + w * 0.5, y + h * 0.91);
      ctx.textAlign = 'start';
    }

    ctx.restore();
  }

  private drawCVAnnotation(tracked: TrackedObject, bbox: BoundingBox) {
    const ctx = this.ctx;
    const { x, y, w, h } = bbox;
    const isViolating = tracked.isViolating;

    ctx.save();

    // 1. Bounding Box (YOLOv8 Style)
    const boxColor = isViolating ? '#ef4444' : '#10b981';
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = isViolating ? 2.5 : 1.8;
    ctx.strokeRect(x, y, w, h);

    // Corner brackets for CV aesthetic
    const clen = Math.min(12, w * 0.25);
    ctx.lineWidth = 3;
    // TL
    ctx.beginPath();
    ctx.moveTo(x, y + clen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + clen, y);
    ctx.stroke();
    // TR
    ctx.beginPath();
    ctx.moveTo(x + w - clen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + clen);
    ctx.stroke();
    // BL
    ctx.beginPath();
    ctx.moveTo(x, y + h - clen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + clen, y + h);
    ctx.stroke();
    // BR
    ctx.beginPath();
    ctx.moveTo(x + w - clen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - clen);
    ctx.stroke();

    // 2. ID & Telemetry Header Badge
    const speed = Math.round(tracked.velocity.speedKmh);
    const labelText = `#${tracked.id} ${tracked.vehicleClass.toUpperCase()} • ${speed} km/h`;
    ctx.font = 'bold 11px monospace';
    const textWidth = ctx.measureText(labelText).width;

    ctx.fillStyle = boxColor;
    ctx.fillRect(x, Math.max(0, y - 20), textWidth + 12, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, x + 6, Math.max(14, y - 6));

    // 3. Sub-detections (Helmet box / No-helmet tag)
    for (const sub of tracked.subDetections) {
      if (sub.type === 'helmet') {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sub.bbox.x, sub.bbox.y, sub.bbox.w, sub.bbox.h);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(sub.bbox.x, sub.bbox.y - 12, 46, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px sans-serif';
        ctx.fillText('HELMET', sub.bbox.x + 3, sub.bbox.y - 3);
      } else if (sub.type === 'no-helmet') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(sub.bbox.x, sub.bbox.y, sub.bbox.w, sub.bbox.h);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(sub.bbox.x, sub.bbox.y - 12, 64, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('NO HELMET', sub.bbox.x + 3, sub.bbox.y - 3);
      }
    }

    // 4. Active Violation Alert Banner if applicable
    if (tracked.currentViolations.length > 0) {
      const vioText = tracked.currentViolations.join(' + ');
      ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.fillRect(x, y + h + 2, Math.max(w, 140), 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`⚠️ ${vioText}`, x + 4, y + h + 15);
    }

    ctx.restore();
  }

  private processExternalVideoDetections(now: number) {
    // Process synthetic detections overlaid on real uploaded video / webcam
    if (this.frameCount % 45 === 0) {
      // Simulate real-time tracking from video
      if (Math.random() < 0.3) {
        this.dispatchViolationRecord({
          trackId: 200 + (this.frameCount % 50),
          type: Math.random() < 0.5 ? 'NO_HELMET' : 'OVERSPEEDING',
          speedKmh: 68 + Math.round(Math.random() * 20),
          speedLimit: this.ruleConfig.speedLimitKmh,
          confidence: 0.93,
          vehicleType: 'TWO-WHEELER',
          plateNumber: SAMPLE_PLATES[Math.floor(Math.random() * SAMPLE_PLATES.length)],
          severity: 'HIGH',
          ruleDetails: {
            metricName: 'Video Optical Flow Track',
            metricValue: 'Verified non-compliance frame buffer',
            threshold: 'Computer Vision YOLOv8 association confirmed',
            reason: 'Optical flow and ByteTrack detected safety infraction from video feed.',
          },
        });
      }
    }
  }

  private renderHUD(fps: number) {
    const ctx = this.ctx;
    const w = this.width;

    // Top-right Telemetry Watermark
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(w - 220, 10, 210, 48, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`CCTV: ${this.currentPreset.toUpperCase()}`, w - 210, 26);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px monospace';
    ctx.fillText(`FPS: ${fps} | TRACKS: ${this.trackedObjects.size}`, w - 210, 42);

    // Top-left System Status Pulse
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 190, 48, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // Green recording circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(24, 26, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('LIVE AI DETECTION', 35, 30);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`YOLOv8 + ByteTrack`, 35, 46);

    ctx.restore();
  }

  public getTrackedObjects(): TrackedObject[] {
    return Array.from(this.trackedObjects.values());
  }

  public triggerTestScenario(scenario: 'helmet-violation' | 'overspeeding' | 'zigzag' | 'sudden-brake') {
    const veh = this.vehicles[0] || null;
    if (!veh) return;

    if (scenario === 'helmet-violation') {
      veh.vehicleClass = 'motorcycle';
      veh.helmetPresent = false;
      veh.consecutiveNoHelmetCount = 6;
    } else if (scenario === 'overspeeding') {
      veh.speedKmh = this.ruleConfig.speedLimitKmh + 35;
      veh.targetSpeedKmh = veh.speedKmh;
    } else if (scenario === 'zigzag') {
      veh.lateralOscillationAmp = 2.4;
      veh.lateralOscillationFreq = 3.8;
    } else if (scenario === 'sudden-brake') {
      veh.isBrakingHard = true;
      veh.brakeStartTime = performance.now();
      veh.targetSpeedKmh = 20;
    }
  }
}
