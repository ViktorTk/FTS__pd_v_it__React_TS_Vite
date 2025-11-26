import { useEffect, useState } from 'react'
import type { OilPricePoint } from './types'
import { initialOilData } from './data/oilFuturesData'
import { applySongChissomPredictionWithParams } from './components/FuzzyPrediction'
import { ChartComponent } from './components/ChartComponent'

function App() {
  const [data, setData] = useState<OilPricePoint[]>([])
  const [editableData, setEditableData] = useState<string>('')

  const [universeMin, setUniverseMin] = useState<number>(70)
  const [universeMax, setUniverseMax] = useState<number>(85)
  const [numFuzzySets, setNumFuzzySets] = useState<number>(7)

  useEffect(() => {
    const stored = localStorage.getItem('oilData')
    const parsed = stored ? JSON.parse(stored) : initialOilData
    setEditableData(JSON.stringify(parsed, null, 2))
    recomputePrediction(parsed)
  }, [])

  const recomputePrediction = (inputData: OilPricePoint[]) => {
    try {
      const validated = inputData.map((item) => {
        if (typeof item.date !== 'string' || typeof item.actual !== 'number') {
          throw new Error('Некорректный формат данных')
        }
        return item
      })
      const withPred = applySongChissomPredictionWithParams(
        validated,
        universeMin,
        universeMax,
        numFuzzySets
      )
      setData(withPred)
      localStorage.setItem('oilData', JSON.stringify(validated))
    } catch (e) {
      console.error(e)
      alert('Ошибка: ' + (e as Error).message)
    }
  }

  const handleRecompute = () => {
    try {
      const newData = JSON.parse(editableData)
      if (!Array.isArray(newData))
        throw new Error('Данные должны быть массивом')
      recomputePrediction(newData)
    } catch (e) {
      alert('Некорректный JSON')
    }
  }

  const handleReset = () => {
    setEditableData(JSON.stringify(initialOilData, null, 2))
    setUniverseMin(70)
    setUniverseMax(85)
    setNumFuzzySets(7)
    recomputePrediction(initialOilData)
  }

  // --- управление темой ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Попытка загрузить сохранённую тему
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    } else {
      // Если нет — использовать системную
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      setTheme(systemTheme)
      document.documentElement.setAttribute('data-theme', systemTheme)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <div className="app-container">
      <button onClick={toggleTheme} className="theme-toggle">
        🌓 {theme === 'light' ? 'Тёмная' : 'Светлая'}
      </button>

      <h1>
        Анализ нечетких временных рядов: Прогнозирование стоимости фьючерсов
        нефти
      </h1>
      <p>Учебный проект по дисциплине «Проектная деятельность в ИТ»</p>
      <p>
        Выполнили:
        <br />
        <strong>Спесивцев Д.В.</strong> – Руководитель проекта - координация,
        контроль сроков, ведение документации. Может совмещать с разработкой
        <br />
        <strong>Ткачев В.Н.</strong> – Разработчик - реализация фронтенда и/или
        бэкенда;
        <br />
        <strong>Тюлькин Д.В.</strong> – Тестировщик / Аналитик - сбор простых
        требований, тестирование функционала, подготовка отчёта.
      </p>

      <div className="main-layout">
        <div className="left-column">
          {/* Панель управления */}
          <div className="control-panel">
            <h3>Параметры модели Song–Chissom</h3>
            <div className="controls-row">
              <div className="control-group">
                <label>Мин. универсум:</label>
                <input
                  type="number"
                  value={universeMin}
                  onChange={(e) => setUniverseMin(Number(e.target.value))}
                  step="0.1"
                  className="control-input"
                />
              </div>
              <div className="control-group">
                <label>Макс. универсум:</label>
                <input
                  type="number"
                  value={universeMax}
                  onChange={(e) => setUniverseMax(Number(e.target.value))}
                  step="0.1"
                  className="control-input"
                />
              </div>
              <div className="control-group">
                <label>Нечёткие множества:</label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={numFuzzySets}
                  onChange={(e) =>
                    setNumFuzzySets(
                      Math.max(3, Math.min(15, Number(e.target.value)))
                    )
                  }
                  className="control-input"
                />
              </div>
              <button onClick={handleRecompute} className="btn-primary">
                Пересчитать
              </button>
              <button onClick={handleReset} className="btn-secondary">
                Сбросить
              </button>
            </div>
          </div>

          {/* Визуализация */}
          {data.length > 0 && <ChartComponent data={data} />}
        </div>

        <div className="right-column">
          {/* Редактор данных */}
          <div className="data-editor">
            <h3>Исходные данные (JSON)</h3>
            <textarea
              value={editableData}
              onChange={(e) => setEditableData(e.target.value)}
              rows={15}
              className="data-textarea"
            />
            <button onClick={handleRecompute} className="btn-apply">
              Применить данные и пересчитать прогноз
            </button>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        Данные можно редактировать. Измененные данные хранятся в{' '}
        <code>localStorage</code>.
      </footer>
    </div>
  )
}

export default App
