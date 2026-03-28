'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<
  React.ComponentPropsWithoutRef<'input'>,
  'type'
> & {
  /** Optional custom class for the wrapper (e.g. for consistent spacing). */
  wrapperClassName?: string
}

const PasswordInput = ({
  className = '',
  wrapperClassName = '',
  ...props
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false)

  const handleToggle: () => void = () => {
    setShowPassword((prev) => !prev)
  }

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <input
        type={showPassword ? 'text' : 'password'}
        className={`pr-10 ${className}`.trim()}
        {...props}
      />
      <button
        type="button"
        onClick={handleToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="h-5 w-5" aria-hidden />
        ) : (
          <Eye className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  )
}

export default PasswordInput
