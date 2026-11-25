const EARTH_RADIUS_M = 6378137; // WGS-84 semi-major axis

/**
 * Преобразование географических координат WGS-84 (lat, lon, alt)
 * в локальную декартову систему координат ENU (Восток X, Север Y, Высота Z).
 */
export function gpsToLocalENU(origin, target, applyEkfCorrection = true) {
  const dLatRad = ((target.lat - origin.lat) * Math.PI) / 180;
  const dLonRad = ((target.lon - origin.lon) * Math.PI) / 180;
  const meanLatRad = (((origin.lat + target.lat) / 2) * Math.PI) / 180;

  // Учет эксцентриситета WGS-84 для локальной точности
  const e2 = 0.00669437999014;
  const sinLat = Math.sin(meanLatRad);
  const denom = Math.sqrt(1 - e2 * sinLat * sinLat);
  const Rn = EARTH_RADIUS_M / denom; // Радиус кривизны первого вертикала
  const Rm = (EARTH_RADIUS_M * (1 - e2)) / Math.pow(denom, 3); // Радиус кривизны меридиана

  let eastX = dLonRad * (Rn + origin.alt) * Math.cos(meanLatRad);
  let northY = dLatRad * (Rm + origin.alt);
  let upZ = target.alt - origin.alt;

  // Имитация остаточного шума GPS без коррекции EKF/RTK
  const rawErrorMeters = applyEkfCorrection ? 0.35 : 3.4;
  if (!applyEkfCorrection) {
    eastX += 2.15;
    northY -= 2.63;
    upZ += 1.4;
  }

  const horizontalDist = Math.hypot(eastX, northY);
  const distance3D = Math.hypot(eastX, northY, upZ);
  let azimuthDeg = (Math.atan2(eastX, northY) * 180) / Math.PI;
  if (azimuthDeg < 0) azimuthDeg += 360;

  return {
    eastX,
    northY,
    upZ,
    horizontalDist,
    distance3D,
    azimuthDeg,
    Rm,
    Rn,
    estimatedErrorM: rawErrorMeters,
  };
}

/**
 * Расчет вегетационного индекса NDVI = (NIR - Red) / (NIR + Red)
 * и оценка признаков фитостресса.
 */
export function calculateNdvi(nir, red, threshold = 0.4) {
  const sum = nir + red;
  const ndvi = sum === 0 ? 0 : (nir - red) / sum;

  let stressLevel = 'Нет признаков фитостресса';
  let stressCode = 'healthy';
  let recommendation =
    'Состояние растительного покрова в норме. Продолжить плановый мониторинг по заданному маршруту.';

  if (ndvi < 0.15) {
    stressLevel = 'Открытая почва / критическая деградация';
    stressCode = 'critical';
    recommendation =
      'Значение NDVI ниже 0.15. Зафиксировать координаты и выполнить детальную мультиспектральную съёмку.';
  } else if (ndvi < threshold) {
    stressLevel = 'Признаки фитостресса (подозрение на стресс)';
    stressCode = 'stress';
    recommendation =
      'NDVI < порога. Автоматически активировать камеру высокого разрешения и передать кадр в ИИ-классификатор фитостресса.';
  }

  return {
    ndvi,
    hasStress: ndvi < threshold,
    stressLevel,
    stressCode,
    recommendation,
  };
}

/**
 * Моделирование отклика контура управления полётом (PID или PPO)
 * при ступенчатом изменении курса / боковом ветре.
 */
export function simulateFlightResponse({
  mode,
  kp,
  ki,
  kd,
  ppoGain,
  targetSpeed,
  windDisturbance,
}) {
  const steps = 60;
  const dt = 0.1; // 6 секунд
  let error = 18; // начальное отклонение курса (градусы)
  let integral = 0;
  let prevError = error;
  let velocity = 0;

  const series = [];
  let maxOvershoot = 0;
  let settlingTime = 6.0;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const windTorque = windDisturbance * 0.42 * (1 + 0.15 * Math.sin(t * 2.2));

    let control = 0;
    if (mode === 'PID') {
      integral += error * dt;
      const derivative = (error - prevError) / dt;
      control = kp * error + ki * integral + kd * derivative;
    } else {
      // PPO (нейросетевая политика: нелинейное адаптивное демпфирование + компенсация возмущений)
      const speedFactor = 0.85 + Math.min(targetSpeed, 20) * 0.015;
      control = ppoGain * Math.tanh(error / 9) * 18 * speedFactor - velocity * (0.65 + ppoGain * 0.28) + windTorque * 0.88;
    }

    const accel = -control - 0.38 * velocity + windTorque;
    velocity += accel * dt;
    prevError = error;
    error += velocity * dt;

    if (error < 0) {
      maxOvershoot = Math.max(maxOvershoot, Math.abs(error));
    }

    series.push({
      t: Number(t.toFixed(1)),
      error: Number(error.toFixed(2)),
    });
  }

  // Время стабилизации (|error| < 1.5 град до конца окна)
  for (let i = series.length - 1; i >= 0; i--) {
    if (Math.abs(series[i].error) > 1.5) {
      settlingTime = series[Math.min(i + 1, series.length - 1)].t;
      break;
    }
    if (i === 0) settlingTime = 0.2;
  }

  const steadyError = Math.abs(series[series.length - 1].error);
  const overshootPct = Number(((maxOvershoot / 18) * 100).toFixed(1));

  return {
    series,
    overshootPct,
    settlingTime: Number(settlingTime.toFixed(1)),
    steadyError: Number(steadyError.toFixed(2)),
  };
}
