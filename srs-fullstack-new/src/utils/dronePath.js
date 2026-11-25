export const MAP_WIDTH = 720;
export const MAP_HEIGHT = 420;
export const OBSTACLE_CLEARANCE = 18;

export const START_POINT = { x: 64, y: 348 };
export const GOAL_POINT = { x: 656, y: 72 };

export const BASE_GPS = {
  lat: 55.7558,
  lon: 37.6173,
};

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampPoint(p) {
  return {
    x: Math.max(24, Math.min(MAP_WIDTH - 24, p.x)),
    y: Math.max(24, Math.min(MAP_HEIGHT - 24, p.y)),
  };
}

function segmentCircleMinDist(a, b, c) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = c.x - a.x;
  const wy = c.y - a.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-6) return Math.hypot(c.x - a.x, c.y - a.y);
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
  const px = a.x + t * vx;
  const py = a.y + t * vy;
  return Math.hypot(c.x - px, c.y - py);
}

function segmentClearOfObstacles(a, b, obstacles, extraMargin = 0) {
  for (const obs of obstacles) {
    const r = obs.r + OBSTACLE_CLEARANCE + extraMargin;
    if (segmentCircleMinDist(a, b, obs) < r) {
      return false;
    }
  }
  return true;
}

function generateNominalLoop(mode, count = 140) {
  const cx = MAP_WIDTH / 2;
  const cy = MAP_HEIGHT / 2;
  const pts = [];

  if (mode === 'circle') {
    const rx = 215;
    const ry = 136;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      pts.push({
        x: cx + rx * Math.cos(t),
        y: cy + ry * Math.sin(t),
      });
    }
    return pts;
  }

  // figure8 (Lemniscate / Lissajous 1:2)
  const rx = 240;
  const ry = 142;
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    pts.push({
      x: cx + rx * Math.sin(t),
      y: cy + ry * Math.sin(2 * t) * 0.92,
    });
  }
  return pts;
}

function solveClosedLoopWithObstacles(mode, obstacles) {
  const nominal = generateNominalLoop(mode, 140);
  const n = nominal.length;
  let pts = nominal.map((p) => ({ ...p }));

  if (obstacles.length === 0) {
    return { points: pts, nominal };
  }

  const pushOut = (p, idx) => {
    let cur = { ...p };
    const prev = nominal[(idx - 1 + n) % n];
    const next = nominal[(idx + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tLen = Math.hypot(tx, ty) || 1;
    // Normal pointing outward from map center where possible
    let nx = -ty / tLen;
    let ny = tx / tLen;
    const toCenterX = cur.x - MAP_WIDTH / 2;
    const toCenterY = cur.y - MAP_HEIGHT / 2;
    if (nx * toCenterX + ny * toCenterY < 0) {
      nx = -nx;
      ny = -ny;
    }

    for (const obs of obstacles) {
      const safeR = obs.r + OBSTACLE_CLEARANCE;
      const dx = cur.x - obs.x;
      const dy = cur.y - obs.y;
      const d = Math.hypot(dx, dy);
      if (d < safeR) {
        if (d < 2) {
          cur.x = obs.x + nx * safeR;
          cur.y = obs.y + ny * safeR;
        } else {
          cur.x = obs.x + (dx / d) * safeR;
          cur.y = obs.y + (dy / d) * safeR;
        }
      }
    }
    return clampPoint(cur);
  };

  for (let iter = 0; iter < 18; iter++) {
    // 1. Push vertices outside obstacle safety radii
    pts = pts.map((p, i) => pushOut(p, i));

    // 2. Prevent segment chords from cutting across obstacles
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      for (const obs of obstacles) {
        const safeR = obs.r + OBSTACLE_CLEARANCE - 1;
        const md = segmentCircleMinDist(a, b, obs);
        if (md < safeR) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          let dx = midX - obs.x;
          let dy = midY - obs.y;
          let d = Math.hypot(dx, dy);
          if (d < 1) {
            const vx = b.x - a.x;
            const vy = b.y - a.y;
            const vLen = Math.hypot(vx, vy) || 1;
            dx = -vy / vLen;
            dy = vx / vLen;
            d = 1;
          }
          const push = (safeR - md) * 0.7;
          pts[i] = clampPoint({ x: a.x + (dx / d) * push, y: a.y + (dy / d) * push });
          pts[(i + 1) % n] = clampPoint({ x: b.x + (dx / d) * push, y: b.y + (dy / d) * push });
        }
      }
    }

    // 3. Smooth and gently attract unblocked regions back to nominal curve
    const nextPts = new Array(n);
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n];
      const curr = pts[i];
      const next = pts[(i + 1) % n];
      const nom = nominal[i];

      let minClearance = Infinity;
      for (const obs of obstacles) {
        minClearance = Math.min(minClearance, dist(curr, obs) - (obs.r + OBSTACLE_CLEARANCE));
      }
      const nomPull = minClearance > 14 ? 0.14 : 0.01;
      const sx = prev.x * 0.22 + curr.x * 0.56 + next.x * 0.22;
      const sy = prev.y * 0.22 + curr.y * 0.56 + next.y * 0.22;
      nextPts[i] = {
        x: sx * (1 - nomPull) + nom.x * nomPull,
        y: sy * (1 - nomPull) + nom.y * nomPull,
      };
    }
    pts = nextPts;
  }

  // Final hard projection to guarantee zero intersection
  pts = pts.map((p, i) => pushOut(p, i));
  return { points: pts, nominal };
}

