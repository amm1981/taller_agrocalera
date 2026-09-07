import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800',
  secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
