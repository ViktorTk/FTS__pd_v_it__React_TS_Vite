import type { OilPricePoint } from '../../../types'
import { songChissomForecast } from '../lib/songChissom'

const addSixMonths = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  let newMonth = month + 6
  let newYear = year
  if (newMonth > 12) {
    newMonth -= 12
    newYear += 1
  }
  const newMonthStr = newMonth.toString().padStart(2, '0')
  const newDayStr = day.toString().padStart(2, '0')
  return `${newYear}-${newMonthStr}-${newDayStr}`
}

export const applySongChissomPredictionWithParams = (
  data: OilPricePoint[],
  universeMin: number,
  universeMax: number,
  numFuzzySets: number
): OilPricePoint[] => {
  const actuals = data.map((d) => d.actual)

  // Прогнозируем на 1 шаг вперёд
  const forecasts = songChissomForecast(
    actuals,
    universeMin,
    universeMax,
    numFuzzySets,
    1
  )

  const result: OilPricePoint[] = []

  // 1. Исходные данные с прогнозом (начиная со 2-й точки)
  for (let i = 0; i < data.length; i++) {
    result.push({
      ...data[i],
      predicted: i === 0 ? undefined : forecasts[i - 1],
    })
  }

  // 2. Добавляем новую прогнозную точку (+6 месяцев)
  const lastDate = data[data.length - 1].date
  const nextDate = addSixMonths(lastDate)
  const nextPredicted = forecasts[forecasts.length - 1] // последний элемент — прогноз вперёд

  result.push({
    date: nextDate,
    actual: NaN, // не будет отображаться на графике факта
    predicted: nextPredicted,
  })

  return result
}
