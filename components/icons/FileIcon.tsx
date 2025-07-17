import React from 'react';

const FileIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M5.25 2.25a.75.75 0 00-.75.75v18a.75.75 0 00.75.75h13.5a.75.75 0 00.75-.75V6.75a.75.75 0 00-.22-.53l-4.5-4.5a.75.75 0 00-.53-.22H5.25zM15 6.75V3.375L18.375 6.75H15z" />
  </svg>
);

export default FileIcon;
