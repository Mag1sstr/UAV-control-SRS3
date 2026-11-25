import React, { useState } from 'react';
import { STAGES } from './data/stagesData';
import { StepperNav } from './components/StepperNav';
import { Stage1DataPrep } from './components/stages/Stage1DataPrep';
import { Stage2Trajectory } from './components/stages/Stage2Trajectory';
import { Stage3FlightControl } from './components/stages/Stage3FlightControl';
import { Stage4AiDetection } from './components/stages/Stage4AiDetection';
import { Stage5Mapping } from './components/stages/Stage5Mapping';
import { Stage6Coordinates } from './components/stages/Stage6Coordinates';
import { Stage7Ndvi } from './components/stages/Stage7Ndvi';

const INITIAL_OBSTACLES = [
  { id: 'obs-init-1', x: 245, y: 264, r: 24 },
  { id: 'obs-init-2', x: 360, y: 78, r: 24 },
];

export default function App() {
  const [activeStage, setActiveStage] = useState(1);
  const [flightMode, setFlightMode] = useState('circle');
  const [obstacles, setObstacles] = useState(INITIAL_OBSTACLES);
  const [cruiseSpeed, setCruiseSpeed] = useState(95);

  const currentStageMeta = STAGES.find((s) => s.id === activeStage) || STAGES[0];

  const handleStageChange = (stageId) => {
    const clamped = Math.max(1, Math.min(STAGES.length, stageId));
    setActiveStage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStage = () => {
    switch (activeStage) {
      case 1:
        return <Stage1DataPrep />;
      case 2:
        return (
          <Stage2Trajectory
            flightMode={flightMode}
            onFlightModeChange={setFlightMode}
            obstacles={obstacles}
            onObstaclesChange={setObstacles}
            cruiseSpeed={cruiseSpeed}
          />
        );
      case 3:
        return (
          <Stage3FlightControl
            flightMode={flightMode}
            onFlightModeChange={setFlightMode}
            obstacles={obstacles}
            onObstaclesChange={setObstacles}
            cruiseSpeed={cruiseSpeed}
            onCruiseSpeedChange={setCruiseSpeed}
          />
        );
      case 4:
        return <Stage4AiDetection />;
      case 5:
        return <Stage5Mapping obstacles={obstacles} />;
      case 6:
        return <Stage6Coordinates />;
      case 7:
        return <Stage7Ndvi />;
      default:
        return <Stage1DataPrep />;
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-kicker">СРС 3 и СРС 4 • Интеллектуальная система управления БПЛА</div>
          <h1 className="app-title">Проектирование интеллектуальных систем управления</h1>
          <p className="app-subtitle">
            7-этапная интерактивная система: сбор и предобработка данных, генерация маршрута с
            облётом препятствий, управление полётом, методы ИИ, SLAM-картирование, геодезическая
            привязка и оценка фитостресса по NDVI.
          </p>
        </div>
      </header>

      <main className="app-main">
        <StepperNav
          stages={STAGES}
          activeStage={activeStage}
          onSelectStage={handleStageChange}
        />

        <div className="stage-banner">
          <div className="stage-banner-step">Этап {currentStageMeta.id} / 7</div>
          <h2 className="stage-banner-title">{currentStageMeta.title}</h2>
          <p className="stage-banner-desc">{currentStageMeta.summary}</p>
        </div>

        {renderStage()}

        <div className="bottom-nav">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={activeStage === 1}
            onClick={() => handleStageChange(activeStage - 1)}
          >
            ← Предыдущий этап
          </button>
          <span className="stepper-counter">
            Этап {activeStage} из {STAGES.length}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={activeStage === STAGES.length}
            onClick={() => handleStageChange(activeStage + 1)}
          >
            Следующий этап →
          </button>
        </div>
      </main>
    </div>
  );
}
