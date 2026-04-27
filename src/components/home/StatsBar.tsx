interface StatsBarProps {
  weekEvents: number
  activeVenues: number
  artists: number
  openSlots: number
}

export function StatsBar({ weekEvents, activeVenues, artists, openSlots }: StatsBarProps) {
  const stats = [
    { value: weekEvents, label: 'Bu Hafta Etkinlik' },
    { value: activeVenues, label: 'Aktif Mekan' },
    { value: artists, label: 'Kayıtlı Sanatçı' },
    { value: openSlots, label: 'Açık Slot' },
  ]

  return (
    <div className="bg-surface border-y border-[rgba(228,224,216,0.08)] py-3 px-4">
      <div className="max-w-7xl mx-auto flex gap-6 md:gap-12 overflow-x-auto scrollbar-none">
        {stats.map((stat, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="font-bebas text-2xl text-accent">{stat.value}</div>
            <div className="text-xs text-text-muted whitespace-nowrap">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
