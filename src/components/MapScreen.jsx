import React, { useState, useEffect, useRef } from 'react';

const MapScreen = ({ connectedDevice, darkMode, onSwitchTab }) => {
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('searching');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const MOCKED_LOCATIONS = [
    { lat: -1.2921, lon: 36.8219, accuracy: 8.5, status: 'valid' },
    { lat: -1.3120, lon: 36.8155, accuracy: 7.2, status: 'valid' },
    { lat: -1.2879, lon: 36.7964, accuracy: 9.1, status: 'valid' },
  ];

  // =========================================================================
  // INITIALIZE MAP (only once, with proper Google Maps check)
  // =========================================================================
  useEffect(() => {
    if (!mapRef.current) {
      console.log('MapRef not ready');
      return;
    }

    // Check if Google Maps is available
    if (typeof google === 'undefined' || !google.maps) {
      console.error('Google Maps API not loaded');
      setError('Google Maps failed to load. Refresh the page.');
      return;
    }

    try {
      console.log('Initializing Google Maps...');
      const defaultCenter = { lat: -1.2921, lng: 36.8219 };

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
        title: 'Key Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });

      markerRef.current = marker;
      setMapLoaded(true);
      setError(null);
      console.log('Map initialized successfully');

      // Simulate first location
      const firstLoc = MOCKED_LOCATIONS[0];
      setLocation({
        lat: firstLoc.lat,
        lon: firstLoc.lon,
        accuracy: firstLoc.accuracy,
        timestamp: new Date().toISOString(),
      });
      setGpsStatus('valid');
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Map initialization failed:', err);
      setError('Failed to initialize map: ' + err.message);
      setMapLoaded(false);
    }

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  // =========================================================================
  // POLLING (separate effect, only when map is loaded)
  // =========================================================================
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markerRef.current) {
      return;
    }

    console.log('Starting polling...');

    const poll = () => {
      try {
        const randomIndex = Math.floor(Math.random() * MOCKED_LOCATIONS.length);
        const loc = MOCKED_LOCATIONS[randomIndex];

        setLocation({
          lat: loc.lat,
          lon: loc.lon,
          accuracy: loc.accuracy,
          timestamp: new Date().toISOString(),
        });
        setGpsStatus('valid');
        setLastUpdated(new Date());

        // Update marker position
        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setPosition({ lat: loc.lat, lng: loc.lon });
          mapInstanceRef.current.panTo({ lat: loc.lat, lng: loc.lon });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Start polling every 5 seconds
    pollingIntervalRef.current = setInterval(poll, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [mapLoaded]); // Only re-run if mapLoaded changes

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
    } catch (err) {
      console.error('Save error:', err);
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
      {/* Error Message */}
      {error && (
        <div className="bg-red-500 text-white p-4 text-center">
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-1 bg-white text-red-500 rounded font-medium"
          >
            Refresh Page
          </button>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative min-h-96">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Location Info Panel */}
      {mapLoaded && (
        <div className={`border-t ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} p-4 space-y-3`}>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                gpsStatus === 'valid' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-semibold">
              {gpsStatus === 'valid' && '✓ GPS Fixed'}
            </span>
          </div>

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
                <p className="font-mono">±{location.accuracy.toFixed(1)}m</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Updated
                </p>
                <p className="font-mono text-sm">
                  {lastUpdated ? `${Math.floor((Date.now() - lastUpdated) / 1000)}s ago` : 'Never'}
                </p>
              </div>
            </div>
          )}

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

          <p className={`text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            📌 Phase 3.3 MVP: Mocked location. Phase 3.1 will use real GPS from ESP32.
          </p>
        </div>
      )}
    </div>
  );
};

export default MapScreen;
