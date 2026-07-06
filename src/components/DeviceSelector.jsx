import React, { useState } from 'react';

export default function DeviceSelector({
  savedDevices,
  selectedDeviceId,
  connectedDevice,
  onSelectDevice,
  onAddNewDevice,
  discoveryInProgress,
  onDeviceDiscovered,
  darkMode
}) {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [showDiscovery, setShowDiscovery] = useState(false);

  const cardClass = darkMode 
    ? 'bg-slate-900 border-slate-800' 
    : 'bg-slate-50 border-slate-200';
  const buttonClass = darkMode
    ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
    : 'bg-emerald-600 hover:bg-emerald-700 text-white';

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4">Your Devices</h2>
      
      {/* Saved Devices List */}
      <div className="space-y-2 mb-4">
        {savedDevices.length > 0 ? (
          savedDevices.map(device => (
            <button
              key={device.id}
              onClick={() => onSelectDevice(device.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedDeviceId === device.id
                  ? darkMode
                    ? 'border-emerald-500 bg-emerald-900/30'
                    : 'border-emerald-500 bg-emerald-50'
                  : darkMode
                    ? 'border-slate-800 bg-slate-900'
                    : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{device.name}</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {device.id.substring(0, 8)}...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {connectedDevice?.id === device.id && (
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  )}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            No saved devices yet
          </p>
        )}
      </div>

      {/* Add Device Button */}
      <button
        onClick={() => {
          setShowDiscovery(!showDiscovery);
          if (!showDiscovery) {
            onAddNewDevice();
          }
        }}
        disabled={discoveryInProgress}
        className={`w-full p-3 rounded-lg border-2 border-dashed transition-all ${
          discoveryInProgress
            ? darkMode
              ? 'border-slate-700 text-slate-400'
              : 'border-slate-300 text-slate-400'
            : darkMode
              ? 'border-slate-700 hover:border-emerald-500 text-slate-300'
              : 'border-slate-300 hover:border-emerald-500 text-slate-700'
        }`}
      >
        {discoveryInProgress ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Scanning for devices...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Device
          </span>
        )}
      </button>

      {/* Discovery Status */}
      {discoveryInProgress && (
        <p className={`text-xs mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Looking for BLE devices nearby... Make sure your device is powered on.
        </p>
      )}
    </div>
  );
}
