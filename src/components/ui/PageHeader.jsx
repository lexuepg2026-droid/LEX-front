import React from 'react';
import { Link } from 'react-router-dom';
import './Button.css';
import './PageHeader.css';

function PageHeader({ title, actionLabel, actionTo, onAction }) {
  return (
    <div className="page-header-ui">
      <h1 className="page-header-ui__title">{title}</h1>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="ui-btn ui-btn--primary ui-btn--md">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button type="button" className="ui-btn ui-btn--primary ui-btn--md" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default PageHeader;
