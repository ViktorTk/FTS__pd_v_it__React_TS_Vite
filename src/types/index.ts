export interface OilPricePoint {
  date: string // ISO 8601: 'YYYY-MM-DD'
  actual: number // фактическая цена
  predicted?: number // прогноз (может отсутствовать)
}

