import mascotSrc from '../assets/mascot-mi.webp'

const SIZE_CLASS = {
  brand: 'mascot-brand',
  sm: 'mascot-sm',
  md: 'mascot-md',
  lg: 'mascot-lg',
  loading: 'mascot-loading',
}

export default function Mascot({
  size = 'md',
  mood = 'idle',
  decorative = true,
}) {
  const className = [
    'mascot',
    SIZE_CLASS[size] || SIZE_CLASS.md,
    mood === 'reading' ? 'is-reading' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={className} aria-hidden={decorative ? 'true' : undefined}>
      <img
        src={mascotSrc}
        alt={decorative ? '' : '달토끼 미, 사주미 마스코트'}
        draggable="false"
      />
    </span>
  )
}
