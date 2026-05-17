type SpinnerSize = 'xs' | 'sm' | 'md'

const SIZE_CLASS: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
}

export function Spinner({
  size = 'sm',
  className = '',
}: {
  size?: SpinnerSize
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={`inline-block animate-spin rounded-full border-current border-r-transparent align-[-2px] ${SIZE_CLASS[size]} ${className}`}
    />
  )
}
