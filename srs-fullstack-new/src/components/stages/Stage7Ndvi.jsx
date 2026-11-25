import React, { useMemo, useState } from 'react';
import { calculateNdvi } from '../../utils/geo';
import { ImageSlot } from '../ImageSlot';

const NDVI_PRESETS = [
  { label: 'Здоровый посев', nir: 0.78, red: 0.14 },
  { label: 'Умеренный фитостресс', nir: 0.48, red: 0.24 },
  { label: 'Сильный фитостресс', nir: 0.34, red: 0.22 },
  { label: 'Открытая почва', nir: 0.24, red: 0.21 },
];

export function Stage7Ndvi() {
  const [nir, setNir] = useState(0.52);
  const [red, setRed] = useState(0.24);
  const [threshold, setThreshold] = useState(0.4);

  const analysis = useMemo(
    () => calculateNdvi(nir, red, threshold),
    [nir, red, threshold]
  );

  // Положение индикатора на шкале [-0.2 .. 1.0]
  const clampedForScale = Math.max(-0.2, Math.min(1.0, analysis.ndvi));
  const scalePercent = ((clampedForScale + 0.2) / 1.2) * 100;
  const thresholdPercent = ((Math.max(-0.2, Math.min(1.0, threshold)) + 0.2) / 1.2) * 100;

  const handleNumberInput = (setter, value, min = 0, max = 1) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setter(Math.max(min, Math.min(max, num)));
  };

  return (
    <div className="stage-content">
      <section className="content-card">
        <h3 className="section-title">
          Интеллектуальное управление моментом съёмки на основе анализа NDVI и фитостресса
        </h3>
        <div className="two-col-grid">
          <div>
            <p>
              На завершающем этапе данные мультиспектральной камеры поступают в расчётный модуль
              вегетационного индекса <strong>NDVI</strong>. Если индекс опускается ниже заданного
              порога, система выявляет признаки фитостресса и автоматически принимает решение о
              детальной съёмке и передаче данных в классификатор ИИ (Рисунок 3).
            </p>
          </div>
          <div className="info-callout">
            <div className="info-callout-title">Формула расчёта вегетационного индекса</div>
            <div className="ndvi-formula-display">
              NDVI = (NIR − Red) / (NIR + Red)
            </div>
            <p className="muted-text">
              Где <code>NIR</code> — отражение в ближнем инфракрасном диапазоне (~750–900 нм),{' '}
              <code>Red</code> — отражение в красном диапазоне (~620–680 нм).
            </p>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Калькулятор NDVI и модуль принятия решений</h3>

        <div className="toolbar-group" style={{ marginBottom: '16px' }}>
          {NDVI_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                setNir(preset.nir);
                setRed(preset.red);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="two-col-grid">
          <div className="ndvi-inputs-stack">
            <div className="ndvi-control-row">
              <div className="ndvi-control-top">
                <label htmlFor="nir-num">Ближний ИК-канал (NIR)</label>
                <input
                  id="nir-num"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  className="number-input-sm"
                  value={nir}
                  onChange={(e) => handleNumberInput(setNir, e.target.value, 0, 1)}
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={nir}
                onChange={(e) => setNir(Number(e.target.value))}
              />
            </div>

            <div className="ndvi-control-row">
              <div className="ndvi-control-top">
                <label htmlFor="red-num">Красный канал (Red)</label>
                <input
                  id="red-num"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  className="number-input-sm"
                  value={red}
                  onChange={(e) => handleNumberInput(setRed, e.target.value, 0, 1)}
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={red}
                onChange={(e) => setRed(Number(e.target.value))}
              />
            </div>

            <div className="ndvi-control-row">
              <div className="ndvi-control-top">
                <label htmlFor="thresh-num">Порог фитостресса (NDVI порог)</label>
                <input
                  id="thresh-num"
                  type="number"
                  min="0.1"
                  max="0.8"
                  step="0.01"
                  className="number-input-sm"
                  value={threshold}
                  onChange={(e) => handleNumberInput(setThreshold, e.target.value, 0.1, 0.8)}
                />
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="ndvi-result-panel">
            <div className="ndvi-score-row">
              <div>
                <div className="telemetry-label">Рассчитанный NDVI</div>
                <div className="ndvi-big-number">{analysis.ndvi.toFixed(3)}</div>
              </div>
              <span
                className={`status-badge ${
                  analysis.stressCode === 'healthy'
                    ? 'status-success'
                    : analysis.stressCode === 'stress'
                    ? 'status-warning'
                    : 'status-danger'
                }`}
              >
                {analysis.stressLevel}
              </span>
            </div>

            <div className="ndvi-scale-wrap">
              <div className="ndvi-gradient-bar">
                <div
                  className="ndvi-threshold-line"
                  style={{ left: `${thresholdPercent}%` }}
                  title={`Порог ${threshold.toFixed(2)}`}
                />
                <div
                  className="ndvi-pointer"
                  style={{ left: `${scalePercent}%` }}
                  title={`NDVI ${analysis.ndvi.toFixed(3)}`}
                />
              </div>
              <div className="ndvi-scale-labels">
                <span>−0.2 (почва/вода)</span>
                <span>Порог: {threshold.toFixed(2)}</span>
                <span>+1.0 (плотная зелень)</span>
              </div>
            </div>

            <div className="decision-box">
              <div className="decision-box-title">
                Автоматическое решение системы (NDVI {analysis.ndvi < threshold ? '<' : '≥'} порога):
              </div>
              <p>{analysis.recommendation}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Итоговые результаты работы системы (СРС 3 + СРС 4)</h3>
        <div className="results-three-col">
          <div className="result-summary-item">
            <h4>Прогнозирование</h4>
            <p>
              Выполнен прогноз траектории БПЛА, состояния растительности и рисков отклонения с
              помощью гибридной схемы <code>CNN–LSTM + EKF</code>.
            </p>
          </div>
          <div className="result-summary-item">
            <h4>Результаты обучения</h4>
            <p>
              Модели ИИ (YOLOv8, XGBoost, PPO/PID, Мамдани) обучены на предобработанных датасетах
              с фильтрацией шума и коррекцией GPS.
            </p>
          </div>
          <div className="result-summary-item">
            <h4>Завершённая карта</h4>
            <p>
              Построена локальная 2D/3D карта SLAM с нанесёнными препятствиями, координатами ENU и
              зонами фитостресса по индексу NDVI.
            </p>
          </div>
        </div>
      </section>

      <ImageSlot
        slotId="fig3-ndvi"
        title="Рисунок 3. Интеллектуальное управление моментом съёмки на основе анализа NDVI и признаков фитостресса"
        description="Слот для схемы расчёта NDVI и принятия решений из методических указаний (стр. 4)."
        defaultHintPath="/images/fig3.png"
      />
    </div>
  );
}
