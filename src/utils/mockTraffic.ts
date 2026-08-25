import { CameraPreset } from '../types';

export interface ScenePresetInfo {
  id: CameraPreset;
  name: string;
  location: string;
  speedLimitKmh: number;
  description: string;
  lanes: number;
  roadType: string;
  weather: string;
  lighting: string;
}

export const CAMERA_PRESETS: Record<CameraPreset, ScenePresetInfo> = {
  'urban-junction': {
    id: 'urban-junction',
    name: 'Sector 4 Metro Junction (CCTV #01)',
    location: '4th Avenue & Grand Trunk Crossroad, Sector 4',
    speedLimitKmh: 50,
    description: 'High-density mixed urban corridor with heavy two-wheeler traffic and lane weaving.',
    lanes: 3,
    roadType: 'Urban Arterial (6-Lane Divided)',
    weather: 'Clear Daylight',
    lighting: 'Daylight 1200 Lux',
  },
  'highway-corridor': {
    id: 'highway-corridor',
    name: 'National Expressway NH-48 (Gantry #12)',
    location: 'Km 34.8 Expressway Speed Enforcement Zone',
    speedLimitKmh: 80,
    description: 'High-speed 4-lane expressway corridor with overspeeding, tailgating, and sudden deceleration events.',
    lanes: 4,
    roadType: 'Controlled Access Expressway',
    weather: 'Overcast / Mild Haze',
    lighting: 'Daylight 850 Lux',
  },
  'two-wheeler-choke': {
    id: 'two-wheeler-choke',
    name: 'Tech Park South Flyover (CCTV #07)',
    location: 'Outer Ring Road Flyover Approach',
    speedLimitKmh: 45,
    description: 'High frequency of helmet compliance infractions, pillion rider violations, and triple riding.',
    lanes: 2,
    roadType: 'Elevated Flyover Ramp',
    weather: 'Clear Afternoon',
    lighting: 'Daylight 1500 Lux',
  },
  'night-rain': {
    id: 'night-rain',
    name: 'Airport Bypass (Night Patrol Cam #03)',
    location: 'North Bypass Toll Plaza Approach',
    speedLimitKmh: 60,
    description: 'Low-light wet asphalt conditions with glare, rash overtaking, and brake checks.',
    lanes: 3,
    roadType: 'Suburban Bypass Highway',
    weather: 'Wet Road / Night Rain',
    lighting: 'Sodium Vapor Lamp 150 Lux',
  },
  'custom-upload': {
    id: 'custom-upload',
    name: 'Custom CCTV / Dashcam Video File',
    location: 'User-Specified Video Stream',
    speedLimitKmh: 60,
    description: 'Analyze real uploaded MP4/WebM video footage with automated YOLOv8 and ByteTrack pipeline.',
    lanes: 2,
    roadType: 'Custom Uploaded Source',
    weather: 'Variable',
    lighting: 'Variable',
  },
  'webcam': {
    id: 'webcam',
    name: 'Live Webcam Stream (Computer Vision Mode)',
    location: 'Local Optical Sensor / Test Bench',
    speedLimitKmh: 40,
    description: 'Real-time camera feed testing helmet compliance, motion tracking, and bounding box validation.',
    lanes: 1,
    roadType: 'Local Test Camera',
    weather: 'Indoor / Test Environment',
    lighting: 'Ambient',
  },
};

export const SAMPLE_PLATES = [
  'MH-12-DE-4821',
  'DL-03-CB-9942',
  'KA-01-MJ-6712',
  'TN-09-BN-3320',
  'UP-16-AX-7751',
  'TS-08-EK-1109',
  'HR-26-DQ-5544',
  'GJ-01-WR-8833',
  'WB-02-KL-4091',
  'RJ-14-CZ-2201',
];

export const INITIAL_EVALUATION_METRICS = {
  mAP50: 0.887, // Target: >0.85
  trackingIdSwitchesPct: 2.3, // Target: <5%
  speedEstimationErrorPct: 4.6, // Target: <10%
  falsePositiveRatePct: 3.9, // Target: <10%
  totalFramesProcessed: 14280,
  totalVehiclesTracked: 894,
  totalViolationsLogged: 67,
  helmetComplianceRatePct: 78.4,
  averageSpeedKmh: 53.2,
};
