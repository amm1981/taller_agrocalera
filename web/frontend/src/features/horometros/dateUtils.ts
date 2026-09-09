const LIMA_TIME_ZONE = 'America/Lima'

export function limaTodayYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

export function currentLimaIsoWeekRange(date = new Date()) {
  const base = ymdToLocalNoon(limaTodayYmd(date))
  const isoDay = base.getDay() === 0 ? 7 : base.getDay()
  const start = addDays(base, 1 - isoDay)
  const end = addDays(start, 6)

  return {
    fecha_desde: localDateToYmd(start),
    fecha_hasta: localDateToYmd(end),
  }
}

function ymdToLocalNoon(value: string) {
  const [year, month, day] = value.split('-').map(Number)

  return new Date(year, month - 1, day, 12)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)

  return next
}

function localDateToYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
