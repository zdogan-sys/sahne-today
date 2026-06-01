import { useLocale } from 'next-intl'
import { getGenreColor, translateGenre } from '@/lib/utils'

interface GenreChipProps {
  genre: string
  size?: 'sm' | 'md'
}

export function GenreChip({ genre, size = 'sm' }: GenreChipProps) {
  const locale = useLocale()
  const color = getGenreColor(genre)
  return (
    <span
      className="chip"
      style={{
        backgroundColor: `${color}1f`,
        color,
        border: `0.5px solid ${color}40`,
      }}
    >
      {translateGenre(genre, locale)}
    </span>
  )
}
