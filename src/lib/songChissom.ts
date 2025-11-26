/**
 * Реализация метода нечётких временных рядов (Fuzzy Time Series)
 * Song, Q., & Chissom, B. S. (1993). Fuzzy time series and its models.
 */

export interface FuzzyInterval {
  id: number
  min: number
  max: number
  mid: number
}

export function songChissomForecast(
  historicalData: number[],
  universeMin: number,
  universeMax: number,
  numFuzzySets: number = 7
): number[] {
  if (historicalData.length < 2) {
    throw new Error('Требуется минимум 2 точки данных')
  }
  if (universeMin >= universeMax) {
    throw new Error('universeMin должен быть меньше universeMax')
  }
  if (numFuzzySets < 3) {
    throw new Error('Число нечётких множеств должно быть >= 3')
  }

  const intervalLength = (universeMax - universeMin) / numFuzzySets
  const intervals: FuzzyInterval[] = Array.from(
    { length: numFuzzySets },
    (_, i) => ({
      id: i + 1,
      min: universeMin + i * intervalLength,
      max: universeMin + (i + 1) * intervalLength,
      mid: universeMin + (i + 0.5) * intervalLength,
    })
  )

  const fuzzify = (value: number): number => {
    for (let i = 0; i < intervals.length; i++) {
      if (value >= intervals[i].min && value <= intervals[i].max) {
        return i + 1
      }
    }
    return value < intervals[0].min ? 1 : intervals.length
  }

  const fuzzySets = historicalData.map(fuzzify)

  // FLR: fuzzy logical relationships
  const flrs = []
  for (let i = 1; i < fuzzySets.length; i++) {
    flrs.push({ from: fuzzySets[i - 1], to: fuzzySets[i] })
  }

  // FLRG: grouped
  const flrg = new Map<number, number[]>()
  flrs.forEach((flr) => {
    if (!flrg.has(flr.from)) flrg.set(flr.from, [])
    flrg.get(flr.from)!.push(flr.to)
  })

  // Forecast
  const forecast: number[] = []
  for (let i = 1; i < historicalData.length; i++) {
    const currentSet = fuzzySets[i - 1]
    const nextGroups = flrg.get(currentSet)

    if (nextGroups) {
      const avgMid =
        nextGroups.reduce((sum, setId) => sum + intervals[setId - 1].mid, 0) /
        nextGroups.length
      forecast.push(avgMid)
    } else {
      forecast.push(intervals[currentSet - 1].mid)
    }
  }

  return forecast
}