function solvePointToPointAStar(start, goal, obstacles) {
  const cellSize = 12;
  const cols = Math.floor(MAP_WIDTH / cellSize); // 60
  const rows = Math.floor(MAP_HEIGHT / cellSize); // 35

  const toGrid = (p) => ({
    c: Math.max(1, Math.min(cols - 2, Math.floor(p.x / cellSize))),
    r: Math.max(1, Math.min(rows - 2, Math.floor(p.y / cellSize))),
  });

  const toWorld = (c, r) => ({
    x: c * cellSize + cellSize / 2,
    y: r * cellSize + cellSize / 2,
  });

  const startCell = toGrid(start);
  const goalCell = toGrid(goal);

  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) {
        blocked[r * cols + c] = 1;
        continue;
      }
      const w = toWorld(c, r);
      for (const obs of obstacles) {
        if (dist(w, obs) < obs.r + OBSTACLE_CLEARANCE - 2) {
          blocked[r * cols + c] = 1;
          break;
        }
      }
    }
  }

  // Ensure start and goal cells are passable
  blocked[startCell.r * cols + startCell.c] = 0;
  blocked[goalCell.r * cols + goalCell.c] = 0;

  const total = cols * rows;
  const gScore = new Float64Array(total).fill(Infinity);
  const fScore = new Float64Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const inOpen = new Uint8Array(total);

  const startIdx = startCell.r * cols + startCell.c;
  const goalIdx = goalCell.r * cols + goalCell.c;

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.hypot(goalCell.c - startCell.c, goalCell.r - startCell.r);
  const openList = [startIdx];
  inOpen[startIdx] = 1;

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];

  let found = false;
  while (openList.length > 0) {
    let bestPos = 0;
    let bestF = fScore[openList[0]];
    for (let i = 1; i < openList.length; i++) {
      const f = fScore[openList[i]];
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }
    const curr = openList.splice(bestPos, 1)[0];
    inOpen[curr] = 0;

    if (curr === goalIdx) {
      found = true;
      break;
    }

    closed[curr] = 1;
    const cc = curr % cols;
    const cr = Math.floor(curr / cols);

    for (const [dc, dr, stepCost] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nIdx = nr * cols + nc;
      if (closed[nIdx] || blocked[nIdx]) continue;

      // Prevent diagonal corner-cutting through blocked cells
      if (dc !== 0 && dr !== 0) {
        if (blocked[cr * cols + nc] || blocked[nr * cols + cc]) continue;
      }

      const tentativeG = gScore[curr] + stepCost;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = curr;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.hypot(goalCell.c - nc, goalCell.r - nr);
        if (!inOpen[nIdx]) {
          openList.push(nIdx);
          inOpen[nIdx] = 1;
        }
      }
    }
  }

  if (!found) {
    return [start, goal];
  }

  const rawPath = [];
  let trace = goalIdx;
  while (trace !== -1) {
    const tc = trace % cols;
    const tr = Math.floor(trace / cols);
    rawPath.push(toWorld(tc, tr));
    trace = cameFrom[trace];
  }
  rawPath.reverse();
  rawPath[0] = { ...start };
  rawPath[rawPath.length - 1] = { ...goal };

  // String-pulling (greedy visibility shortcutting)
  const pulled = [rawPath[0]];
  let anchor = 0;
  while (anchor < rawPath.length - 1) {
    let farthest = anchor + 1;
    for (let j = rawPath.length - 1; j > anchor + 1; j--) {
      if (segmentClearOfObstacles(rawPath[anchor], rawPath[j], obstacles, -2)) {
        farthest = j;
        break;
      }
    }
    pulled.push(rawPath[farthest]);
    anchor = farthest;
  }

  // Subdivide long segments and apply gentle Chaikin smoothing
  let dense = [];
  for (let i = 0; i < pulled.length - 1; i++) {
    const a = pulled[i];
    const b = pulled[i + 1];
    const segLen = dist(a, b);
    const steps = Math.max(1, Math.ceil(segLen / 22));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  dense.push({ ...goal });

  for (let pass = 0; pass < 3; pass++) {
    const smoothed = [dense[0]];
    for (let i = 1; i < dense.length - 1; i++) {
      const candidate = {
        x: dense[i - 1].x * 0.25 + dense[i].x * 0.5 + dense[i + 1].x * 0.25,
        y: dense[i - 1].y * 0.25 + dense[i].y * 0.5 + dense[i + 1].y * 0.25,
      };
      // Keep outside obstacles
      let safe = { ...candidate };
      for (const obs of obstacles) {
        const r = obs.r + OBSTACLE_CLEARANCE;
        const d = dist(safe, obs);
        if (d < r && d > 0.1) {
          safe = {
            x: obs.x + ((safe.x - obs.x) / d) * r,
            y: obs.y + ((safe.y - obs.y) / d) * r,
          };
        }
      }
      smoothed.push(clampPoint(safe));
    }
    smoothed.push(dense[dense.length - 1]);
    dense = smoothed;
  }

  return dense;
}

