import React from 'react';

const AlertComponent = ({ message, type = 'info', onClose }) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  return (
    <div className={`border px-4 py-3 rounded relative mb-4 ${getAlertStyles()}`} role="alert">
      <span className="block sm:inline">{message}</span>
      {onClose && (
        <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
          <button onClick={onClose} className="text-xl leading-none">
            ×
          </button>
        </span>
      )}
    </div>
  );
};

export default AlertComponent;
