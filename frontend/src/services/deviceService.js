import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const normalizeDevice = (device = {}) => ({
  ...device,
  id: device.id || device.deviceId || device._id,
  _id: device._id || device.deviceId || device.id,
  name: device.name || device.deviceName || 'Unknown Device',
  deviceName: device.deviceName || device.name || 'Unknown Device',
  type: device.type || device.deviceType || 'web',
  deviceType: device.deviceType || device.type || 'web',
  active: device.active ?? device.isActive ?? false,
  isActive: device.isActive ?? device.active ?? false,
  current: device.current ?? device.isCurrent ?? false,
  isCurrent: device.isCurrent ?? device.current ?? false
});

const normalizeDevicesPayload = (data = {}) => ({
  ...data,
  devices: (data.devices || []).map(normalizeDevice)
});

const deviceService = {
  // Get all linked devices
  getDevices: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/device`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return normalizeDevicesPayload(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },

  // Generate QR code for device pairing
  generateQR: async (deviceInfo = {}) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/device/generate-qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deviceInfo)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating QR:', error);
      throw error;
    }
  },

  // Pair device with code
  pairDevice: async (pairingToken, deviceInfo = {}) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/device/pair`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pairingToken, code: pairingToken, ...deviceInfo })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.device ? { ...data, device: normalizeDevice(data.device) } : data;
    } catch (error) {
      console.error('Error pairing device:', error);
      throw error;
    }
  },

  // Unlink/remove device
  unlinkDevice: async (deviceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/device/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unlinking device:', error);
      throw error;
    }
  },

  // Logout from all devices
  logoutAllDevices: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/device/logout-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error logging out all devices:', error);
      throw error;
    }
  },

  // Set device active status
  setDeviceActive: async (deviceId, active) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/device/${deviceId}/active`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: active })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error setting device active status:', error);
      throw error;
    }
  }
};

export default deviceService;
