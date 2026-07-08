import { useState, useCallback, useRef, useEffect } from 'react';

const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const LED_WRITE_UUID = 'deadbeef-1234-1234-1234-123456789abc';
const BUZZER_WRITE_UUID = 'deadbeef-1234-1234-1234-123456789abd';
const RSSI_READ_UUID = 'abcd1234-5678-1234-5678-abcdef123457';
const LOCATION_READ_UUID = '12345678-1234-1234-1234-123456789ace';

// ============================================================================
// Convert RSSI to proximity percentage (0-100%)
// ============================================================================
function rssiToProximity(rssi) {
  if (rssi === null || rssi === undefined) return 0;
  
  // RSSI range: -100 dBm (far) to -30 dBm (very close)
  const minRSSI = -100;
  const maxRSSI = -30;
  
  const clamped = Math.max(minRSSI, Math.min(maxRSSI, rssi));
  const proximity = ((clamped - minRSSI) / (maxRSSI - minRSSI)) * 100;
  
  return Math.round(Math.max(0, Math.min(100, proximity)));
}

function parseLocationValue(dataView) {
  try {
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(dataView);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse location JSON:', error);
    return null;
  }
}

// ============================================================================
// Convert proximity percentage to output value (0-255)
// When close (100%) → full output (255)
// When far (0%) → minimum output (30)
// ============================================================================
function proximityToOutputValue(proximityPercent) {
  const minOutput = 30;   // Minimum brightness/volume
  const maxOutput = 255;  // Maximum brightness/volume
  
  return Math.round(
    minOutput + (proximityPercent / 100) * (maxOutput - minOutput)
  );
}

