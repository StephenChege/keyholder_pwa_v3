import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'keyholder-devices';

export default function useDeviceStorage() {
  const [savedDevices, setSavedDevices] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Load devices error:', error);
      return [];
    }
  });

  // Persist to localStorage whenever savedDevices changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDevices));
    } catch (error) {
      console.error('Save devices error:', error);
    }
  }, [savedDevices]);

  const addDevice = useCallback((deviceId, deviceName) => {
    setSavedDevices(prev => {
      const exists = prev.find(d => d.id === deviceId);
      if (exists) {
        return prev;
      }
      return [...prev, {
        id: deviceId,
        name: deviceName,
        addedAt: new Date().toISOString()
      }];
    });
  }, []);

  const removeSavedDevice = useCallback((deviceId) => {
    setSavedDevices(prev => prev.filter(d => d.id !== deviceId));
  }, []);

  const updateDeviceName = useCallback((deviceId, newName) => {
    setSavedDevices(prev => 
      prev.map(d => 
        d.id === deviceId ? { ...d, name: newName } : d
      )
    );
  }, []);

  const clearAllDevices = useCallback(() => {
    setSavedDevices([]);
  }, []);

  return {
    savedDevices,
    addDevice,
    removeSavedDevice,
    updateDeviceName,
    clearAllDevices
  };
}
