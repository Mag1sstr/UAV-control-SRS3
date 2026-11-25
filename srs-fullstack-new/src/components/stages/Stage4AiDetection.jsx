import React, { useMemo, useState } from 'react';
import { AI_METHODS_TABLE, YOLO_SAMPLE_DETECTIONS } from '../../data/stagesData';

const CATEGORY_COLORS = {
  obstacle: '#dc2626',
  stress: '#d97706',
  vehicle: '#2563eb',
  anomaly: '#7c3aed',
};

const CATEGORY_NAMES = {
  all: 'Все классы',
  obstacle: 'Препятствия',
  stress: 'Фитостресс',
  vehicle: 'Техника',
  anomaly: 'Аномалии текстуры',
};

export function Stage4AiDetection() {
  const [selectedMethodId, setSelectedMethodId] = useState(1);
  const [confThreshold, setConfThreshold] = useState(0.5);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const selectedMethod = useMemo(
    () => AI_METHODS_TABLE.find((m) => m.id === selectedMethodId) || AI_METHODS_TABLE[0],
    [selectedMethodId]
  );

  const visibleDetections = useMemo(() => {
    return YOLO_SAMPLE_DETECTIONS.filter((item) => {
      const passConf = item.confidence >= confThreshold;
      const passCat = categoryFilter === 'all' || item.category === categoryFilter;
      return passConf && passCat;
    });
  }, [confThreshold, categoryFilter]);

  return (
    <div className="stage-content">
      <section className="content-card">
        <h3 className="section-title">
          Методы искусственного интеллекта (СРС 3) и анализ результатов
        </h3>
        <p className="muted-text">
          Нажмите на любую строку таблицы (классы 1–5 из методического задания), чтобы рассмотреть
          конкретный пример применения в системе БПЛА/ГИС, метрики и анализ полученных результатов.
        </p>

        <div className="table-scroll">
          <table className="data-table interactive-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Класс методов ИИ</th>
                <th>Используемый алгоритм</th>
                <th>Назначение / Тип задачи</th>
              </tr>
            </thead>
            <tbody>
              {AI_METHODS_TABLE.map((row) => {
                const isSelected = row.id === selectedMethodId;
                return (
                  <tr
                    key={row.id}
                    className={isSelected ? 'row-selected' : ''}
                    onClick={() => setSelectedMethodId(row.id)}
                  >
                    <td>{row.id}</td>
                    <td>
                      <strong>{row.className}</strong>
                    </td>
                    <td>{row.algorithm}</td>
                    <td>{row.purpose}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="ai-detail-panel">
          <div className="ai-detail-header">
            <span className="ai-detail-badge">Класс {selectedMethod.id}</span>
            <h4>{selectedMethod.exampleTitle}</h4>
          </div>
          <div className="two-col-grid">
            <div>
              <p>
                <strong>Входные данные:</strong> {selectedMethod.exampleInput}
              </p>
              <p>
                <strong>Выход модели:</strong> {selectedMethod.exampleOutput}
              </p>
              <p>
                <strong>Показатели качества:</strong> <code>{selectedMethod.metrics}</code>
              </p>
            </div>
            <div className="info-callout">
              <div className="info-callout-title">Анализ результатов</div>
              <p className="muted-text">{selectedMethod.analysis}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">
          Обнаружение объектов и аномалий (камера БПЛА + нейросеть YOLOv8)
        </h3>
        <p className="muted-text">
          Этап 4 выполняет распознавание объектов на кадре, вычисление координат ограничивающих рамок
          и фиксацию препятствий. Регулируйте порог уверенности (Confidence) и фильтр классов.
        </p>

        <div className="yolo-controls">
          <label className="slider-row yolo-slider">
            <span>
              Порог уверенности YOLOv8 (Confidence): <strong>{confThreshold.toFixed(2)}</strong>
            </span>
            <input
              type="range"
              min="0.2"
              max="0.9"
              step="0.05"
              value={confThreshold}
              onChange={(e) => setConfThreshold(Number(e.target.value))}
            />
          </label>

          <div className="toolbar-group">
            {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn btn-small ${
                  categoryFilter === key ? 'btn-tab-active' : 'btn-secondary'
                }`}
                onClick={() => setCategoryFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="two-col-grid">
          <div className="yolo-frame-wrap">
            <svg viewBox="0 0 680 340" className="yolo-svg" role="img" aria-label="Кадр YOLOv8">
              {/* Стилизованная подложка аэрофотоснимка */}
              <rect width="680" height="340" fill="#e9f0e6" />
              <path d="M0 220 Q 210 185 430 230 T 680 205 L 680 340 L 0 340 Z" fill="#dce7d5" />
              <path d="M0 115 L 680 85 L 680 125 L 0 155 Z" fill="#e2e8f0" opacity="0.65" />

              {/* Ориентиры сцены */}
              <rect x="148" y="96" width="32" height="86" rx="3" fill="#94a3b8" />
              <ellipse cx="381" cy="204" rx="52" ry="34" fill="#d97706" fillOpacity="0.28" />
              <rect x="524" y="108" width="72" height="42" rx="4" fill="#64748b" />
              <circle cx="244" cy="278" r="26" fill="#84a98c" />
              <ellipse cx="508" cy="275" rx="36" ry="22" fill="#94a3b8" fillOpacity="0.4" />

              {visibleDetections.map((det) => {
                const color = CATEGORY_COLORS[det.category] || '#1d4ed8';
                return (
                  <g key={det.id}>
                    <rect
                      x={det.box.x}
                      y={det.box.y}
                      width={det.box.w}
                      height={det.box.h}
                      fill={color}
                      fillOpacity="0.08"
                      stroke={color}
                      strokeWidth="2.2"
                    />
                    <rect
                      x={det.box.x}
                      y={Math.max(4, det.box.y - 20)}
                      width={Math.min(230, det.label.length * 6.8 + 46)}
                      height="19"
                      fill={color}
                    />
                    <text
                      x={det.box.x + 5}
                      y={Math.max(17, det.box.y - 6)}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {det.label} ({(det.confidence * 100).toFixed(0)}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Объект (YOLOv8)</th>
                  <th>Уверенность</th>
                  <th>Координаты (X, Y)</th>
                </tr>
              </thead>
              <tbody>
                {visibleDetections.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted-text">
                      При пороге {confThreshold.toFixed(2)} объекты не найдены.
                    </td>
                  </tr>
                ) : (
                  visibleDetections.map((det) => (
                    <tr key={det.id}>
                      <td>{det.label}</td>
                      <td>{(det.confidence * 100).toFixed(0)}%</td>
                      <td>
                        <code>
                          {det.localCoords.x}, {det.localCoords.y} м
                        </code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
