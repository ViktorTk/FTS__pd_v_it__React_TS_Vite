import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { OilPricePoint } from '../../../types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface ChartComponentProps {
  data: OilPricePoint[]
}

export const ChartComponent = ({ data }: ChartComponentProps) => {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: 'Фактическая цена',
        data: data.map((d) => d.actual), // ← ИСПРАВЛЕНО: добавлено "data:"
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        pointRadius: 3,
        tension: 0.2,
      },
      {
        label: 'Прогноз (Song–Chissom)',
        data: data.map((d) => d.predicted ?? null), // ← ИСПРАВЛЕНО
        borderColor: 'rgba(255, 99, 132, 1)',
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        tension: 0.2,
      },
    ],
  }

  const options = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: 'Прогноз стоимости фьючерсов нефти (нечёткие временные ряды)',
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Дата' },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: 'Цена, USD' },
        beginAtZero: false,
      },
    },
  }

  return <Line data={chartData} options={options} />
}
