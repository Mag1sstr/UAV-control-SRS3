import React, { useMemo, useState } from 'react';
import { MAP_HEIGHT, MAP_WIDTH } from '../../utils/dronePath';
import { ImageSlot } from '../ImageSlot';

export function Stage5Mapping({ obstacles }) {
  const [frameOk, setFrameOk] = useState(true);
  const [objectFound, setObjectFound] = useState(true);
  const [textureAnomaly, setTextureAnomaly] = useState(false);
  const [hasTargetObject, setHasTargetObject] = useState(true);
  const [mapView, setMapView] = useState('2d');

  const trace = useMemo(() => {
    const activeNodes = new Set(['start', 'get_frame', 'check_frame']);
    const logs = [
      '1. Запуск потока с камеры.',
      '2. Получение кадра с камеры.',
    ];

    if (!frameOk) {
      activeNodes.add('continue');
      logs.push('3. Проверка кадра: кадр НЕ получен → переход на ветку continue (повтор цикла).');
      return { activeNodes, logs };
    }

    activeNodes.add('detect');
    activeNodes.add('texture');
    activeNodes.add('gps');
    activeNodes.add('check_anomaly');
    logs.push('3. Кадр получен → выполняется detect объектов (YOLOv8).');
    logs.push('4. Проверка аномалий текстуры и получение координат GPS (get_gps_coords).');

    const triggered = objectFound || textureAnomaly;
    if (triggered) {
      activeNodes.add('make_msg');
      logs.push(
        `5. Обнаружены ${
          objectFound && textureAnomaly
            ? 'объекты и аномалии'
            : objectFound
            ? 'объекты'
            : 'аномалии текстуры'
        } → формирование сообщения.`
      );
      if (hasTargetObject) {
        activeNodes.add('control_obj');
        logs.push('6. Ветка «если есть объект» → Управление объектом / перестроение маршрута.');
      } else {
        activeNodes.add('send_msg');
        logs.push('6. Ветка «если нет» → Отправка сообщения оператору.');
      }
    } else {
      logs.push('5. Объекты и аномалии не выявлены → прямой переход к анализу ИИ.');
    }

    activeNodes.add('cnn_lstm');
    activeNodes.add('ai_decision');
    activeNodes.add('adaptive_uav');
    activeNodes.add('feedback');
    logs.push('7. Анализ нейронной сетью CNN-LSTM-EKF → принятие решений на основе ИИ.');
    logs.push('8. Адаптивное управление БПЛА и замыкание контура обратной связи.');

    return { activeNodes, logs };
  }, [frameOk, objectFound, textureAnomaly, hasTargetObject]);

  const nodeStyle = (id) => {
    const active = trace.activeNodes.has(id);
    return {
      fill: active ? '#eff6ff' : '#ffffff',
      stroke: active ? '#2563eb' : '#94a3b8',
      strokeWidth: active ? 2.2 : 1.3,
    };
  };

  return (
    <div className="stage-content">
      <section className="content-card">
        <h3 className="section-title">Построение карты окружающей среды (SLAM) и принятие решений</h3>
        <div className="two-col-grid">
          <div>
            <h4 className="sub-title">Задачи картирования</h4>
            <ul className="clean-list">
              <li>
                <strong>Применение алгоритма SLAM:</strong> одновременная локализация БПЛА и
                построение карты местности по кадрам камеры, IMU и GPS.
              </li>
              <li>
                <strong>Создание 2D/3D карты:</strong> формирование сетки занятости (occupancy grid)
                и карты высот препятствий.
              </li>
              <li>
                <strong>Нанесение объектов на карту:</strong> привязка обнаруженных препятствий и
                зон интереса к координатам карты.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="sub-title">Логика ветвления (по Рисунку 2)</h4>
            <p className="muted-text">
              Система последовательно проверяет получение кадра с камеры, выполняет детекцию
              объектов и аномалий текстуры, считывает GPS, формирует сообщение или управляющее
              воздействие и замыкает адаптивный контур на базе <code>CNN-LSTM-EKF</code> с обратной
              связью.
            </p>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Интерактивный симулятор ветвления алгоритма (Рисунок 2)</h3>
        <div className="pipeline-controls">
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={frameOk}
              onChange={(e) => setFrameOk(e.target.checked)}
            />
            <span>Кадр с камеры получен</span>
          </label>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={objectFound}
              disabled={!frameOk}
              onChange={(e) => setObjectFound(e.target.checked)}
            />
            <span>Обнаружен объект (detect)</span>
          </label>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={textureAnomaly}
              disabled={!frameOk}
              onChange={(e) => setTextureAnomaly(e.target.checked)}
            />
            <span>Аномалия текстуры</span>
          </label>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={hasTargetObject}
              disabled={!frameOk || (!objectFound && !textureAnomaly)}
              onChange={(e) => setHasTargetObject(e.target.checked)}
            />
            <span>Есть управляемый объект</span>
          </label>
        </div>

        <div className="two-col-grid">
          <div className="flowchart-wrap">
            <svg viewBox="0 0 640 430" className="flowchart-svg" role="img" aria-label="Блок-схема этапа 5">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
              </defs>

              {/* Соединения левой ветки */}
              <line x1="175" y1="36" x2="175" y2="54" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="175" y1="84" x2="175" y2="104" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              {/* continue */}
              <line x1="95" y1="126" x2="54" y2="126" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="175" y1="148" x2="175" y2="168" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="175" y1="198" x2="175" y2="216" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="175" y1="246" x2="175" y2="264" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="175" y1="296" x2="175" y2="314" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="175" y1="358" x2="175" y2="374" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              {/* к правой ветке */}
              <path d="M 255 336 L 340 336 L 340 60 L 386 60" fill="none" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrow)" />
              {/* связи правой ветки */}
              <line x1="485" y1="90" x2="485" y2="122" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="485" y1="160" x2="485" y2="192" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <line x1="485" y1="230" x2="485" y2="262" stroke="#64748b" strokeWidth="1.4" markerEnd="url(#arrow)" />
              <path d="M 575 281 L 606 281 L 606 211 L 577 211" fill="none" stroke="#0f766e" strokeWidth="1.4" markerEnd="url(#arrow)" />

              {/* Узлы левой ветки */}
              <rect x="85" y="10" width="180" height="26" rx="4" {...nodeStyle('start')} />
              <text x="175" y="27" textAnchor="middle" className="flow-text">Запуск потока с камеры</text>

              <rect x="85" y="54" width="180" height="30" rx="4" {...nodeStyle('get_frame')} />
              <text x="175" y="73" textAnchor="middle" className="flow-text">Получение кадра с камеры</text>

              <polygon points="175,104 255,126 175,148 95,126" {...nodeStyle('check_frame')} />
              <text x="175" y="130" textAnchor="middle" className="flow-text-sm">Кадр не получен?</text>

              <rect x="6" y="112" width="48" height="28" rx="4" {...nodeStyle('continue')} />
              <text x="30" y="130" textAnchor="middle" className="flow-text-sm">continue</text>

              <rect x="85" y="168" width="180" height="30" rx="4" {...nodeStyle('detect')} />
              <text x="175" y="187" textAnchor="middle" className="flow-text">Обнаружение объектов (detect)</text>

              <rect x="85" y="216" width="180" height="30" rx="4" {...nodeStyle('texture')} />
              <text x="175" y="235" textAnchor="middle" className="flow-text">Проверка аномалий текстуры</text>

              <rect x="85" y="264" width="180" height="32" rx="4" {...nodeStyle('gps')} />
              <text x="175" y="284" textAnchor="middle" className="flow-text">Получение GPS (get_gps_coords)</text>

              <polygon points="175,314 255,336 175,358 95,336" {...nodeStyle('check_anomaly')} />
              <text x="175" y="340" textAnchor="middle" className="flow-text-sm">Объект / аномалия?</text>

              <rect x="105" y="374" width="140" height="24" rx="4" {...nodeStyle('make_msg')} />
              <text x="175" y="390" textAnchor="middle" className="flow-text-sm">Формирование сообщения</text>

              <rect x="20" y="402" width="132" height="24" rx="4" {...nodeStyle('send_msg')} />
              <text x="86" y="418" textAnchor="middle" className="flow-text-sm">Отправка сообщения</text>

              <rect x="190" y="402" width="136" height="24" rx="4" {...nodeStyle('control_obj')} />
              <text x="258" y="418" textAnchor="middle" className="flow-text-sm">Управление объектом</text>

              {/* Узлы правой ветки */}
              <polygon points="485,28 584,59 485,90 386,59" {...nodeStyle('cnn_lstm')} />
              <text x="485" y="56" textAnchor="middle" className="flow-text-sm">Анализ ИИ</text>
              <text x="485" y="69" textAnchor="middle" className="flow-text-sm">CNN-LSTM-EKF</text>

              <rect x="395" y="122" width="180" height="38" rx="4" {...nodeStyle('ai_decision')} />
              <text x="485" y="145" textAnchor="middle" className="flow-text">Принятие решений на основе ИИ</text>

              <rect x="395" y="192" width="180" height="38" rx="4" {...nodeStyle('adaptive_uav')} />
              <text x="485" y="215" textAnchor="middle" className="flow-text">Адаптивное управление БПЛА</text>

              <rect x="395" y="262" width="180" height="38" rx="4" {...nodeStyle('feedback')} />
              <text x="485" y="285" textAnchor="middle" className="flow-text">Обратная связь и коррекция</text>
            </svg>
          </div>

          <div className="log-panel">
            <h4 className="sub-title">Трассировка выполнения цикла</h4>
            <ol className="trace-log-list">
              {trace.logs.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="content-card">
        <div className="section-header-row">
          <h3 className="section-title">Результирующая карта SLAM (2D / 3D представление)</h3>
          <div className="toolbar-group">
            <button
              type="button"
              className={`btn btn-small ${mapView === '2d' ? 'btn-tab-active' : 'btn-secondary'}`}
              onClick={() => setMapView('2d')}
            >
              2D SLAM-карта
            </button>
            <button
              type="button"
              className={`btn btn-small ${mapView === '3d' ? 'btn-tab-active' : 'btn-secondary'}`}
              onClick={() => setMapView('3d')}
            >
              3D профиль высот
            </button>
          </div>
        </div>

        <p className="muted-text">
          На карту автоматически наносятся препятствия с карты этапа 2 (сейчас объектов:{' '}
          <strong>{obstacles.length}</strong>) и ориентиры SLAM.
        </p>

        {mapView === '2d' ? (
          <svg viewBox={`0 0 ${MAP_WIDTH} 260`} className="slam-svg">
            <defs>
              <pattern id="slam-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={MAP_WIDTH} height="260" fill="#f8fafc" />
            <rect width={MAP_WIDTH} height="260" fill="url(#slam-grid)" />
            {obstacles.map((obs, idx) => {
              const sy = (obs.y / MAP_HEIGHT) * 260;
              return (
                <g key={obs.id}>
                  <rect
                    x={obs.x - obs.r}
                    y={sy - obs.r * 0.65}
                    width={obs.r * 2}
                    height={obs.r * 1.3}
                    fill="#fecaca"
                    stroke="#dc2626"
                    strokeWidth="1.5"
                    rx="3"
                  />
                  <text x={obs.x} y={sy + 4} textAnchor="middle" className="svg-obs-label">
                    SLAM #{idx + 1}
                  </text>
                </g>
              );
            })}
            <circle cx="140" cy="130" r="6" fill="#0f766e" />
            <text x="152" y="134" className="svg-marker-label">Ключевой ориентир SLAM A</text>
            <circle cx="520" cy="95" r="6" fill="#0f766e" />
            <text x="532" y="99" className="svg-marker-label">Ключевой ориентир SLAM B</text>
          </svg>
        ) : (
          <svg viewBox="0 0 680 260" className="slam-svg">
            <rect width="680" height="260" fill="#f8fafc" />
            {/* Изометрическая сетка поверхности */}
            <polygon
              points="340,36 620,126 340,224 60,126"
              fill="#eef2ff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            {obstacles.map((obs, idx) => {
              const nx = obs.x / MAP_WIDTH;
              const ny = obs.y / MAP_HEIGHT;
              const isoX = 340 + (nx - ny) * 260;
              const isoY = 50 + (nx + ny) * 85;
              const h = 28 + (idx % 3) * 10;
              return (
                <g key={obs.id}>
                  <rect
                    x={isoX - 10}
                    y={isoY - h}
                    width="20"
                    height={h}
                    fill="#dc2626"
                    fillOpacity="0.65"
                    stroke="#991b1b"
                  />
                  <text x={isoX} y={isoY - h - 5} textAnchor="middle" className="svg-obs-label">
                    H={h}м
                  </text>
                </g>
              );
            })}
            <text x="20" y="242" className="svg-axis-label">
              3D представление карты занятости и высот препятствий (Z, м)
            </text>
          </svg>
        )}
      </section>

      <ImageSlot
        slotId="fig2-flowchart"
        title="Рисунок 2. Блок-схема обработки видеопотока, обнаружения аномалий и адаптивного управления"
        description="Слот для оригинальной схемы из методического руководства (стр. 4)."
        defaultHintPath="/images/fig2.png"
      />
    </div>
  );
}
