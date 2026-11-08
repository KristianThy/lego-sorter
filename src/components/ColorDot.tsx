export function ColorDot({ rgb, trans, size = 14 }: { rgb: string; trans?: boolean; size?: number }) {
  return (
    <span
      className={trans ? 'dot trans' : 'dot'}
      style={{ width: size, height: size, ['--c' as string]: `#${rgb}` }}
      aria-hidden
    />
  )
}
