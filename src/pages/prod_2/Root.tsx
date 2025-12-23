import { useEffect, useState, useCallback } from 'react'
import type { OilPricePoint } from '../../types'
import { initialOilData } from '../../data/oilFuturesData'
import { applySongChissomPredictionWithParams } from './components/FuzzyPrediction'
import { ChartComponent } from './components/ChartComponent'
import { Link } from 'react-router'
import './prod_2.css'

function App() {
  const [data, setData] = useState<OilPricePoint[]>([])
  const [tableData, setTableData] = useState<OilPricePoint[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<{ date: string; actual: string }>({
    date: '',
    actual: '',
  })

  const [universeMin, setUniverseMin] = useState<number>(30)
  const [universeMax, setUniverseMax] = useState<number>(100)
  const [numFuzzySets, setNumFuzzySets] = useState<number>(7)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // === Тема ===
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    const initialTheme = saved ?? systemTheme
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  // === Инициализация данных (новые сверху) ===
  useEffect(() => {
    const saved = localStorage.getItem('oilData')
    let parsed: OilPricePoint[] = saved ? JSON.parse(saved) : initialOilData
    parsed.sort((a, b) => b.date.localeCompare(a.date)) // новые даты — выше
    setTableData(parsed)
  }, [])

  // === Сохранение строки ===
  const handleSave = () => {
    if (editingIndex === null) return

    const newDate = editRow.date.trim()
    const newActual = parseFloat(editRow.actual)

    if (!newDate) {
      alert('Дата обязательна')
      return
    }
    if (isNaN(newActual)) {
      alert('Некорректная стоимость')
      return
    }

    const isDuplicate = tableData.some(
      (row, idx) => row.date === newDate && idx !== editingIndex
    )

    if (isDuplicate) {
      alert('Дата уже существует. Пожалуйста, выберите другую дату.')
      return
    }

    const newData = [...tableData]
    newData[editingIndex] = { date: newDate, actual: newActual }
    newData.sort((a, b) => b.date.localeCompare(a.date)) // новые сверху в таблице
    setTableData(newData)
    setEditingIndex(null)
  }

  const handleCancel = () => setEditingIndex(null)

  const handleEdit = (index: number) => {
    const row = tableData[index]
    setEditingIndex(index)
    setEditRow({ date: row.date, actual: String(row.actual) })
  }

  const handleDelete = (index: number) => {
    if (tableData.length <= 1) {
      alert('Нельзя удалить последнюю запись')
      return
    }
    const newData = tableData.filter((_, i) => i !== index)
    setTableData(newData)
  }

  // === Генерация уникальной даты ===
  const generateUniqueDate = (): string => {
    const dates = new Set(tableData.map((row) => row.date))
    let date = new Date()
    let dateString = ''
    let attempts = 0
    do {
      dateString = date.toISOString().split('T')[0]
      if (!dates.has(dateString)) break
      date.setDate(date.getDate() + 1)
      attempts++
    } while (attempts < 365)
    return dateString
  }

  // === Добавление строки — в начало ===
  const handleAddRow = () => {
    const newDate = generateUniqueDate()
    const newRow = { date: newDate, actual: 0 }
    setTableData([newRow, ...tableData]) // новая строка — первая
    setEditingIndex(0)
    setEditRow({ date: newDate, actual: '0' })
  }

  const handleReset = () => {
    const sorted = [...initialOilData].sort((a, b) =>
      b.date.localeCompare(a.date)
    )
    setTableData(sorted)
    setUniverseMin(30)
    setUniverseMax(100)
    setNumFuzzySets(7)
  }

  // === Автоматический пересчёт ===
  const recompute = useCallback(() => {
    if (tableData.length === 0) return

    try {
      // График: данные в порядке от старых к новым
      const chartDataOrdered = [...tableData].sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      const withPred = applySongChissomPredictionWithParams(
        chartDataOrdered,
        universeMin,
        universeMax,
        numFuzzySets
      )

      setData(withPred)
      localStorage.setItem('oilData', JSON.stringify(tableData)) // сохраняем в порядке таблицы
    } catch (e) {
      console.error(e)
      alert('Ошибка расчёта: ' + (e as Error).message)
    }
  }, [tableData, universeMin, universeMax, numFuzzySets])

  useEffect(() => {
    recompute()
  }, [recompute])

  // === Расчёт метрик точности ===
  const calculateMetrics = useCallback(() => {
    if (data.length === 0) {
      return {
        lastPredicted: null,
        avgActual: 0,
        avgPredicted: 0,
        mape: 0, // ← средняя абсолютная процентная ошибка
        validPoints: 0,
      }
    }

    // Последнее прогнозное значение (включая будущее)
    const lastPredicted = data[data.length - 1].predicted ?? null

    // Собираем только точки, где есть И факт, И прогноз, И факт не NaN
    const errors: number[] = []
    const actuals: number[] = []
    const predictions: number[] = []

    for (const point of data) {
      // Пропускаем будущую точку (actual = NaN) и первую точку (predicted = undefined)
      if (
        point.actual != null &&
        point.predicted != null &&
        !isNaN(point.actual) &&
        isFinite(point.actual) &&
        isFinite(point.predicted)
      ) {
        actuals.push(point.actual)
        predictions.push(point.predicted)

        const absError = Math.abs(point.actual - point.predicted)
        const absPercentError =
          point.actual !== 0 ? (absError / Math.abs(point.actual)) * 100 : 0
        errors.push(absPercentError)
      }
    }

    if (errors.length === 0) {
      return {
        lastPredicted,
        avgActual: 0,
        avgPredicted: 0,
        mape: 0,
        validPoints: 0,
      }
    }

    const avgActual = actuals.reduce((a, b) => a + b, 0) / actuals.length
    const avgPredicted =
      predictions.reduce((a, b) => a + b, 0) / predictions.length
    const mape = errors.reduce((a, b) => a + b, 0) / errors.length // средняя процентная ошибка

    return {
      lastPredicted,
      avgActual,
      avgPredicted,
      mape,
      validPoints: errors.length,
    }
  }, [data])

  const metrics = calculateMetrics()

  return (
    <div className="app-container">
      <div className="links-container">
        <Link to={'/predRelease'}>К пред-релиз-версии</Link>
        <Link to={'/demo'}>К демо-версии</Link>
      </div>
      <div className="theme-switch">
        <input
          type="checkbox"
          id="themeSwitch"
          className="theme-switch__input"
          checked={theme === 'dark'}
          onChange={toggleTheme}
          aria-label="Переключить цветовую тему"
        />
        <label htmlFor="themeSwitch" className="theme-switch__label">
          <span className="theme-switch__icon theme-switch__icon--sun">🌕</span>
          <span className="theme-switch__icon theme-switch__icon--moon">
            🌑
          </span>
          <span className="theme-switch__toggle"></span>
        </label>
      </div>

      <h1>
        Анализ нечетких временных рядов: Прогнозирование стоимости фьючерсов
        нефти
      </h1>

      <hr />
      <p>Учебный проект по дисциплине «Проектная деятельность в ИТ»</p>
      <p>
        Выполнили:
        <br />
        <strong>Спесивцев Д.В.</strong> – Руководитель проекта
        <br />
        <strong>Ткачев В.Н.</strong> – Разработчик
        <br />
        <strong>Тюлькин Д.В.</strong> – Тестировщик / Аналитик
      </p>

      <div className="main-layout">
        <div className="left-column">
          <div className="control-panel">
            <h3>Параметры модели Song–Chissom</h3>
            <div className="controls-row">
              <div className="control-group">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Мин. универсум:</span>
                  <div className="tooltip-container">
                    ℹ️
                    <div className="tooltip-text">
                      Нижняя граница универсума значений (U). Определяет
                      диапазон, в котором строятся нечёткие множества. Слишком
                      низкое значение снижает точность модели, слишком высокое —
                      увеличивает шум и размывает прогноз.
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={universeMin}
                  onChange={(e) => setUniverseMin(Number(e.target.value))}
                  step="0.1"
                  className="control-input"
                />
              </div>
              <div className="control-group">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Макс. универсум:</span>
                  <div className="tooltip-container">
                    ℹ️
                    <div className="tooltip-text">
                      Верхняя граница универсума значений (U). Влияет на охват
                      диапазона данных. Неправильный выбор может привести к
                      недообучению (слишком узкий диапазон) или переобучению
                      (слишком широкий диапазон с пустыми интервалами).
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={universeMax}
                  onChange={(e) => setUniverseMax(Number(e.target.value))}
                  step="0.1"
                  className="control-input"
                />
              </div>
              <div className="control-group">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Нечёткие множества:</span>
                  <div className="tooltip-container">
                    ℹ️
                    <div className="tooltip-text">
                      Количество нечётких множеств (fuzzy sets) — это число
                      интервалов, на которые разбивается универсум значений (U).
                      Каждое множество соответствует лингвистической переменной
                      (например, «низкая цена», «средняя цена», «высокая цена»).
                      <br />
                      <br />
                      <strong>Влияние:</strong>
                      <br />• <em>Мало множеств (3–5)</em> — грубая модель,
                      быстро обучается, но теряет детали и может давать неточный
                      прогноз.
                      <br />• <em>Много множеств (10–15)</em> — более точная
                      модель, улавливает мелкие колебания, но рискует
                      переобучиться на шуме.
                      <br />
                      <br />
                      Оптимальное значение подбирается экспериментально. Для
                      волатильных данных (как цена нефти) часто выбирают от 7 до
                      10 множеств.
                    </div>
                  </div>
                </div>
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
              <button onClick={handleReset} className="btn-secondary">
                Сбросить
              </button>
            </div>
          </div>

          {data.length > 0 && <ChartComponent data={data} />}
          {/* Инфопанель под диаграммой */}
          <div className="metrics-panel">
            <div className="metric-card">
              <h4>Последний прогноз</h4>
              <p className="metric-value">
                {metrics.lastPredicted !== null
                  ? `${metrics.lastPredicted.toFixed(3)} USD`
                  : '—'}
              </p>
              <p className="metric-label">Прогноз на следующий период</p>
            </div>
            <div className="metric-card">
              <h4>Качество прогноза</h4>
              <div className="metric-row">
                <span>Проанализировано точек:</span>
                <strong>{metrics.validPoints}</strong>
              </div>
              <div className="metric-row">
                <span>Средняя ошибка (MAPE):</span>
                <strong className={metrics.mape > 10 ? 'error' : ''}>
                  {metrics.mape.toFixed(2)}%
                </strong>
              </div>
              <div className="metric-row">
                <span>Средний факт:</span>
                <strong>{metrics.avgActual.toFixed(3)} USD</strong>
              </div>
              <div className="metric-row">
                <span>Средний прогноз:</span>
                <strong>{metrics.avgPredicted.toFixed(3)} USD</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="data-table-container">
            <h3>Исходные данные</h3>
            <button onClick={handleAddRow} className="btn-add">
              + Добавить запись
            </button>
            <div className="table-scroll-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Стоимость, USD</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, index) => (
                    <tr
                      key={index}
                      className={
                        editingIndex === index
                          ? 'table-row-editing'
                          : index === 0 && editingIndex === null
                          ? 'table-row-new'
                          : ''
                      }
                    >
                      {editingIndex === index ? (
                        <>
                          <td>
                            <input
                              type="date"
                              value={editRow.date}
                              onChange={(e) =>
                                setEditRow({ ...editRow, date: e.target.value })
                              }
                              className="table-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={editRow.actual}
                              onChange={(e) =>
                                setEditRow({
                                  ...editRow,
                                  actual: e.target.value,
                                })
                              }
                              className="table-input"
                            />
                          </td>
                          <td>
                            <button onClick={handleSave} className="btn-save">
                              Сохранить
                            </button>
                            <button
                              onClick={handleCancel}
                              className="btn-cancel"
                            >
                              Отмена
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{row.date}</td>
                          <td>{row.actual.toFixed(3)}</td>
                          <td>
                            <button
                              onClick={() => handleEdit(index)}
                              className="btn-edit"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleDelete(index)}
                              className="btn-delete"
                              style={{ marginTop: '6px' }}
                            >
                              Удалить
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        Данные хранятся в <code>localStorage</code>. Прогноз обновляется
        автоматически.
      </footer>
    </div>
  )
}

export default App
