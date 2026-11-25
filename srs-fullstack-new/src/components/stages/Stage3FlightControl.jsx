import React, { useMemo, useState } from 'react';
import { simulateFlightResponse } from '../../utils/geo';
import { DroneSimulator } from '../DroneSimulator';

export function Stage3FlightControl({
  flightMode,
  onFlightModeChange,
  obstacles,
  onObstaclesChange,
  cruiseSpeed,
  onCruiseSpeedChange,
}) {
  const [controllerMode, setControllerMode] = useState('PID');
  const [kp, setKp] = useState(1.8);
  const [ki, setKi] = useState(0.35);
  const [kd, setKd] = useState(1.1);
  const [ppoGain, setPpoGain] = useState(1.4);
  const [wind, setWind] = useState(2.5);

  const sim = useMemo(
    () =>
      simulateFlightResponse({
        mode: controllerMode,
        kp,
        ki,
        kd,
        ppoGain,
        targetSpeed: cruiseSpeed / 10,
        windDisturbance: wind,
      }),
    [controllerMode, kp, ki, kd, ppoGain, cruiseSpeed, wind]
  );

  const chartW = 500;
  const chartH = 175;
  const padL = 34;
  const padR = 16;
  const padT = 16;
  const padB = 26;

  const yZero = padT + (chartH - padT - padB) * (20 / 30); // диапазон [-10, +20]

  const pathData = useMemo(() => {
    return sim.series
      .map((pt, i) => {
        const x = padL + (i / (sim.series.length - 1)) * (chartW - padL - padR);
        const clampedErr = Math.max(-10, Math.min(20, pt.error));
        const y = padT + ((20 - clampedErr) / 30) * (chartH - padT - padB);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [sim.series]);

  return (
    <div className="stage-content">
      <section className="content-card">
        <h3 className="section-title">Управление движением дрона в реальном времени</h3>
        <div className="two-col-grid">
          <div>
            <h4 className="sub-title">Выполняемые задачи</h4>
            <ul className="clean-list">
              <li>
                <strong>Применение алгоритмов PID или PPO:</strong> классический
                пропорционально-интегрально-дифференциальный контур (PID) или нейросетевая политика
                обучения с подкреплением (Proximal Policy Optimization, PPO).
              </li>
              <li>
                <strong>Коррекция скорости и направления:</strong> удержание курса и траекторной
                точки при боковом ветре и смене высоты.
              </li>
              <li>
                <strong>Маневрирование:</strong> плавное снижение скорости перед поворотом и облётом
                препятствий с сохранением устойчивости по крену и тангажу.
              </li>
            </ul>
          </div>
          <div className="info-callout">
            <div className="info-callout-title">Сравнение PID и PPO</div>
            <p className="muted-text">
              <strong>PID</strong> обеспечивает предсказуемую линейную стабилизацию при точно
              подобранных коэффициентах <code>Kp, Ki, Kd</code>. <strong>PPO</strong> формирует
              нелинейную адаптивную стратегию управления, устойчивую к переменному ветровому
              возмущению и динамическому маневрированию.
            </p>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Настройка контура управления (PID / PPO) и отклик по курсу</h3>

        <div className="control-tabs">
          <button
            type="button"
            className={`btn btn-small ${controllerMode === 'PID' ? 'btn-tab-active' : 'btn-secondary'}`}
            onClick={() => setControllerMode('PID')}
          >
            Режим PID-регулятора
          </button>
          <button
            type="button"
            className={`btn btn-small ${controllerMode === 'PPO' ? 'btn-tab-active' : 'btn-secondary'}`}
            onClick={() => setControllerMode('PPO')}
          >
            Режим PPO (обучение с подкреплением)
          </button>
        </div>

        <div className="two-col-grid">
          <div className="sliders-stack">
            {controllerMode === 'PID' ? (
              <>
                <label className="slider-row">
                  <span>Пропорциональный коэффициент Kp: <strong>{kp.toFixed(2)}</strong></span>
                  <input
                    type="range"
                    min="0.4"
                    max="4.0"
                    step="0.1"
                    value={kp}
                    onChange={(e) => setKp(Number(e.target.value))}
                  />
                </label>
                <label className="slider-row">
                  <span>Интегральный коэффициент Ki: <strong>{ki.toFixed(2)}</strong></span>
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.05"
                    value={ki}
                    onChange={(e) => setKi(Number(e.target.value))}
                  />
                </label>
                <label className="slider-row">
                  <span>Дифференциальный коэффициент Kd: <strong>{kd.toFixed(2)}</strong></span>
                  <input
                    type="range"
                    min="0.1"
                    max="2.8"
                    step="0.1"
                    value={kd}
                    onChange={(e) => setKd(Number(e.target.value))}
                  />
                </label>
              </>
            ) : (
              <label className="slider-row">
                <span>Коэффициент отклика политики PPO: <strong>{ppoGain.toFixed(2)}</strong></span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={ppoGain}
                  onChange={(e) => setPpoGain(Number(e.target.value))}
                />
              </label>
            )}

            <label className="slider-row">
              <span>Крейсерская скорость полёта: <strong>{(cruiseSpeed / 10).toFixed(1)} м/с</strong></span>
              <input
                type="range"
                min="40"
                max="180"
                step="5"
                value={cruiseSpeed}
                onChange={(e) => onCruiseSpeedChange(Number(e.target.value))}
              />
            </label>

            <label className="slider-row">
              <span>Боковой ветер (возмущение): <strong>{wind.toFixed(1)} м/с</strong></span>
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={wind}
                onChange={(e) => setWind(Number(e.target.value))}
              />
            </label>
          </div>

          <div>
            <div className="chart-box">
              <div className="chart-header">
                <span>Переходный процесс: ошибка курса Δψ(t), °</span>
                <span className="muted-text">Цель: Δψ → 0°</span>
              </div>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="mini-svg-chart">
                <line x1={padL} y1={padT} x2={padL} y2={chartH - padB} stroke="#cbd5e1" />
                <line x1={padL} y1={yZero} x2={chartW - padR} y2={yZero} stroke="#94a3b8" strokeDasharray="4 3" />
                <text x="6" y={padT + 8} className="svg-axis-label">+20°</text>
                <text x="12" y={yZero + 4} className="svg-axis-label">0°</text>
                <text x="6" y={chartH - padB} className="svg-axis-label">-10°</text>
                <text x={chartW - 46} y={chartH - 6} className="svg-axis-label">t = 6 с</text>
                <path d={pathData} fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
              </svg>
            </div>

            <div className="metrics-inline-grid">
              <div className="metric-chip">
                <span>Перерегулирование</span>
                <strong>{sim.overshootPct}%</strong>
              </div>
              <div className="metric-chip">
                <span>Время стабилизации</span>
                <strong>{sim.settlingTime} с</strong>
              </div>
              <div className="metric-chip">
                <span>Устан. ошибка</span>
                <strong>{sim.steadyError}°</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Проверка скорости и манёвров на карте полёта</h3>
        <DroneSimulator
          mode={flightMode}
          onModeChange={onFlightModeChange}
          obstacles={obstacles}
          onObstaclesChange={onObstaclesChange}
          speedPxPerSec={cruiseSpeed}
          compact
        />
      </section>
    </div>
  );
}
