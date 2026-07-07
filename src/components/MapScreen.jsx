import React, { useState, useEffect, useRef } from 'react';

/**
 * MapScreen Component (Phase 3.3)
 * 
 * Displays Google Maps with mocked GPS location.
 * In Phase 3.1, will replace mocked data with real GPS from ESP32.
 */
const MapScreen = ({ connectedDevice, darkMode, onSwitchTab }) => {
  // =========================================================================
  // STATE
  // =========================================================================
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('searching');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  // Refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // =========================================================================
  // MOCKED GPS DATA (Nairobi area)
  // Phase 3.1: Replace with real ESP32 GPS via BLE
  // =========================================================================
  const MOCKED_LOCATIONS = [
    { lat: -1.2921, lon: 36.8219, accuracy: 8.5, status: 'valid' }, // Nairobi CBD
    { lat: -1.3120, lon: 36.8155, accuracy: 7.2, status: 'valid' }, // Nairobi East
    { lat: -1.2879, lon: 36.7964, accuracy: 9.1, status: 'valid' }, // Westlands
  ];

  /**
   * Simulate GPS update (every 5 seconds)
   * Phase 3.1: Will read from ESP32 via BLE instead
   */
  const simulateGPSUpdate = () => {
    const randomIndex = Math.floor(Math.random() * MOCKED_LOCATIONS.length);
    const mockedLocation = MOCKED_LOCATIONS[randomIndex];

    setLocation({
      lat: mockedLocation.lat,
      lon: mockedLocation.lon,
      accuracy: mockedLocation.accuracy,
      timestamp: new Date().toISOString(),
    });

    setGpsStatus(mockedLocation.status);
    setLastUpdated(new Date());

    // Update map marker
    if (markerRef.current) {
      markerRef.current.setPosition({
        lat: mockedLocation.lat,
        lng: mockedLocation.lon,
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({
          lat: mockedLocation.lat,
          lng: mockedLocation.lon,
        });
      }
    }
  };

  // =========================================================================
  // INITIALIZE MAP
  // =========================================================================
useEffect(() => {
  if (!mapRef.current) return;

  // Wait for Google Maps API to load
  const waitForGoogle = setInterval(() => {
    if (!window.google) return;

    clearInterval(waitForGoogle);

    const defaultCenter = { lat: -1.2921, lng: 36.8219 };

    try {
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 15,
        center: defaultCenter,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      mapInstanceRef.current = mapInstance;

      const marker = new google.maps.Marker({
        position: defaultCenter,
        map: mapInstance,
        title: "Key Location",
        icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      });

      markerRef.current = marker;

      // Get first location update
      simulateGPSUpdate();
      setPollingActive(true);

    } catch (error) {
      console.error("Map initialization error:", error);
    }
  }, 100);

  return () => {
    clearInterval(waitForGoogle);

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };
}, []);

  // =========================================================================
  // POLLING LOOP (every 5 seconds)
  // =========================================================================
  useEffect(() => {
    if (pollingActive && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        simulateGPSUpdate();
      }, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [pollingActive]);

  // =========================================================================
  // SAVE LOCATION
  // =========================================================================
  const handleSaveLocation = async () => {
    if (!location) {
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const savedLocations = JSON.parse(
        localStorage.getItem('keyholder-locations') || '{}'
      );
      const deviceName = connectedDevice?.name || 'ESP32_Proximity';
      savedLocations[deviceName] = {
        lat: location.lat,
        lon: location.lon,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        source: 'gps',
      };
      localStorage.setItem('keyholder-locations', JSON.stringify(savedLocations));

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving location:', error);
      setSaveStatus('error');
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  const cardClass = darkMode
    ? 'bg-slate-900 border-slate-800'
    : 'bg-slate-50 border-slate-200';

  return (
    <div className="flex flex-col h-full">
      {/* Map Container */}
      <div className="flex-1 relative min-h-96">
        <div
          ref={mapRef}
          className="w-full h-full"
        />
      </div>

      {/* Location Info Panel */}
      <div className={`border-t ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} p-4 space-y-3`}>
        
        {/* GPS Status */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              gpsStatus === 'valid'
                ? 'bg-green-500'
                : gpsStatus === 'stale'
                ? 'bg-yellow-500'
                : gpsStatus === 'no_fix'
                ? 'bg-red-500'
                : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-semibold">
            {gpsStatus === 'valid' && '✓ GPS Fixed'}
            {gpsStatus === 'searching' && '🔍 Searching...'}
            {gpsStatus === 'stale' && '⚠️ Last Known Location'}
            {gpsStatus === 'no_fix' && '❌ No Signal'}
          </span>
        </div>

        {/* Coordinates */}
        {location && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Latitude
              </p>
              <p className="font-mono font-bold text-lg">
                {location.lat.toFixed(4)}°
              </p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Longitude
              </p>
              <p className="font-mono font-bold text-lg">
                {location.lon.toFixed(4)}°
              </p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Accuracy
              </p>
              <p className="font-mono">
                ±{location.accuracy.toFixed(1)}m
              </p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Updated
              </p>
              <p className="font-mono text-sm">
                {lastUpdated
                  ? `${Math.floor((Date.now() - lastUpdated) / 1000)}s ago`
                  : 'Never'}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSaveLocation}
            disabled={!location || saveStatus === 'saving'}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition text-sm"
          >
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✓ Saved!'}
            {saveStatus === 'error' && '⚠️ Error'}
            {saveStatus === 'idle' && '💾 Save Location'}
          </button>
          <button
            onClick={() => onSwitchTab('control')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition text-sm ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            ← Back
          </button>
        </div>

        {/* Phase 3.3 Note */}
        <p className={`text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          📌 Phase 3.3 MVP: Mocked location. Phase 3.1 will use real GPS from ESP32.
        </p>
      </div>
    </div>
  );
};

export default MapScreen;