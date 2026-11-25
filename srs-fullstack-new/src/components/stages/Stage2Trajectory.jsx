import React from "react";
import { DroneSimulator } from "../DroneSimulator";
import { ImageSlot } from "../ImageSlot";

export function Stage2Trajectory({
  flightMode,
  onFlightModeChange,
  obstacles,
  onObstaclesChange,
  cruiseSpeed,
  onTelemetryUpdate,
}) {
  return (
    <div className="stage-content">
      <section className="content-card">
        <h3 className="section-title">
          Генерация траектории (круговая, восьмеричная, к цели)
        </h3>
        <div className="two-col-grid">
          <div>
            <p>
              На втором этапе система рассчитывает наиболее эффективный маршрут
              для БПЛА с учётом геометрии задачи (патрулирование по кругу,
              обзорная восьмёрка или перелёт из точки старта к цели) и
              ограничений окружающей среды.
            </p>
            <ul className="clean-list">
              <li>
                <strong>Применение алгоритмов ИИ:</strong> поиск и сглаживание
                оптимального пути (A*, потенциальные поля, упругая релаксация
                кривой).
              </li>
              <li>
                <strong>Учёт препятствий:</strong> автоматическое построение
                зоны безопасного облёта вокруг каждого обнаруженного объекта.
              </li>
              <li>
                <strong>Системные ограничения:</strong> минимальный радиус
                разворота, длина траектории и запас энергии аккумулятора.
              </li>
            </ul>
          </div>
          <div className="info-callout">
            <div className="info-callout-title">
              Как работает обход препятствий на карте ниже
            </div>
            <p className="muted-text">
              Пунктиром показана номинальная траектория, а сплошной синей линией
              — пересчитанный безопасный маршрут. Для режима «Старт → Цель»
              используется сеточный алгоритм <code>A*</code> со спрямлением и
              сглаживанием, а для замкнутых маршрутов («Круговая» и «Восьмёрка»)
              — радиальное отталкивание и итерационное сглаживание узлов с
              гарантией безопасного зазора.
            </p>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h3 className="section-title">
          Интерактивная 2D-визуализация маршрута и движения БПЛА
        </h3>
        <DroneSimulator
          mode={flightMode}
          onModeChange={onFlightModeChange}
          obstacles={obstacles}
          onObstaclesChange={onObstaclesChange}
          speedPxPerSec={cruiseSpeed}
          onTelemetryUpdate={onTelemetryUpdate}
        />
      </section>

      <details className="optional-slot-details">
        <summary>Дополнительное изображение или схема траектории </summary>
        <div className="optional-slot-body">
          <ImageSlot
            slotId="stage2-trajectory-extra"
            title="Схема генерации траектории БПЛА (Этап 2)"
            description="При необходимости прикрепите дополнительную иллюстрацию маршрута или скриншот моделирования."
            defaultHintPath="/images/stage2.png"
          />
        </div>
      </details>
    </div>
  );
}
