export type DetectionClass =
  | 'rider'
  | 'helmet'
  | 'no-helmet'
  | 'number-plate'
  | 'motorcycle'
  | 'car'
  | 'bus'
  | 'truck';

export type ViolationType =
  | 'NO_HELMET'
  | 'OVERSPEEDING'
  | 'ZIGZAG_WEAVING'
  | 'SUDDEN_BRAKING'
  | 'TAILGATING';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ViolationStatus = 'FLAGGED' | 'VERIFIED' | 'CHALLAN_ISSUED' | 'DISMISSED';

export interface BoundingBox {
  x: number; // top-left x (0..1 normalized or pixels)
  y: number; // top-left y (0..1 normalized or pixels)
  w: number; // width
  h: number; // height
  confidence: number;
  class: DetectionClass;
}

export interface SubDetection {
  type: 'helmet' | 'no-helmet' | 'number-plate';
  bbox: BoundingBox;
  confidence: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  worldX: number; // meters from homography
  worldY: number; // meters from homography
  timestamp: number;
  speedKmh: number;
  lateralOffset: number;
}

export interface TrackedObject {
  id: number;
  vehicleClass: 'motorcycle' | 'car' | 'bus' | 'truck';
  bbox: BoundingBox;
  subDetections: SubDetection[];
  velocity: {
    vx: number;
    vy: number;
    speedKmh: number;
  };
  trajectory: TrajectoryPoint[];
  helmetStatus: 'helmet' | 'no-helmet' | 'unknown' | 'not-applicable';
  consecutiveNoHelmetFrames: number;
  consecutiveHelmetFrames: number;
  pillionDetected: boolean;
  pillionHelmetStatus: 'helmet' | 'no-helmet' | 'none';
  plateNumber: string;
  currentViolations: ViolationType[];
  isViolating: boolean;
  firstSeen: number;
  lastUpdated: number;
}

export interface ViolationRecord {
  id: string;
  trackId: number;
  type: ViolationType;
  timestamp: number;
  formattedTime: string;
  speedKmh: number;
  speedLimit: number;
  confidence: number;
  vehicleType: string;
  plateNumber: string;
  location: string;
  snapshotUrl: string;
  severity: SeverityLevel;
  status: ViolationStatus;
  ruleDetails: {
    reason: string;
    metricValue: string;
    threshold: string;
    metricName: string;
  };
  aiAnalysis?: {
    challanNumber: string;
    legalSection: string;
    penaltyFineAmount: number;
    executiveSummary: string;
    riskRating: string;
    evidenceEvaluation: string;
    correctiveAction: string;
    roadSafetyNote: string;
  };
}

export interface HomographyPoint {
  x: number;
  y: number;
}

export interface HomographyConfig {
  srcQuad: [HomographyPoint, HomographyPoint, HomographyPoint, HomographyPoint]; // TL, TR, BR, BL
  realWorldWidthMeters: number; // width in meters (e.g. 7.5m)
  realWorldLengthMeters: number; // length in meters (e.g. 30.0m)
  isCalibrated: boolean;
  gridOverlayEnabled: boolean;
}

export interface RuleEngineConfig {
  speedLimitKmh: number;
  overspeedToleranceKmh: number;
  helmetConsecutiveFrames: number; // N frames to confirm (e.g. 5)
  helmetIoUThreshold: number; // e.g. 0.25
  zigzagVarianceThresholdMeters: number; // lateral oscillation e.g. 0.75m
  suddenBrakingDropPct: number; // e.g. 40%
  suddenBrakingTimeWindowSec: number; // e.g. 1.0s
  tailgatingMinDistanceMeters: number; // e.g. 7.0m
  minDetectionConfidence: number; // e.g. 0.50
}

export interface EvaluationMetrics {
  mAP50: number; // Target >0.85
  trackingIdSwitchesPct: number; // Target <5%
  speedEstimationErrorPct: number; // Target <10%
  falsePositiveRatePct: number; // Target <10%
  totalFramesProcessed: number;
  totalVehiclesTracked: number;
  totalViolationsLogged: number;
  helmetComplianceRatePct: number;
  averageSpeedKmh: number;
}

export type CameraPreset =
  | 'urban-junction'
  | 'highway-corridor'
  | 'two-wheeler-choke'
  | 'night-rain'
  | 'custom-upload'
  | 'webcam';
