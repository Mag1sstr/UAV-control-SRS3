import React, { useMemo, useState } from 'react';
import { gpsToLocalENU } from '../../utils/geo';
import { ImageSlot } from '../ImageSlot';

export function Stage6Coordinates() {
  const [origin, setOrigin] = useState({ lat: 55.7558, lon: 37.6173, alt: 120 });
  const [target, setTarget] = useState({ lat: 55.75685, lon: 37.61915, alt: 158 });
  const [useEkf, setUseEkf] = useState(true);

  const result = useMemo(
    () => gpsToLocalENU(origin, target, useEkf),
    [origin, target, useEkf]
  );

  // Позиция на локальном радаре (-250..+250 м)
  const scale = 250;
  const clampedX = Math.max(-scale, Math.min(scale, result.eastX));
  const clampedY = Math.max(-scale, Math.min(scale, result.northY));
  const plotX = 140 + (clampedX / scale) * 105;
  const plotY = 140 - (clampedY / scale) * 105;

  const applyPreset = (dLat, dLon, dAlt) => {
    setTarget({
      lat: Number((origin.lat + dLat).toFixed(6)),
      lon: Number((origin.lon + dLon).toFixed(6)),
      alt: origin.alt + dAlt,
    });
  };

  return (
    <div className="stage-content">
      <section className="content-card">
        <h3 className="section-title">
          Преобразование GPS-координат в локальную систему и интеллектуальное управление
        </h3>
        <div className="two-col-grid">
          <div>
            <h4 className="sub-title">Выполняемые задачи</h4>
            <ul className="clean-list">
              <li>
                <strong>Геодезические расчёты:</strong> учёт радиусов кривизны меридиана{' '}
                <code>Rm</code> и первого вертикала <code>Rn</code> на эллипсоиде WGS-84.
              </li>
              <li>
                <strong>Преобразование координат:</strong> перевод географических координат
                <code>(φ, λ, h)</code> в локальную декартову систему <code>ENU (X, Y, Z)</code> в
                метрах относительно точки старта.
              </li>
              <li>
                <strong>Повышение точности:</strong> подавление многолучевого дрейфа GPS с помощью
                фильтрации EKF/RTK для устойчивого контура интеллектуального управления.
              </li>
            </ul>
          </div>
          <div className="info-callout">
            <div className="info-callout-title">Формулы локальной проекции ENU</div>
            <p className="formula-line">
              <code>ΔX (Восток) = Δλ · (Rn + h₀) · cos(φ̄)</code>
            </p>
            <p className="formula-line">
              <code>ΔY (Север) = Δφ · (Rm + h₀)</code>
            </p>
            <p className="formula-line">
              <code>ΔZ (Высота) = h − h₀</code>
            </p>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Интерактивный геодезический калькулятор (WGS-84 → ENU)</h3>

        <div className="toolbar-group" style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => applyPreset(0.00105, 0.00185, 38)}
          >
            Пресет: СВ полигон (+117 м, +116 м)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => applyPreset(-0.0008, 0.0022, 25)}
          >
            Пресет: ЮВ сектор
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => applyPreset(0.0016, -0.0014, 52)}
          >
            Пресет: СЗ зона облёта
          </button>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={useEkf}
              onChange={(e) => setUseEkf(e.target.checked)}
            />
            <span>Повышение точности (EKF / RTK коррекция)</span>
          </label>
        </div>

        <div className="two-col-grid">
          <div className="coords-inputs-grid">
            <div className="input-group-card">
              <h4 className="sub-title">Базовая точка (начало ENU)</h4>
              <label className="field-label">
                Широта φ₀ (°)
                <input
                  type="number"
                  step="0.0001"
                  className="text-input"
                  value={origin.lat}
                  onChange={(e) => setOrigin({ ...origin, lat: Number(e.target.value) })}
                />
              </label>
              <label className="field-label">
                Долгота λ₀ (°)
                <input
                  type="number"
                  step="0.0001"
                  className="text-input"
                  value={origin.lon}
                  onChange={(e) => setOrigin({ ...origin, lon: Number(e.target.value) })}
                />
              </label>
              <label className="field-label">
                Высота h₀ (м)
                <input
                  type="number"
                  step="1"
                  className="text-input"
                  value={origin.alt}
                  onChange={(e) => setOrigin({ ...origin, alt: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="input-group-card">
              <h4 className="sub-title">Текущие GPS-координаты БПЛА / цели</h4>
              <label className="field-label">
                Широта φ (°)
                <input
                  type="number"
                  step="0.0001"
                  className="text-input"
                  value={target.lat}
                  onChange={(e) => setTarget({ ...target, lat: Number(e.target.value) })}
                />
              </label>
              <label className="field-label">
                Долгота λ (°)
                <input
                  type="number"
                  step="0.0001"
                  className="text-input"
                  value={target.lon}
                  onChange={(e) => setTarget({ ...target, lon: Number(e.target.value) })}
                />
              </label>
              <label className="field-label">
                Высота h (м)
                <input
                  type="number"
                  step="1"
                  className="text-input"
                  value={target.alt}
                  onChange={(e) => setTarget({ ...target, alt: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>

          <div className="geo-output-wrap">
            <svg viewBox="0 0 280 280" className="radar-svg" role="img" aria-label="Локальная система ENU">
              <circle cx="140" cy="140" r="105" fill="#f8fafc" stroke="#cbd5e1" />
              <circle cx="140" cy="140" r="70" fill="none" stroke="#e2e8f0" strokeDasharray="3 3" />
              <circle cx="140" cy="140" r="35" fill="none" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="25" y1="140" x2="255" y2="140" stroke="#cbd5e1" />
              <line x1="140" y1="25" x2="140" y2="255" stroke="#cbd5e1" />
              <text x="144" y="22" className="svg-axis-label">N (Y)</text>
              <text x="242" y="134" className="svg-axis-label">E (X)</text>

              <line
                x1="140"
                y1="140"
                x2={plotX}
                y2={plotY}
                stroke="#2563eb"
                strokeWidth="2"
              />
              <circle cx="140" cy="140" r="5" fill="#0f766e" />
              <circle cx={plotX} cy={plotY} r="6" fill="#2563eb" />
            </svg>

            <div className="metrics-summary-box">
              <div className="metric-row">
                <span>Локальная X (Восток):</span>
                <strong>{result.eastX.toFixed(2)} м</strong>
              </div>
              <div className="metric-row">
                <span>Локальная Y (Север):</span>
                <strong>{result.northY.toFixed(2)} м</strong>
              </div>
              <div className="metric-row">
                <span>Относительная высота ΔZ:</span>
                <strong>{result.upZ.toFixed(2)} м</strong>
              </div>
              <div className="metric-row">
                <span>Горизонтальная дальность:</span>
                <strong>{result.horizontalDist.toFixed(2)} м</strong>
              </div>
              <div className="metric-row">
                <span>Азимут направления:</span>
                <strong>{result.azimuthDeg.toFixed(1)}°</strong>
              </div>
              <div className="metric-row">
                <span>Оценка погрешности ({useEkf ? 'EKF/RTK' : 'Сырой GPS'}):</span>
                <strong>±{result.estimatedErrorM.toFixed(2)} м</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <details className="optional-slot-details">
        <summary>Дополнительная схема геопривязки и управления (опционально)</summary>
        <div className="optional-slot-body">
          <ImageSlot
            slotId="stage6-coords-extra"
            title="Схема преобразования координат и интеллектуального управления (Этап 6)"
            description="При необходимости загрузите дополнительную иллюстрацию для защиты."
            defaultHintPath="/images/stage6.png"
          />
        </div>
      </details>
    </div>
  );
}
