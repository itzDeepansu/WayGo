'use client';
import React from 'react';

const InputsPanel = ({
  start,
  setStart,
  viaPoints,
  setViaPoints,
  end,
  setEnd,
  buffer,
  setBuffer,
  zone,
  setZone,
  loading,
  onGenerateRoute
}) => {
  const handleAddViaPoint = () => setViaPoints([...viaPoints, '']);
  const handleRemoveViaPoint = (index) => setViaPoints(viaPoints.filter((_, i) => i !== index));
  const handleViaPointChange = (value, index) => {
    const newViaPoints = [...viaPoints];
    newViaPoints[index] = value;
    setViaPoints(newViaPoints);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-semibold mb-4">Route Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Location</label>
          <input
            type="text"
            placeholder="Enter starting location (e.g., New York, NY)"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Location</label>
          <input
            type="text"
            placeholder="Enter destination (e.g., Los Angeles, CA)"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Distance (meters)</label>
          <input
            type="number"
            placeholder="1000"
            value={buffer}
            onChange={(e) => setBuffer(parseInt(e.target.value) || 1000)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
          <input
            type="text"
            placeholder="Enter zone name"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Via Points</label>
          <button
            onClick={handleAddViaPoint}
            className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition-colors"
          >
            Add Via Point
          </button>
        </div>
        
        {viaPoints.map((point, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder={`Via Point ${index + 1} (e.g., Chicago, IL)`}
              value={point}
              onChange={(e) => handleViaPointChange(e.target.value, index)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleRemoveViaPoint(index)}
              className="bg-red-500 text-white px-3 py-2 rounded-md text-sm hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onGenerateRoute}
        disabled={loading}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded-md mt-4 hover:bg-blue-600 transition-colors disabled:bg-gray-400"
      >
        {loading ? 'Generating Route...' : 'Generate Route & Check Deliveries'}
      </button>
    </div>
  );
};

export default InputsPanel;