export function buildDroneRoute(mode, obstacles) {
  let points = [];
  let nominalPoints = [];
  const closed = mode === 'circle' || mode === 'figure8';

  if (mode === 'pointToPoint') {
    points = solvePointToPointAStar(START_POINT, GOAL_POINT, obstacles);
    nominalPoints = [START_POINT, GOAL_POINT];
  } else {
    const res = solveClosedLoopWithObstacles(mode, obstacles);
    points = [...res.points, { ...res.points[0] }];
    nominalPoints = [...res.nominal, { ...res.nominal[0] }];
  }

  const cumLengths = [0];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalLength += dist(points[i - 1], points[i]);
    cumLengths.push(totalLength);
  }

  return {
    mode,
    closed,
    points,
    nominalPoints,
    cumLengths,
    totalLength: Math.max(totalLength, 1),
    targetPoint: closed ? points[0] : GOAL_POINT,
  };
}

export function sampleRouteAtDistance(route, distanceMeters, obstacles) {
  const { points, cumLengths, totalLength, closed } = route;
  if (points.length < 2) {
    return {
      x: START_POINT.x,
      y: START_POINT.y,
      angleDeg: 0,
      isAvoiding: false,
      distToTarget: 0,
      finished: true,
    };
  }

  const clampedDist = closed
    ? ((distanceMeters % totalLength) + totalLength) % totalLength
    : Math.max(0, Math.min(totalLength, distanceMeters));

  let idx = 0;
  for (let i = 1; i < cumLengths.length; i++) {
    if (cumLengths[i] >= clampedDist) {
      idx = i - 1;
      break;
    }
    idx = i - 1;
  }

  const segStart = cumLengths[idx];
  const segEnd = cumLengths[idx + 1] ?? segStart + 1;
  const segLen = Math.max(segEnd - segStart, 1e-6);
  const t = Math.max(0, Math.min(1, (clampedDist - segStart) / segLen));

  const p0 = points[idx];
  const p1 = points[idx + 1] ?? p0;
  const x = p0.x + (p1.x - p0.x) * t;
  const y = p0.y + (p1.y - p0.y) * t;

  // Look slightly ahead for smoother heading tangent
  const lookIdx = Math.min(points.length - 1, idx + 2);
  const pAhead = points[lookIdx];
  const dx = pAhead.x - p0.x || p1.x - p0.x;
  const dy = pAhead.y - p0.y || p1.y - p0.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  let isAvoiding = false;
  for (const obs of obstacles) {
    if (Math.hypot(x - obs.x, y - obs.y) <= obs.r + OBSTACLE_CLEARANCE + 24) {
      isAvoiding = true;
      break;
    }
  }

  const distToTarget = closed
    ? Math.max(0, totalLength - clampedDist)
    : Math.hypot(route.targetPoint.x - x, route.targetPoint.y - y);

  const finished = !closed && clampedDist >= totalLength - 0.5;

  return {
    x,
    y,
    angleDeg,
    isAvoiding,
    distToTarget,
    finished,
  };
}

export function pixelToTelemetry(x, y) {
  const localX = x;
  const localY = MAP_HEIGHT - y;
  const lat = BASE_GPS.lat + localY * 0.000009;
  const lon = BASE_GPS.lon + localX * 0.000014;
  return {
    localX: localX.toFixed(1),
    localY: localY.toFixed(1),
    lat: lat.toFixed(6),
    lon: lon.toFixed(6),
  };
}
