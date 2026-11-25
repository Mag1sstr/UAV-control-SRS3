import React, { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'srs_uav_images_v1';

function readStoredImages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStoredImages(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function ImageSlot({
  slotId,
  title,
  description,
  defaultHintPath = '/images/schema.png',
}) {
  const fileInputRef = useRef(null);
  const [imageEntry, setImageEntry] = useState(() => {
    const all = readStoredImages();
    return all[slotId] || null;
  });
  const [urlInput, setUrlInput] = useState(() => {
    const all = readStoredImages();
    return all[slotId]?.mode === 'url' ? all[slotId].src : '';
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const all = readStoredImages();
    const entry = all[slotId] || null;
    setImageEntry(entry);
    setUrlInput(entry?.mode === 'url' ? entry.src : '');
    setLoadFailed(false);
    setErrorMsg('');
  }, [slotId]);

  const saveEntry = (entry) => {
    try {
      const all = readStoredImages();
      if (entry) {
        all[slotId] = entry;
      } else {
        delete all[slotId];
      }
      writeStoredImages(all);
      setImageEntry(entry);
      setLoadFailed(false);
      setErrorMsg('');
    } catch {
      setErrorMsg(
        'Недостаточно места в localStorage для этого файла. Уменьшите размер изображения или укажите путь из папки public/images/.'
      );
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Выберите файл изображения (PNG, JPG, WebP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        saveEntry({
          src: reader.result,
          mode: 'file',
          name: file.name,
        });
      }
    };
    reader.onerror = () => {
      setErrorMsg('Не удалось прочитать выбранный файл.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Укажите путь в public/ (например, /images/fig1.png) или URL.');
      return;
    }
    saveEntry({
      src: trimmed,
      mode: 'url',
      name: trimmed,
    });
  };

  const handleClear = () => {
    saveEntry(null);
    setUrlInput('');
  };

  return (
    <div className="image-slot-card">
      <div className="image-slot-header">
        <div>
          <h4 className="image-slot-title">{title}</h4>
          {description && <p className="image-slot-desc">{description}</p>}
        </div>
        {imageEntry && (
          <button
            type="button"
            className="btn btn-small btn-danger-outline"
            onClick={handleClear}
          >
            Удалить
          </button>
        )}
      </div>

      {imageEntry ? (
        <div className="image-slot-preview">
          {!loadFailed ? (
            <img
              src={imageEntry.src}
              alt={title}
              className="image-slot-img"
              onError={() => setLoadFailed(true)}
            />
          ) : (
            <div className="image-slot-error-box">
              Не удалось загрузить изображение по адресу <code>{imageEntry.src}</code>.
              Проверьте наличие файла в <code>public/</code> или загрузите с компьютера.
            </div>
          )}
          <div className="image-slot-meta">
            <span>
              Источник: <strong>{imageEntry.name}</strong> (
              {imageEntry.mode === 'file' ? 'сохранено в localStorage' : 'путь / URL'})
            </span>
          </div>
        </div>
      ) : (
        <div className="image-slot-empty">
          <div className="image-slot-empty-badge">Слот изображения / схемы из методички</div>
          <div className="image-slot-empty-title">{title}</div>
          <div className="image-slot-empty-sub">
            Загрузите файл с компьютера (сохраняется в браузере) или укажите путь к файлу в{' '}
            <code>public/</code>, например <code>{defaultHintPath}</code>.
          </div>
        </div>
      )}

      <div className="image-slot-controls">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only-input"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageEntry ? 'Заменить файл' : 'Загрузить с компьютера'}
        </button>

        <form className="image-url-form" onSubmit={handleApplyUrl}>
          <input
            type="text"
            className="text-input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={defaultHintPath}
            aria-label="Путь к изображению из public или URL"
          />
          <button type="submit" className="btn btn-secondary btn-small">
            Вставить путь / URL
          </button>
        </form>
      </div>

      {errorMsg && <div className="inline-error">{errorMsg}</div>}
    </div>
  );
}
