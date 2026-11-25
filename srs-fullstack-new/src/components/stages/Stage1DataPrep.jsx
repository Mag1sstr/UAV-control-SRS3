import React, { useMemo, useState } from 'react';
import { DATASET_FEATURES } from '../../data/stagesData';
import { ImageSlot } from '../ImageSlot';

const RAW_SIGNAL = [
  { t: 0, raw: 14.2, gpsDrift: 3.9 },
  { t: 1, raw: 21.8, gpsDrift: 4.3 },
  { t: 2, raw: 12.6, gpsDrift: 3.7 },
  { t: 3, raw: 26.4, gpsDrift: 4.8 },
  { t: 4, raw: 18.1, gpsDrift: 4.1 },
  { t: 5, raw: 31.5, gpsDrift: 5.2 },
  { t: 6, raw: 22.0, gpsDrift: 4.4 },
  { t: 7, raw: 24.8, gpsDrift: 3.8 },
  { t: 8, raw: 29.7, gpsDrift: 4.6 },
  { t: 9, raw: 21.2, gpsDrift: 3.5 },
  { t: 10, raw: 25.4, gpsDrift: 4.0 },
  { t: 11, raw: 26.8, gpsDrift: 3.6 },
];

export function Stage1DataPrep() {
  const [enableDenoise, setEnableDenoise] = useState(true);
  const [enableNormalize, setEnableNormalize] = useState(true);
  const [enableOpenCv, setEnableOpenCv] = useState(true);
  const [enableGpsCorrection, setEnableGpsCorrection] = useState(true);

  const processed = useMemo(() => {
    const filtered = RAW_SIGNAL.map((item, idx, arr) => {
      if (!enableDenoise) return item.raw;
      const prev = arr[Math.max(0, idx - 1)].raw;
      const next = arr[Math.min(arr.length - 1, idx + 1)].raw;
      return Number((0.25 * prev + 0.5 * item.raw + 0.25 * next).toFixed(2));
    });

    const minV = Math.min(...filtered);
    const maxV = Math.max(...filtered);

    const normalized = filtered.map((v) => {
      if (!enableNormalize) return v;
      return Number(((v - minV) / Math.max(maxV - minV, 1e-6)).toFixed(3));
    });

    const gpsAvgError = enableGpsCorrection ? 0.42 : 4.16;
    const snrDb = (enableDenoise ? 19.4 : 11.2) + (enableOpenCv ? 3.1 : 0);

    return {
      filtered,
      normalized,
      minV,
      maxV,
      gpsAvgError,
      snrDb: snrDb.toFixed(1),
    };
  }, [enableDenoise, enableNormalize, enableOpenCv, enableGpsCorrection]);

  // Построение точек графика (SVG 480x160)
  const chartW = 480;
  const chartH = 150;
  const padX = 24;
  const padY = 16;

  const rawPath = useMemo(() => {
    return RAW_SIGNAL.map((d, i) => {
      const x = padX + (i / (RAW_SIGNAL.length - 1)) * (chartW - padX * 2);
      const norm = (d.raw - 10) / 25;
      const y = chartH - padY - norm * (chartH - padY * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, []);

  const cleanPath = useMemo(() => {
    return processed.filtered
      .map((val, i) => {
        const x = padX + (i / (processed.filtered.length - 1)) * (chartW - padX * 2);
        const norm = (val - 10) / 25;
        const y = chartH - padY - norm * (chartH - padY * 2);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [processed.filtered]);

  return (
    <div className="stage-content">
      <section className="content-card">
        <h3 className="section-title">Входные данные и выполняемые задачи</h3>
        <div className="two-col-grid">
          <div>
            <h4 className="sub-title">Источники входных данных</h4>
            <ul className="clean-list">
              <li>
                <strong>Поток данных с камеры:</strong> RGB и мультиспектральные кадры для
                обнаружения препятствий, текстурных аномалий и расчёта NDVI.
              </li>
              <li>
                <strong>Карта, положение, цель:</strong> цифровая карта местности, стартовая
                позиция БПЛА, целевые точки и ограничения зоны полёта.
              </li>
              <li>
                <strong>Данные GPS (и IMU):</strong> географические координаты (широта, долгота,
                высота), курс и скорость с временными метками.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="sub-title">Выполняемые задачи этапа</h4>
            <ul className="clean-list">
              <li>Сбор и синхронизация данных с бортовых камер и датчиков;</li>
              <li>Удаление шума (медианная/гауссова фильтрация) и выбросов;</li>
              <li>Нормализация признаков в единый диапазон перед подачей в модели ИИ;</li>
              <li>Обработка изображений библиотекой <strong>OpenCV</strong> (выравнивание гистограммы, устранение дисторсии);</li>
              <li>Коррекция данных GPS и устранение сбоев сенсоров.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Работа с датасетами и особенности их применения</h3>
        <div className="features-grid">
          {DATASET_FEATURES.map((item) => (
            <div key={item.title} className="feature-item">
              <div className="feature-item-title">{item.title}</div>
              <p className="feature-item-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">
          Интерактивный симулятор конвейера предобработки данных
        </h3>
        <p className="muted-text">
          Включайте модули очистки и коррекции, чтобы увидеть влияние предобработки на поток
          телеметрии, кадры OpenCV и точность GPS перед подачей данных в алгоритмы ИИ.
        </p>

        <div className="pipeline-controls">
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={enableDenoise}
              onChange={(e) => setEnableDenoise(e.target.checked)}
            />
            <span>Фильтрация шума (сглаживание)</span>
          </label>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={enableNormalize}
              onChange={(e) => setEnableNormalize(e.target.checked)}
            />
            <span>Нормализация Min-Max [0; 1]</span>
          </label>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={enableOpenCv}
              onChange={(e) => setEnableOpenCv(e.target.checked)}
            />
            <span>Обработка изображений (OpenCV CLAHE)</span>
          </label>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={enableGpsCorrection}
              onChange={(e) => setEnableGpsCorrection(e.target.checked)}
            />
            <span>Коррекция дрейфа GPS</span>
          </label>
        </div>

        <div className="two-col-grid">
          <div className="chart-box">
            <div className="chart-header">
              <span>Сигнал датчиков: исходный vs очищенный</span>
              <span className="chart-legend">
                <span className="legend-dot legend-raw" /> Исходный
                <span className="legend-dot legend-clean" /> После фильтра
              </span>
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="mini-svg-chart">
              <line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} stroke="#cbd5e1" />
              <line x1={padX} y1={padY} x2={padX} y2={chartH - padY} stroke="#cbd5e1" />
              <path
                d={rawPath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.8"
                strokeDasharray="4 3"
              />
              <path d={cleanPath} fill="none" stroke="#2563eb" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="metrics-summary-box">
            <div className="metric-row">
              <span>Соотношение сигнал/шум (SNR):</span>
              <strong>{processed.snrDb} дБ</strong>
            </div>
            <div className="metric-row">
              <span>Средняя погрешность GPS:</span>
              <strong>±{processed.gpsAvgError.toFixed(2)} м</strong>
            </div>
            <div className="metric-row">
              <span>Диапазон значений на входе ИИ:</span>
              <strong>
                {enableNormalize
                  ? '[0.000 ; 1.000]'
                  : `[${processed.minV.toFixed(1)} ; ${processed.maxV.toFixed(1)}]`}
              </strong>
            </div>
            <div className="metric-row">
              <span>Состояние кадра (OpenCV):</span>
              <strong>
                {enableOpenCv
                  ? 'Выровнен контраст, удалена дисторсия'
                  : 'Сырой кадр без коррекции экспозиции'}
              </strong>
            </div>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Кадр / такт</th>
                <th>Сырой сигнал датчика</th>
                <th>После фильтрации</th>
                <th>Выход для ИИ</th>
              </tr>
            </thead>
            <tbody>
              {RAW_SIGNAL.slice(0, 6).map((row, idx) => (
                <tr key={row.t}>
                  <td>t = {row.t} с</td>
                  <td>{row.raw.toFixed(2)}</td>
                  <td>{processed.filtered[idx].toFixed(2)}</td>
                  <td>
                    <code>{processed.normalized[idx]}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ImageSlot
        slotId="fig1-architecture"
        title="Рисунок 1. Структурная схема 7-этапной интеллектуальной информационной системы"
        description="Схема из методических указаний (СРС 3), показывающая взаимосвязь этапов 1–7, потоков данных, документации и контура интеллектуального управления."
        defaultHintPath="/images/fig1.png"
      />
    </div>
  );
}
