import React, { useState, useEffect, useRef } from 'react';
import { saveLocationToFirebase, loadLocationFromFirebase } from '../firebase';

const MapScreen = ({ connectedDevice, darkMode, onSwitchTab, liveLocation, locationMode }) => {
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('searching');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [firebaseLocation, setFirebaseLocation] = useState(null);
  const [firebaseLastSaved, setFirebaseLastSaved] = useState(null);
  const [error, setError] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);

  // =========================================================================
  // INITIALIZE MAP (only once)
  // =========================================================================
  useEffect(() => {
    if (!mapRef.current) {
      console.log('MapRef not ready');
      return;
    }

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
        icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });

      markerRef.current = marker;
      setMapLoaded(true);
      setError(null);
      console.log('Map initialized successfully');
    } catch (err) {
      console.error('Map initialization failed:', err);
      setError('Failed to initialize map: ' + err.message);
      setMapLoaded(false);
    }
  }, []); // Only run once

  // =========================================================================
  // AUTO-LOAD last saved Firebase location on mount (works without BLE)
  // =========================================================================
  useEffect(() => {
    const deviceName = connectedDevice?.name || 'ESP32_Proximity';
    loadLocationFromFirebase(deviceName).then((saved) => {
      if (saved) {
        setFirebaseLocation(saved);
        setFirebaseLastSaved(saved.lastUpdated);

        // If no live BLE location yet, show Firebase location on map immediately
        if (!liveLocation && markerRef.current && mapInstanceRef.current) {
          markerRef.current.setPosition({ lat: saved.lat, lng: saved.lon });
          mapInstanceRef.current.panTo({ lat: saved.lat, lng: saved.lon });
          setLocation({ lat: saved.lat, lon: saved.lon, accuracy: saved.accuracy, timestamp: saved.timestamp });
          setGpsStatus('firebase-cached'); // distinct status for UI
        }
      }
    });
  }, [mapLoaded]); // run once map is ready

  // =========================================================================
  // AUTO-SAVE to Firebase every 60s, only when GPS status is "valid"
  // =========================================================================
  useEffect(() => {
    if (!connectedDevice) {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      return;
    }

    const deviceName = connectedDevice.name || 'ESP32_Proximity';

    const trySave = () => {
      if (gpsStatus === 'valid' && location) {
        saveLocationToFirebase(deviceName, location).then((success) => {
          if (success) setFirebaseLastSaved(Date.now());
        });
      }
    };

    autoSaveIntervalRef.current = setInterval(trySave, 60000); // every 60s

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [connectedDevice, gpsStatus, location]);



  // =========================================================================
  // REACT TO REAL LOCATION UPDATES FROM BLE (replaces mocked polling)
  // =========================================================================
  useEffect(() => {
    if (!liveLocation || !mapLoaded) return;

    setLocation({
      lat: liveLocation.lat,
      lon: liveLocation.lon,
      accuracy: liveLocation.accuracy,
      timestamp: new Date().toISOString(),
    });
    setGpsStatus(liveLocation.status || 'searching');
    setLastUpdated(new Date());

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setPosition({ lat: liveLocation.lat, lng: liveLocation.lon });
      mapInstanceRef.current.panTo({ lat: liveLocation.lat, lng: liveLocation.lon });
    }
  }, [liveLocation, mapLoaded]);

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
              {gpsStatus === 'firebase-cached' && '☁️ Last Saved Location'}
              {gpsStatus === 'no_fix' && '❌ No Signal'}
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

          {firebaseLastSaved && (
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              ☁️ Cloud saved: {Math.floor((Date.now() - firebaseLastSaved) / 60000)} min ago
            </p>
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

          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            📡 Mode: {locationMode === 'notify' ? 'Live updates' : 'Polling (5s)'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MapScreen;
