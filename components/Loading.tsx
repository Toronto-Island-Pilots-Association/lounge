interface LoadingProps {
  message?: string
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Loading({ 
  message = 'Loading...', 
  fullScreen = false,
  size = 'md',
  className = ''
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const spinner = (
    <svg 
      className={`animate-spin ${sizeClasses[size]} text-[#0d1e26]`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  const content = (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {spinner}
      {message && (
        <p className={`mt-4 text-gray-600 ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : ''}`}>
          {message}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

