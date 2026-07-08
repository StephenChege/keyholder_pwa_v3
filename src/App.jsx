import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import MapScreen from './components/MapScreen';
import Settings from './components/Settings';
import useBLE from './hooks/useBLE';

export default function App() {
  // =========================================================================
  // THEME STATE
  // =========================================================================
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('keyholder-theme');
    return saved ? saved === 'dark' : true;
  });

  // =========================================================================
  // DEVICE & SETTINGS STATE
  // =========================================================================
  const [deviceName, setDeviceName] = useState(() => {
    return localStorage.getItem('keyholder-device-name') || 'My Device';
  });

  const [proximityResponseEnabled, setProximityResponseEnabled] = useState(() => {
    const saved = localStorage.getItem('keyholder-proximity-response');
    return saved ? saved === 'true' : false;
  });

  // =========================================================================
  // LED & BUZZER STATE
  // =========================================================================
  const [ledOn, setLedOn] = useState(false);
  const [ledBrightness, setLedBrightness] = useState(50);
  const [buzzerOn, setBuzzerOn] = useState(false);
  const [buzzerVolume, setBuzzerVolume] = useState(50);

  // =========================================================================
  // TAB STATE
  // =========================================================================
  const [currentTab, setCurrentTab] = useState('control'); // control, map, settings

  // =========================================================================
  // BLE HOOK
  // =========================================================================
  const {
    connectedDevice,
    disconnect,
    discoveryInProgress,
    startDiscovery,
    sendLedBrightness,
    sendBuzzerVolume,
    rssi,
    proximityPercent,
    getProximityOutputValue,
    location,        // NEW
    locationMode,     // NEW
  } = useBLE();

  // =========================================================================
  // PERSIST THEME
  // =========================================================================
  useEffect(() => {
    localStorage.setItem('keyholder-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // =========================================================================
  // PERSIST DEVICE NAME
  // =========================================================================
  useEffect(() => {
    if (deviceName) {
      localStorage.setItem('keyholder-device-name', deviceName);
    }
  }, [deviceName]);

  // =========================================================================
  // PERSIST PROXIMITY RESPONSE
  // =========================================================================
  useEffect(() => {
    localStorage.setItem('keyholder-proximity-response', proximityResponseEnabled ? 'true' : 'false');
  }, [proximityResponseEnabled]);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleAddDevice = async () => {
    await startDiscovery();
  };

  const handleDisconnect = () => {
    disconnect();
    setLedOn(false);
    setBuzzerOn(false);
  };

  const handleResetAll = () => {
    if (window.confirm('Reset all settings? This will clear device names and theme preferences.')) {
      localStorage.clear();
      setDeviceName('My Device');
      setDarkMode(true);
      setProximityResponseEnabled(false);
      setLedOn(false);
      setBuzzerOn(false);
      handleDisconnect();
    }
  };

  const handleToggleProximityResponse = () => {
    setProximityResponseEnabled(!proximityResponseEnabled);
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  // =========================================================================
  // STYLES
  // =========================================================================
  const bgClass = darkMode ? 'bg-slate-950' : 'bg-white';
  const textClass = darkMode ? 'text-white' : 'text-slate-900';
  const borderClass = darkMode ? 'border-slate-800' : 'border-slate-200';

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className={`${bgClass} ${textClass} h-screen flex flex-col`}>
      {/* ===== HEADER ===== */}
      <header className={`border-b ${borderClass} sticky top-0 z-50`}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Title + Connection Status */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">🔑 Keyholder</h1>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {connectedDevice ? `Connected to ${deviceName}` : 'No device connected'}
              </p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className={`flex gap-1 border-b ${borderClass}`}>
            <button
              onClick={() => setCurrentTab('control')}
              className={`px-4 py-2 font-medium transition-colors ${
                currentTab === 'control'
                  ? `border-b-2 ${darkMode ? 'border-emerald-500 text-emerald-400' : 'border-emerald-600 text-emerald-600'}`
                  : darkMode
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎛️ Control
            </button>

            <button
              onClick={() => setCurrentTab('map')}
              className={`px-4 py-2 font-medium transition-colors ${
                currentTab === 'map'
                  ? `border-b-2 ${darkMode ? 'border-emerald-500 text-emerald-400' : 'border-emerald-600 text-emerald-600'}`
                  : darkMode
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗺️ Map
            </button>

            <button
              onClick={() => setCurrentTab('settings')}
              className={`px-4 py-2 font-medium transition-colors ${
                currentTab === 'settings'
                  ? `border-b-2 ${darkMode ? 'border-emerald-500 text-emerald-400' : 'border-emerald-600 text-emerald-600'}`
                  : darkMode
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* CONTROL TAB */}
        {currentTab === 'control' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
              {/* Device Connection */}
              {!connectedDevice && (
                <div className={`p-6 rounded-lg border-2 border-dashed ${
                  darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-300 bg-slate-100'
                } text-center mb-6`}>
                  <p className={`mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    No device connected
                  </p>
                  <button
                    onClick={handleAddDevice}
                    disabled={discoveryInProgress}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      discoveryInProgress
                        ? darkMode
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-400'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {discoveryInProgress ? 'Scanning...' : 'Connect Device'}
                  </button>
                </div>
              )}

              {/* Control Panel */}
              {connectedDevice && (
                <>
                  <ControlPanel
                    ledOn={ledOn}
                    setLedOn={setLedOn}
                    ledBrightness={ledBrightness}
                    setLedBrightness={setLedBrightness}
                    buzzerOn={buzzerOn}
                    setBuzzerOn={setBuzzerOn}
                    buzzerVolume={buzzerVolume}
                    setBuzzerVolume={setBuzzerVolume}
                    darkMode={darkMode}
                    connectedDevice={connectedDevice}
                    sendLedBrightness={sendLedBrightness}
                    sendBuzzerVolume={sendBuzzerVolume}
                    rssi={rssi}
                    proximityPercent={proximityPercent}
                    proximityResponseEnabled={proximityResponseEnabled}
                    onToggleProximityResponse={handleToggleProximityResponse}
                    getProximityOutputValue={getProximityOutputValue}
                  />

                  <button
                    onClick={handleDisconnect}
                    className="w-full mt-6 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-all"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* MAP TAB */}
        {currentTab === 'map' && (
          <MapScreen
            connectedDevice={connectedDevice}
            darkMode={darkMode}
            onSwitchTab={setCurrentTab}
            liveLocation={location}       // NEW
            locationMode={locationMode}   // NEW
          />
        )}

        {/* SETTINGS TAB */}
        {currentTab === 'settings' && (
          <div className="flex-1 overflow-y-auto">
            <Settings
              darkMode={darkMode}
              onThemeToggle={handleThemeToggle}
              connectedDevice={connectedDevice}
              deviceName={deviceName}
              onRenameDevice={(newName) => setDeviceName(newName)}
              onDisconnect={handleDisconnect}
              onResetSettings={handleResetAll}
            />
          </div>
        )}
      </main>
    </div>
  );
}
