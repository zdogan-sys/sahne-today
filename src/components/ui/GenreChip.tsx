import { getGenreColor } from '@/lib/utils'

interface GenreChipProps {
  genre: string
  size?: 'sm' | 'md'
}

export function GenreChip({ genre, size = 'sm' }: GenreChipProps) {
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
      {genre}
    </span>
  )
}
