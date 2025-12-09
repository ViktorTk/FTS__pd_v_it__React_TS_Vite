import { songChissomForecast } from '../lib/songChissom'

export const applySongChissomPredictionWithParams = (
  data,
  universeMin,
  universeMax,
  numFuzzySets
) => {
  const actuals = data.map((d) => d.actual)
  const forecasts = songChissomForecast(
    actuals,
    universeMin,
    universeMax,
    numFuzzySets
  )

  return data.map((point, index) => ({
    ...point,
    predicted: index === 0 ? undefined : forecasts[index - 1],
  }))
}
