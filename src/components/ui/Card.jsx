import React from 'react';
import './Card.css';

function Card({ children, className = '', variant = 'default' }) {
  return (
    <div className={`ui-card ui-card--${variant}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}

export default Card;
