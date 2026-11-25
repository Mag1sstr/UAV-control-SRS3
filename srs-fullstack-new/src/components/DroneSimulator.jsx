import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GOAL_POINT,
  MAP_HEIGHT,
  MAP_WIDTH,
  OBSTACLE_CLEARANCE,
  START_POINT,
  buildDroneRoute,
  dist,
  pixelToTelemetry,
  sampleRouteAtDistance,
} from '../utils/dronePath';

const MODE_LABELS = {
  circle: 'Круговая',
  figure8: 'Восьмёрка',
  pointToPoint: 'Старт → Цель',
};

function pointsToSvgPath(pts) {
  if (!pts || pts.length === 0) return '';
  return pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

export function DroneSimulator({
  mode,
  onModeChange,
  obstacles,
  onObstaclesChange,
  speedPxPerSec = 95,
  compact = false,
  onTelemetryUpdate,
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [loopFlight, setLoopFlight] = useState(mode !== 'pointToPoint');
  const [distance, setDistance] = useState(0);
  const [trail, setTrail] = useState([]);
  const [droneState, setDroneState] = useState({
    x: START_POINT.x,
    y: START_POINT.y,
    angleDeg: 0,
    isAvoiding: false,
    distToTarget: 0,
    finished: false,
  });

  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const distanceRef = useRef(0);
  const svgRef = useRef(null);

  const route = useMemo(() => buildDroneRoute(mode, obstacles), [mode, obstacles]);

  // Синхронизация стартового состояния при смене режима или маршрута
  useEffect(() => {
    setLoopFlight(mode !== 'pointToPoint');
  }, [mode]);

  useEffect(() => {
    const clamped = route.closed
      ? distanceRef.current % route.totalLength
      : Math.min(distanceRef.current, route.totalLength);
    distanceRef.current = clamped;
    setDistance(clamped);
    const sample = sampleRouteAtDistance(route, clamped, obstacles);
    setDroneState(sample);
    if (trail.length === 0) {
      setTrail([{ x: sample.x, y: sample.y }]);
    }
    if (onTelemetryUpdate) {
      onTelemetryUpdate({ ...sample, mode, routeLength: route.totalLength });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
      return undefined;
    }

    const step = (timestamp) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      // При облёте препятствия дрон немного снижает скорость для безопасного манёвра
      const currentSample = sampleRouteAtDistance(route, distanceRef.current, obstacles);
      const effectiveSpeed = currentSample.isAvoiding
        ? speedPxPerSec * 0.82
        : speedPxPerSec;

      let nextDist = distanceRef.current + effectiveSpeed * dt;
      let shouldStop = false;

      if (nextDist >= route.totalLength) {
        if (loopFlight && route.closed) {
          nextDist = nextDist % route.totalLength;
          setTrail([]);
        } else {
          nextDist = route.totalLength;
          shouldStop = true;
        }
      }

      distanceRef.current = nextDist;
      const nextSample = sampleRouteAtDistance(route, nextDist, obstacles);
      setDistance(nextDist);
      setDroneState(nextSample);

      setTrail((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.hypot(nextSample.x - last.x, nextSample.y - last.y) > 4) {
          const updated = [...prev, { x: nextSample.x, y: nextSample.y }];
          return updated.length > 360 ? updated.slice(updated.length - 360) : updated;
        }
        return prev;
      });

      if (onTelemetryUpdate) {
        onTelemetryUpdate({ ...nextSample, mode, routeLength: route.totalLength });
      }

      if (shouldStop) {
        setIsRunning(false);
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, route, obstacles, speedPxPerSec, loopFlight, mode, onTelemetryUpdate]);

  const handleStart = () => {
    if (droneState.finished) {
      distanceRef.current = 0;
      setDistance(0);
      setTrail([]);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    distanceRef.current = 0;
    setDistance(0);
    const startSample = sampleRouteAtDistance(route, 0, obstacles);
    setDroneState(startSample);
    setTrail([{ x: startSample.x, y: startSample.y }]);
    if (onTelemetryUpdate) {
      onTelemetryUpdate({ ...startSample, mode, routeLength: route.totalLength });
    }
  };

  const handleMapClick = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = MAP_WIDTH / rect.width;
    const scaleY = MAP_HEIGHT / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (x < 28 || x > MAP_WIDTH - 28 || y < 28 || y > MAP_HEIGHT - 28) return;
    if (mode === 'pointToPoint') {
      if (dist({ x, y }, START_POINT) < 38 || dist({ x, y }, GOAL_POINT) < 38) {
        return;
      }
    }

    onObstaclesChange([
      ...obstacles,
      { id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, x, y, r: 24 },
    ]);
  };

  const handleAddObstacleButton = () => {
    // Размещаем препятствие на текущем участке маршрута, чтобы наглядно показать облёт
    const candidates = [0.28, 0.52, 0.72, 0.18, 0.85];
    for (const frac of candidates) {
      const idx = Math.floor(route.points.length * frac);
      const pt = route.points[idx];
      if (!pt) continue;
      if (mode === 'pointToPoint') {
        if (dist(pt, START_POINT) < 55 || dist(pt, GOAL_POINT) < 55) continue;
      }
      const tooClose = obstacles.some((o) => dist(o, pt) < 56);
      if (!tooClose) {
        onObstaclesChange([
          ...obstacles,
          {
            id: `obs-${Date.now()}`,
            x: Math.round(pt.x),
            y: Math.round(pt.y),
            r: 25,
          },
        ]);
        return;
      }
    }

    // Запасное случайное размещение внутри карты
    const x = Math.round(140 + Math.random() * (MAP_WIDTH - 280));
    const y = Math.round(90 + Math.random() * (MAP_HEIGHT - 180));
    onObstaclesChange([
      ...obstacles,
      { id: `obs-${Date.now()}`, x, y, r: 24 },
    ]);
  };

  const handleRemoveObstacle = (e, id) => {
    e.stopPropagation();
    onObstaclesChange(obstacles.filter((o) => o.id !== id));
  };

  const telemetry = pixelToTelemetry(droneState.x, droneState.y);

  let statusText = 'Ожидание запуска';
  let statusTone = 'neutral';
  if (droneState.finished) {
    statusText = 'Цель достигнута';
    statusTone = 'success';
  } else if (!isRunning && distance > 0) {
    statusText = 'Пауза';
    statusTone = 'neutral';
  } else if (isRunning && droneState.isAvoiding) {
    statusText = 'Облёт препятствия';
    statusTone = 'warning';
  } else if (isRunning) {
    statusText = 'Штатный полёт';
    statusTone = 'active';
  }

  return (
    <div className={`drone-sim ${compact ? 'drone-sim-compact' : ''}`}>
      <div className="drone-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={handleStart}
            disabled={isRunning}
          >
            Старт
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handlePause}
            disabled={!isRunning}
          >
            Пауза
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleReset}
          >
            Сброс
          </button>
        </div>

        <div className="toolbar-group" role="group" aria-label="Выбор траектории">
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-small ${mode === key ? 'btn-tab-active' : 'btn-secondary'}`}
              onClick={() => {
                setIsRunning(false);
                distanceRef.current = 0;
                setDistance(0);
                setTrail([]);
                onModeChange(key);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleAddObstacleButton}
          >
            + Добавить препятствие
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => onObstaclesChange([])}
            disabled={obstacles.length === 0}
          >
            Очистить ({obstacles.length})
          </button>
        </div>
      </div>

      <div className="drone-layout">
        <div className="drone-map-wrap">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="drone-svg"
            onClick={handleMapClick}
            role="img"
            aria-label="2D-карта маршрута дрона с облётом препятствий"
          >
            <defs>
              <pattern id="grid-small" width="36" height="36" patternUnits="userSpaceOnUse">
                <path
                  d="M 36 0 L 0 0 0 36"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f8fafc" />
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#grid-small)" />

            {/* Оси координат */}
            <text x="10" y="18" className="svg-axis-label">
              Y (Север, м)
            </text>
            <text x={MAP_WIDTH - 92} y={MAP_HEIGHT - 10} className="svg-axis-label">
              X (Восток, м)
            </text>

            {/* Номинальная траектория (пунктир) */}
            <path
              d={pointsToSvgPath(route.nominalPoints)}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />

            {/* Построенная траектория с облётом препятствий */}
            <path
              d={pointsToSvgPath(route.points)}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* След полёта БПЛА */}
            {trail.length > 1 && (
              <path
                d={pointsToSvgPath(trail)}
                fill="none"
                stroke="#0f766e"
                strokeWidth="2.5"
                strokeOpacity="0.7"
              />
            )}

            {/* Препятствия и зоны безопасного зазора */}
            {obstacles.map((obs, index) => (
              <g
                key={obs.id}
                className="obstacle-node"
                onClick={(e) => handleRemoveObstacle(e, obs.id)}
              >
                <title>Препятствие #{index + 1} (нажмите, чтобы удалить)</title>
                <circle
                  cx={obs.x}
                  cy={obs.y}
                  r={obs.r + OBSTACLE_CLEARANCE}
                  fill="#fef2f2"
                  fillOpacity="0.65"
                  stroke="#fca5a5"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={obs.x}
                  cy={obs.y}
                  r={obs.r}
                  fill="#dc2626"
                  fillOpacity="0.18"
                  stroke="#dc2626"
                  strokeWidth="2"
                />
                <text
                  x={obs.x}
                  y={obs.y + 4}
                  textAnchor="middle"
                  className="svg-obs-label"
                >
                  P{index + 1}
                </text>
              </g>
            ))}

            {/* Маркеры Старт / Цель */}
            {mode === 'pointToPoint' ? (
              <>
                <circle cx={START_POINT.x} cy={START_POINT.y} r="7" fill="#0f766e" />
                <text
                  x={START_POINT.x + 12}
                  y={START_POINT.y + 4}
                  className="svg-marker-label"
                >
                  Старт
                </text>
                <circle
                  cx={GOAL_POINT.x}
                  cy={GOAL_POINT.y}
                  r="8"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="2.5"
                />
                <circle cx={GOAL_POINT.x} cy={GOAL_POINT.y} r="3.5" fill="#1d4ed8" />
                <text
                  x={GOAL_POINT.x - 46}
                  y={GOAL_POINT.y - 12}
                  className="svg-marker-label"
                >
                  Цель
                </text>
              </>
            ) : (
              <>
                <circle
                  cx={route.targetPoint.x}
                  cy={route.targetPoint.y}
                  r="6"
                  fill="#0f766e"
                />
                <text
                  x={route.targetPoint.x + 10}
                  y={route.targetPoint.y + 4}
                  className="svg-marker-label"
                >
                  Контрольная точка
                </text>
              </>
            )}

            {/* Модель БПЛА (квадрокоптер), поворачивается по курсу */}
            <g
              transform={`translate(${droneState.x.toFixed(2)}, ${droneState.y.toFixed(
                2
              )}) rotate(${droneState.angleDeg.toFixed(2)})`}
            >
              {/* Вектор направления */}
              <line
                x1="0"
                y1="0"
                x2="26"
                y2="0"
                stroke="#1d4ed8"
                strokeWidth="2"
              />
              <polygon points="28,0 21,-4 21,4" fill="#1d4ed8" />

              {/* Лучи квадрокоптера */}
              <line x1="-10" y1="-10" x2="10" y2="10" stroke="#334155" strokeWidth="2.5" />
              <line x1="-10" y1="10" x2="10" y2="-10" stroke="#334155" strokeWidth="2.5" />

              {/* Роторы */}
              <circle cx="-11" cy="-11" r="4.5" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
              <circle cx="11" cy="-11" r="4.5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
              <circle cx="-11" cy="11" r="4.5" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
              <circle cx="11" cy="11" r="4.5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />

              {/* Фюзеляж */}
              <rect
                x="-6"
                y="-4.5"
                width="12"
                height="9"
                rx="2.5"
                fill={droneState.isAvoiding ? '#d97706' : '#1e293b'}
              />
            </g>
          </svg>

          <div className="map-hint-row">
            <span>
              Клик по пустой области карты добавляет препятствие. Клик по препятствию{' '}
              <code>P1…</code> удаляет его.
            </span>
            {route.closed && (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={loopFlight}
                  onChange={(e) => setLoopFlight(e.target.checked)}
                />
                Зациклить патрулирование
              </label>
            )}
          </div>
        </div>

        <aside className="telemetry-panel" aria-label="Телеметрия БПЛА">
          <div className="telemetry-block">
            <span className="telemetry-label">Статус полёта</span>
            <span className={`status-badge status-${statusTone}`}>{statusText}</span>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-cell">
              <span className="telemetry-label">Локальная X</span>
              <span className="telemetry-value">{telemetry.localX} м</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">Локальная Y</span>
              <span className="telemetry-value">{telemetry.localY} м</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">Широта (усл. GPS)</span>
              <span className="telemetry-value">{telemetry.lat}°</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">Долгота (усл. GPS)</span>
              <span className="telemetry-value">{telemetry.lon}°</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">До цели / финиша</span>
              <span className="telemetry-value">{droneState.distToTarget.toFixed(1)} м</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">Курс (азимут)</span>
              <span className="telemetry-value">
                {(((droneState.angleDeg + 90) % 360 + 360) % 360).toFixed(0)}°
              </span>
            </div>
          </div>

          <div className="telemetry-footer">
            <div>
              Длина маршрута: <strong>{route.totalLength.toFixed(1)} м</strong>
            </div>
            <div>
              Препятствий на карте: <strong>{obstacles.length}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
