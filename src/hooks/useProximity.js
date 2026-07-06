import { useState, useEffect, useRef, useCallback } from 'react';

const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const RSSI_CHARACTERISTIC_UUID = 'abcd1234-5678-1234-5678-abcdef123457';

/**
 * Convert RSSI to proximity percentage
 * RSSI ranges from approximately -100 dBm (far) to -30 dBm (very close)
 * Returns 0-100% where 100% = very close, 0% = far away
 */
function rssiToProximity(rssi) {
  if (rssi === null || rssi === undefined) return 0;

  // Clamp RSSI to reasonable range
  const minRSSI = -100;  // Far away
  const maxRSSI = -30;   // Very close
  
  const clamped = Math.max(minRSSI, Math.min(maxRSSI, rssi));
  const proximity = ((clamped - minRSSI) / (maxRSSI - minRSSI)) * 100;
  
  return Math.round(Math.max(0, Math.min(100, proximity)));
}

export default function useProximity(connectedDevice) {
  const [rssi, setRssi] = useState(null);
  const [proximityPercent, setProximityPercent] = useState(0);
  const notificationHandlerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Subscribe to notifications when characteristic value changes
  const setupNotifications = useCallback(async () => {
    if (!connectedDevice?.device) return;

    try {
      const service = await connectedDevice.device.gatt.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(RSSI_CHARACTERISTIC_UUID);

      // Create handler for notifications
      const handleNotification = (event) => {
        const value = event.target.value;
        
        // Read as 2-byte signed integer (little-endian)
        const view = new DataView(value.buffer);
        const newRssi = view.getInt16(0, true);
        
        setRssi(newRssi);
        setProximityPercent(rssiToProximity(newRssi));
      };

      // Start notifications
      await characteristic.startNotifications();
      notificationHandlerRef.current = handleNotification;
      characteristic.addEventListener('characteristicvaluechanged', handleNotification);

      console.log('RSSI notifications enabled');
    } catch (error) {
      console.error('Setup notifications error:', error);
      // Fallback to polling
      setupPolling();
    }
  }, [connectedDevice]);

  // Fallback: Poll RSSI if notifications don't work
  const setupPolling = useCallback(async () => {
    if (!connectedDevice?.device) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const service = await connectedDevice.device.gatt.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(RSSI_CHARACTERISTIC_UUID);
        const value = await characteristic.readValue();
        
        // Read as 2-byte signed integer (little-endian)
        const view = new DataView(value.buffer);
        const newRssi = view.getInt16(0, true);
        
        setRssi(newRssi);
        setProximityPercent(rssiToProximity(newRssi));
      } catch (error) {
        console.error('Poll RSSI error:', error);
      }
    }, 500); // Poll every 500ms
  }, [connectedDevice]);

  // Setup notifications on connection
  useEffect(() => {
    if (connectedDevice?.device) {
      setupNotifications();
    }

    return () => {
      // Cleanup
      if (notificationHandlerRef.current && connectedDevice?.device) {
        try {
          connectedDevice.device.gatt
            .getPrimaryService(SERVICE_UUID)
            .then(service => service.getCharacteristic(RSSI_CHARACTERISTIC_UUID))
            .then(char => char.removeEventListener('characteristicvaluechanged', notificationHandlerRef.current));
        } catch (error) {
          console.error('Cleanup notifications error:', error);
        }
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [connectedDevice, setupNotifications]);

  return {
    rssi,
    proximityPercent
  };
}
