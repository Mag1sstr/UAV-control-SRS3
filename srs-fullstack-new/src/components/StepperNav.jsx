import React from 'react';

export function StepperNav({ stages, activeStage, onSelectStage }) {
  const isFirst = activeStage === 1;
  const isLast = activeStage === stages.length;

  return (
    <div className="stepper-container">
      <nav className="stepper-list" aria-label="Этапы системы">
        {stages.map((stage) => {
          const isActive = stage.id === activeStage;
          const isCompleted = stage.id < activeStage;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              className={`stepper-item ${isActive ? 'is-active' : ''} ${
                isCompleted ? 'is-done' : ''
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="stepper-num">{stage.id}</span>
              <span className="stepper-label">{stage.shortTitle}</span>
            </button>
          );
        })}
      </nav>

      <div className="stepper-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isFirst}
          onClick={() => onSelectStage(activeStage - 1)}
        >
          ← Назад
        </button>
        <div className="stepper-counter">
          Этап {activeStage} из {stages.length}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isLast}
          onClick={() => onSelectStage(activeStage + 1)}
        >
          Следующий этап →
        </button>
      </div>
    </div>
  );
}