// ============================================================================
// Main Hook
// ============================================================================
export default function useBLE() {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [discoveryInProgress, setDiscoveryInProgress] = useState(false);
  const [rssi, setRssi] = useState(null);
  const [proximityPercent, setProximityPercent] = useState(0);
  const [location, setLocation] = useState(null);
  const [locationMode, setLocationMode] = useState('notify'); // 'notify' | 'polling'
  
  const deviceRef = useRef(null);
  const ledCharacteristicRef = useRef(null);
  const buzzerCharacteristicRef = useRef(null);
  const rssiCharacteristicRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const locationCharacteristicRef = useRef(null);
  const locationWatchdogRef = useRef(null);
  const locationPollingRef = useRef(null);

  const resetLocationWatchdog = useCallback(() => {
  if (locationWatchdogRef.current) {
    clearTimeout(locationWatchdogRef.current);
  }
  
  // If no notification arrives within 8s, assume notify failed -> fallback to polling
  locationWatchdogRef.current = setTimeout(() => {
    console.warn('Location notify watchdog triggered — falling back to polling');
    setLocationMode('polling');
    startLocationPolling();
  }, 8000);
}, []);

const startLocationPolling = useCallback(() => {
  if (locationPollingRef.current) return; // already polling

  const poll = async () => {
    if (!locationCharacteristicRef.current) return;
    try {
      const value = await locationCharacteristicRef.current.readValue();
      const parsed = parseLocationValue(value);
      if (parsed) setLocation(parsed);
    } catch (error) {
      console.error('Location polling error:', error);
    }
  };

  poll(); // immediate first read
  locationPollingRef.current = setInterval(poll, 5000);
}, []);

const stopLocationPolling = useCallback(() => {
  if (locationPollingRef.current) {
    clearInterval(locationPollingRef.current);
    locationPollingRef.current = null;
  }
}, []);

  // ========================================================================
  // Connect to Device
  // ========================================================================
  const connect = useCallback(async (deviceId, deviceName) => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth API not available');
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        optionalServices: [SERVICE_UUID],
        filters: [{ name: deviceName }]
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      
      // Get LED characteristic
      const ledCharacteristic = await service.getCharacteristic(LED_WRITE_UUID);
      ledCharacteristicRef.current = ledCharacteristic;

      // Get Buzzer characteristic
      const buzzerCharacteristic = await service.getCharacteristic(BUZZER_WRITE_UUID);
      buzzerCharacteristicRef.current = buzzerCharacteristic;

      // Get RSSI characteristic
      const rssiCharacteristic = await service.getCharacteristic(RSSI_READ_UUID);
      rssiCharacteristicRef.current = rssiCharacteristic;

      // Get Location characteristic
      const locationCharacteristic = await service.getCharacteristic(LOCATION_READ_UUID);
      locationCharacteristicRef.current = locationCharacteristic;

      // Try notify first
      try {
        await locationCharacteristic.startNotifications();
        locationCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
          const parsed = parseLocationValue(event.target.value);
          if (parsed) {
            setLocation(parsed);
            resetLocationWatchdog(); // reset timer on every successful notification
          }
        });
        setLocationMode('notify');
        resetLocationWatchdog();
        console.log('Location: using notify mode');
      } catch (error) {
        console.warn('Notify failed, falling back to polling:', error);
        setLocationMode('polling');
        startLocationPolling();
      }

      deviceRef.current = device;

      setConnectedDevice({
        id: device.id,
        name: device.name || 'Unknown Device',
        device
      });

      // Start continuous RSSI polling (every 1 second)
      startContinuousPolling();

      console.log('Connected to:', device.name);
      console.log('RSSI characteristic UUID:', RSSI_READ_UUID);
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect: ' + error.message);
    }
  }, []);

  // ========================================================================
  // Disconnect from Device
  // ========================================================================
  const disconnect = useCallback(async () => {
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (deviceRef.current) {
      try {
        deviceRef.current.gatt.disconnect();
        console.log('Disconnected');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
      deviceRef.current = null;
      ledCharacteristicRef.current = null;
      buzzerCharacteristicRef.current = null;
      rssiCharacteristicRef.current = null;

      // Add inside disconnect(), before setConnectedDevice(null):
      if (locationWatchdogRef.current) {
        clearTimeout(locationWatchdogRef.current);
        locationWatchdogRef.current = null;
      }
      stopLocationPolling();
      locationCharacteristicRef.current = null;
      setLocation(null);

      setConnectedDevice(null);
      setRssi(null);
      setProximityPercent(0);
    }
  }, []);

  // ========================================================================
  // Start Device Discovery
  // ========================================================================
  const startDiscovery = useCallback(async () => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth API not available');
      return;
    }

    setDiscoveryInProgress(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        optionalServices: [SERVICE_UUID],
        filters: [{ services: [SERVICE_UUID] }]
      });

      if (device) {
        await connect(device.id, device.name);
      }
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        console.error('Discovery error:', error);
      }
    } finally {
      setDiscoveryInProgress(false);
    }
  }, [connect]);

  // ========================================================================
  // Continuous RSSI Polling (Every 1 second)
  // ========================================================================
  const startContinuousPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const pollRssi = async () => {
      if (!rssiCharacteristicRef.current) return;

      try {
        const value = await rssiCharacteristicRef.current.readValue();
        
        // Read as 2-byte signed integer (little-endian)
        const view = new DataView(value.buffer);
        const newRssi = view.getInt16(0, true);
        
        setRssi(newRssi);
        const proximity = rssiToProximity(newRssi);
        setProximityPercent(proximity);
        
        console.log('RSSI auto-polled:', newRssi, '| Proximity:', proximity + '%');
      } catch (error) {
        console.error('Auto-poll RSSI error:', error);
      }
    };

    // Poll immediately, then every 1 second
    pollRssi();
    pollingIntervalRef.current = setInterval(pollRssi, 1000);
  }, []);

  // ========================================================================
  // Send LED Brightness
  // ========================================================================
  const sendLedBrightness = useCallback(async (brightness) => {
    if (!ledCharacteristicRef.current) {
      console.error('LED characteristic not connected');
      return;
    }

    try {
      const value = Math.min(Math.max(brightness, 0), 255);
      const data = new Uint8Array([value]);
      
      await ledCharacteristicRef.current.writeValue(data);
      console.log('LED brightness sent:', value);
    } catch (error) {
      console.error('Send LED error:', error);
    }
  }, []);

  // ========================================================================
  // Send Buzzer Volume
  // ========================================================================
  const sendBuzzerVolume = useCallback(async (volume) => {
    if (!buzzerCharacteristicRef.current) {
      console.error('Buzzer characteristic not connected');
      return;
    }

    try {
      const value = Math.min(Math.max(volume, 0), 255);
      const data = new Uint8Array([value]);
      
      await buzzerCharacteristicRef.current.writeValue(data);
      console.log('Buzzer volume sent:', value);
    } catch (error) {
      console.error('Send buzzer error:', error);
    }
  }, []);

  // ========================================================================
  // Get Output Value from Proximity
  // Returns 0-255 based on how close the device is
  // ========================================================================
  const getProximityOutputValue = useCallback(() => {
    return proximityToOutputValue(proximityPercent);
  }, [proximityPercent]);

  return {
    connectedDevice,
    connect,
    disconnect,
    discoveryInProgress,
    startDiscovery,
    sendLedBrightness,
    sendBuzzerVolume,
    rssi,
    proximityPercent,
    getProximityOutputValue,
    location,
    locationMode
  };
}
