interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark-outline' | 'tennis';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  disabled,
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    secondary: 'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-emerald-500',
    ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-500',
    'dark-outline': 'border border-white/20 bg-transparent text-white hover:bg-white/10 focus:ring-white/50',
    tennis: 'bg-tennis text-brand-dark hover:bg-tennis-dim focus:ring-tennis'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
