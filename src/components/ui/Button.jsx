import React from 'react';
import './Button.css';

function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`ui-btn ui-btn--${variant} ui-btn--${size}${loading ? ' ui-btn--loading' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {icon && !loading && <span className="ui-btn__icon">{icon}</span>}
      {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default Button;
