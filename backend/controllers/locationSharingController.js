const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');

const defaultSettings = {
  locationSharingEnabled: true,
  liveLocationEnabled: true,
  locationHistory: false,
  autoShareLocation: false,
  locationAccuracy: 'high', // low, medium, high
  locationUpdateInterval: 60, // seconds
  maxLiveLocationDuration: 8, // hours
  notifyOnLocationShare: true,
  allowLocationRequests: true,
  shareWithContacts: true,
  shareWithGroups: true,
  hideLocationFrom: []
};


const mergeSettings = createSettingsMerger(defaultSettings);

const parseCoordinate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// @desc    Get location sharing settings
// @route   GET /api/location-sharing/settings
// @access  Private
const { getSettings: getLocationSharingSettings, updateSettings: updateLocationSharingSettings, resetSettings: resetLocationSharingSettings } = createSettingsHandlers({
  field: 'locationSharingSettings',
  label: 'location sharing',
  mergeSettings,
});

exports.getLocationSharingSettings = getLocationSharingSettings;

// @desc    Update location sharing settings
// @route   POST /api/location-sharing/settings
// @access  Private
exports.updateLocationSharingSettings = updateLocationSharingSettings;

// @desc    Share current location
// @route   POST /api/location-sharing/share
// @access  Private
exports.shareLocation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, latitude, longitude, address, accuracy } = req.body;
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (!conversationId || parsedLatitude === null || parsedLongitude === null) {
      return res.status(400).json({ success: false, message: 'Conversation ID, latitude, and longitude are required' });
    }

    const settings = mergeSettings(user.locationSharingSettings?.toObject?.() || user.locationSharingSettings);
    // L-02: Privacy exclusions for location sharing
    const privacyExcluded = user.privacyModsSettings?.excludedContacts || [];
    
    if (!settings.locationSharingEnabled) {
      return res.status(403).json({ success: false, message: 'Location sharing is disabled' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // participants is an ObjectId[] — compare with String() on both sides
    const isParticipant = conversation.participants.some((p) => String(p) === String(user._id));
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    // L-02: Check if any participant is excluded from location sharing
    if (privacyExcluded.length > 0) {
      const excludedParticipant = conversation.participants.find(p =>
        privacyExcluded.some(ex => String(ex) === String(p) && String(p) !== String(user._id))
      );
      if (excludedParticipant) {
        return res.status(403).json({ success: false, message: 'Cannot share location with excluded contacts' });
      }
    }

    const locationData = {
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      address: address || '',
      accuracy: accuracy || settings.locationAccuracy,
      timestamp: new Date()
    };

    const message = await Message.create({
      conversationId,
      sender: user._id,
      content: `📍 Location shared`,
      messageType: 'location',
      latitude: parsedLatitude,
      longitude: parsedLongitude
    });

    res.status(200).json({
      success: true,
      message: 'Location shared successfully',
      locationData,
      messageId: message._id
    });
  } catch (error) {
    console.error('Share location error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start live location sharing
// @route   POST /api/location-sharing/live/start
// @access  Private
exports.startLiveLocation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, duration } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const settings = mergeSettings(user.locationSharingSettings?.toObject?.() || user.locationSharingSettings);
    
    if (!settings.liveLocationEnabled) {
      return res.status(403).json({ success: false, message: 'Live location sharing is disabled' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // participants is an ObjectId[] — compare with String() on both sides
    const isParticipant = conversation.participants.some((p) => String(p) === String(user._id));
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    const liveDuration = duration || settings.maxLiveLocationDuration;
    const expiresAt = new Date(Date.now() + liveDuration * 60 * 60 * 1000);

    const liveLocation = {
      _id: new (require('mongoose').Types.ObjectId)(),
      conversationId,
      userId: user._id,
      startedAt: new Date(),
      expiresAt,
      updateInterval: settings.locationUpdateInterval,
      status: 'active'
    };

    if (!user.liveLocations) user.liveLocations = [];
    user.liveLocations.push(liveLocation);
    user.markModified('liveLocations');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Live location sharing started',
      liveLocationId: liveLocation._id,
      expiresAt,
      duration: liveDuration
    });
  } catch (error) {
    console.error('Start live location error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update live location
// @route   POST /api/location-sharing/live/update
// @access  Private
exports.updateLiveLocation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { liveLocationId, latitude, longitude } = req.body;
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (!liveLocationId || parsedLatitude === null || parsedLongitude === null) {
      return res.status(400).json({ success: false, message: 'Live location ID, latitude, and longitude are required' });
    }

    const liveLocation = user.liveLocations?.find(l => l._id.toString() === liveLocationId);
    if (!liveLocation) {
      return res.status(404).json({ success: false, message: 'Live location session not found' });
    }

    if (liveLocation.expiresAt && new Date() > liveLocation.expiresAt) {
      liveLocation.status = 'expired';
      user.markModified('liveLocations');
      await user.save();
      return res.status(400).json({ success: false, message: 'Live location session has expired' });
    }

    // Update location (in real implementation, this would notify participants)
    liveLocation.lastUpdate = new Date();
    liveLocation.currentLocation = { latitude: parsedLatitude, longitude: parsedLongitude };
    user.markModified('liveLocations');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Live location updated',
      location: { latitude: parsedLatitude, longitude: parsedLongitude },
      updatedAt: liveLocation.lastUpdate
    });
  } catch (error) {
    console.error('Update live location error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Stop live location sharing
// @route   POST /api/location-sharing/live/stop
// @access  Private
exports.stopLiveLocation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const liveLocationId = req.params.shareId || req.body.liveLocationId;

    if (!liveLocationId) {
      return res.status(400).json({ success: false, message: 'Live location ID is required' });
    }

    const liveLocationIndex = user.liveLocations?.findIndex(l => l._id.toString() === liveLocationId);
    if (liveLocationIndex === -1) {
      return res.status(404).json({ success: false, message: 'Live location session not found' });
    }

    user.liveLocations[liveLocationIndex].status = 'stopped';
    user.liveLocations[liveLocationIndex].stoppedAt = new Date();
    user.markModified('liveLocations');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Live location sharing stopped',
      stoppedAt: user.liveLocations[liveLocationIndex].stoppedAt
    });
  } catch (error) {
    console.error('Stop live location error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active live locations
// @route   GET /api/location-sharing/live/active
// @access  Private
exports.getActiveLiveLocations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const now = new Date();
    const activeLocations = (user.liveLocations || []).filter(
      l => l.status === 'active' && (!l.expiresAt || l.expiresAt > now)
    );

    const enriched = [];
    for (const loc of activeLocations) {
      let contactName = 'Unknown';
      try {
        const conversation = await Conversation.findById(loc.conversationId);
        if (conversation) {
          if (conversation.isGroup) {
            contactName = conversation.name || 'Group chat';
          } else {
            const otherId = conversation.participants.find(
              p => p.toString() !== user._id.toString()
            );
            if (otherId) {
              const other = await User.findById(otherId).select('username');
              contactName = other?.username || 'Contact';
            }
          }
        }
      } catch (err) {
        console.error('Enrich live location contact error:', err.message);
      }

      let duration = 'Live';
      if (loc.expiresAt) {
        const remaining = Math.max(0, new Date(loc.expiresAt) - now);
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        if (hours > 0) duration = `Ends in ${hours}h ${minutes}m`;
        else duration = `Ends in ${minutes}m`;
      }

      enriched.push({
        ...loc.toObject ? loc.toObject() : loc,
        contactName,
        duration
      });
    }

    res.status(200).json({ success: true, activeLocations: enriched });
  } catch (error) {
    console.error('Get active live locations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get nearby friends
// @route   GET /api/location-sharing/nearby
// @access  Private
exports.getNearbyFriends = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { latitude, longitude, radius } = req.query;
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (parsedLatitude === null || parsedLongitude === null) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const parsedRadius = Number(radius);
    const searchRadius = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 5; // km

    // Get user's conversations to find friends
    const conversations = await Conversation.find({
      participants: user._id,
      isGroup: false
    });

    const friendIds = conversations.flatMap(c => 
      c.participants.filter(p => p.toString() !== user._id.toString())
    );

    // Find friends who have shared their location recently
    const friendsWithLocation = await User.find({
      _id: { $in: friendIds },
      'lastLocation.timestamp': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).select('username profilePicture lastLocation locationSharingSettings');

    // Calculate distance and filter by radius
    const nearbyFriends = friendsWithLocation
      .map(friend => {
        const friendSettings = mergeSettings(friend.locationSharingSettings?.toObject?.() || friend.locationSharingSettings);

        // Respect the friend's location-sharing privacy: if they turned sharing
        // off, or explicitly hid their location from this requester, skip them.
        if (!friendSettings.locationSharingEnabled) return null;
        const hiddenFrom = Array.isArray(friendSettings.hideLocationFrom)
          ? friendSettings.hideLocationFrom.map(id => id?.toString())
          : [];
        if (hiddenFrom.includes(user._id.toString())) return null;

        const friendLatitude = parseCoordinate(friend.lastLocation?.latitude);
        const friendLongitude = parseCoordinate(friend.lastLocation?.longitude);
        if (friendLatitude === null || friendLongitude === null) {
          return null;
        }

        const distance = calculateDistance(
          parsedLatitude,
          parsedLongitude,
          friendLatitude,
          friendLongitude
        );

        return {
          userId: friend._id,
          username: friend.username,
          profilePicture: friend.profilePicture,
          distance: distance.toFixed(2)
        };
      })
      .filter(friend => friend && friend.distance <= searchRadius)
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    res.status(200).json({ success: true, nearbyFriends, radius: searchRadius });
  } catch (error) {
    console.error('Get nearby friends error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// @desc    Update user's last location
// @route   POST /api/location-sharing/update-last
// @access  Private
exports.updateLastLocation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { latitude, longitude, accuracy } = req.body;
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (parsedLatitude === null || parsedLongitude === null) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    user.lastLocation = {
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      accuracy: accuracy || 'high',
      timestamp: new Date()
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Last location updated',
      location: user.lastLocation
    });
  } catch (error) {
    console.error('Update last location error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle location sharing
// @route   POST /api/location-sharing/toggle
// @access  Private
exports.toggleLocationSharing = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.locationSharingSettings?.toObject?.() || user.locationSharingSettings || {};
    
    user.locationSharingSettings = mergeSettings({
      ...existing,
      locationSharingEnabled: enabled !== undefined ? enabled : !existing.locationSharingEnabled
    });
    user.markModified('locationSharingSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.locationSharingSettings });
  } catch (error) {
    console.error('Toggle location sharing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset location sharing settings to default
// @route   POST /api/location-sharing/reset
// @access  Private
exports.resetLocationSharingSettings = resetLocationSharingSettings;

