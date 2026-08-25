import { HomographyConfig, HomographyPoint, Point2D } from '../types';

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

/**
 * Solves 8 linear equations for 4-point perspective homography
 * Mapping src points -> dst points: (x, y) -> (X, Y)
 */
export function computeHomographyMatrix(
  src: [HomographyPoint, HomographyPoint, HomographyPoint, HomographyPoint],
  dst: [HomographyPoint, HomographyPoint, HomographyPoint, HomographyPoint]
): Matrix3x3 {
  // Construct 8x8 system for DLT
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const x = src[i].x;
    const y = src[i].y;
    const X = dst[i].x;
    const Y = dst[i].y;

    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);

    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }

  // Gaussian elimination with partial pivoting
  const h = solveLinearSystem8(A, b);

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0],
  ];
}

function solveLinearSystem8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows
    const tmp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = tmp;

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-9) continue;

    for (let j = i; j <= n; j++) {
      M[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Apply 3x3 Homography transform to 2D image coordinate (pixel or normalized)
 * Returns world coordinates in meters (X: lateral, Y: longitudinal)
 */
export function applyHomography(pt: Point2D, H: Matrix3x3): Point2D {
  const x = pt.x;
  const y = pt.y;

  const denom = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(denom) < 1e-9) {
    return { x: 0, y: 0 };
  }

  const worldX = (H[0][0] * x + H[0][1] * y + H[0][2]) / denom;
  const worldY = (H[1][0] * x + H[1][1] * y + H[1][2]) / denom;

  return { x: worldX, y: worldY };
}

/**
 * Compute the inverse of a 3x3 matrix
 */
export function invertMatrix3x3(M: Matrix3x3): Matrix3x3 {
  const det =
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

  if (Math.abs(det) < 1e-9) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  const invDet = 1.0 / det;

  return [
    [
      (M[1][1] * M[2][2] - M[1][2] * M[2][1]) * invDet,
      (M[0][2] * M[2][1] - M[0][1] * M[2][2]) * invDet,
      (M[0][1] * M[1][2] - M[0][2] * M[1][1]) * invDet,
    ],
    [
      (M[1][2] * M[2][0] - M[1][0] * M[2][2]) * invDet,
      (M[0][0] * M[2][2] - M[0][2] * M[2][0]) * invDet,
      (M[0][2] * M[1][0] - M[0][0] * M[1][2]) * invDet,
    ],
    [
      (M[1][0] * M[2][1] - M[1][1] * M[2][0]) * invDet,
      (M[0][1] * M[2][0] - M[0][0] * M[2][1]) * invDet,
      (M[0][0] * M[1][1] - M[0][1] * M[1][0]) * invDet,
    ],
  ];
}

/**
 * Default standard highway / urban trap corridor calibration
 */
export const DEFAULT_HOMOGRAPHY_CONFIG: HomographyConfig = {
  // Quad points in normalized coords (0..1)
  srcQuad: [
    { x: 0.32, y: 0.28 }, // Top-Left
    { x: 0.68, y: 0.28 }, // Top-Right
    { x: 0.94, y: 0.92 }, // Bottom-Right
    { x: 0.06, y: 0.92 }, // Bottom-Left
  ],
  realWorldWidthMeters: 7.5, // 2 standard 3.75m traffic lanes
  realWorldLengthMeters: 40.0, // 40 meter trap zone
  isCalibrated: true,
  gridOverlayEnabled: true,
};

/**
 * Create transformation matrices from config
 */
export function getCalibrationMatrices(config: HomographyConfig, canvasWidth = 1000, canvasHeight = 600) {
  const srcPixels: [HomographyPoint, HomographyPoint, HomographyPoint, HomographyPoint] = [
    { x: config.srcQuad[0].x * canvasWidth, y: config.srcQuad[0].y * canvasHeight },
    { x: config.srcQuad[1].x * canvasWidth, y: config.srcQuad[1].y * canvasHeight },
    { x: config.srcQuad[2].x * canvasWidth, y: config.srcQuad[2].y * canvasHeight },
    { x: config.srcQuad[3].x * canvasWidth, y: config.srcQuad[3].y * canvasHeight },
  ];

  // Destination space: Bird's Eye View rectangular meter plane
  const dstWorld: [HomographyPoint, HomographyPoint, HomographyPoint, HomographyPoint] = [
    { x: 0, y: 0 },
    { x: config.realWorldWidthMeters, y: 0 },
    { x: config.realWorldWidthMeters, y: config.realWorldLengthMeters },
    { x: 0, y: config.realWorldLengthMeters },
  ];

  const H = computeHomographyMatrix(srcPixels, dstWorld);
  const H_inv = invertMatrix3x3(H);

  return { H, H_inv };
}

/**
 * Calculate speed in km/h based on homography world trajectory points
 */
export function calculateSpeedFromTrajectory(
  p1: { worldX: number; worldY: number; timestamp: number },
  p2: { worldX: number; worldY: number; timestamp: number }
): number {
  const dt = (p2.timestamp - p1.timestamp) / 1000.0; // seconds
  if (dt <= 0.001 || dt > 2.0) return 0;

  const dx = p2.worldX - p1.worldX;
  const dy = p2.worldY - p1.worldY;
  const distanceMeters = Math.sqrt(dx * dx + dy * dy);

  const speedMs = distanceMeters / dt;
  const speedKmh = speedMs * 3.6;

  // Clamp realistic range
  return Math.min(180, Math.max(0, speedKmh));
}

/**
 * Compute lateral oscillation (standard deviation of world lateral X position)
 */
export function computeLateralZigzagScore(
  history: Array<{ worldX: number; worldY: number; timestamp: number }>
): { lateralStdDev: number; lateralPeakToPeak: number } {
  if (history.length < 5) return { lateralStdDev: 0, lateralPeakToPeak: 0 };

  const xVals = history.map((h) => h.worldX);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const peakToPeak = maxX - minX;

  const meanX = xVals.reduce((a, b) => a + b, 0) / xVals.length;
  const variance =
    xVals.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0) / xVals.length;
  const stdDev = Math.sqrt(variance);

  return {
    lateralStdDev: stdDev,
    lateralPeakToPeak: peakToPeak,
  };
}
