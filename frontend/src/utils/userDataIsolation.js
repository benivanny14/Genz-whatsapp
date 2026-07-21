/**
 * User Data Isolation Utilities
 * Ensures each user only accesses their own data
 */

import { auth } from '../services/auth';

/**
 * Verify that the current user has access to the requested resource
 * @param {string} resourceUserId - The user ID associated with the resource
 * @returns {boolean} - True if the current user has access
 */
export const verifyUserAccess = (resourceUserId) => {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) return false;
  
  const currentUserId = String(currentUser._id || currentUser.id);
  const requestedUserId = String(resourceUserId);
  
  return currentUserId === requestedUserId;
};

/**
 * Filter data to only include items belonging to the current user
 * @param {Array} items - Array of items with userId property
 * @returns {Array} - Filtered array containing only user's items
 */
export const filterUserItems = (items) => {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) return [];
  
  const currentUserId = String(currentUser._id || currentUser.id);
  return items.filter(item => {
    const itemUserId = String(item.userId || item.ownerId || item.user?._id || item.user?.id);
    return itemUserId === currentUserId;
  });
};

/**
 * Add user isolation filter to a database query
 * @param {Object} query - The query object
 * @param {string} userIdField - The field name for user ID in the query
 * @returns {Object} - Query with user isolation filter added
 */
export const addUserIsolationFilter = (query, userIdField = 'userId') => {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) {
    throw new Error('No authenticated user');
  }
  
  return {
    ...query,
    [userIdField]: currentUser._id || currentUser.id
  };
};

/**
 * Validate that a conversation belongs to the current user
 * @param {Object} conversation - The conversation object
 * @returns {boolean} - True if the conversation belongs to the current user
 */
export const validateConversationAccess = (conversation) => {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) return false;
  
  const currentUserId = String(currentUser._id || currentUser.id);
  
  // Check if user is a participant
  if (conversation.participants) {
    return conversation.participants.some(p => 
      String(p.userId || p.user?._id || p.user?.id || p) === currentUserId
    );
  }
  
  // Check direct user field
  const convUserId = String(conversation.userId || conversation.ownerId || conversation.user?._id || conversation.user?.id);
  return convUserId === currentUserId;
};

/**
 * Validate that a message belongs to the current user or a conversation they're in
 * @param {Object} message - The message object
 * @param {Object} conversation - The conversation object (optional)
 * @returns {boolean} - True if the user has access to the message
 */
export const validateMessageAccess = (message, conversation = null) => {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) return false;
  
  const currentUserId = String(currentUser._id || currentUser.id);
  
  // Check if user sent the message
  const senderId = String(message.senderId || message.sender?._id || message.sender?.id);
  if (senderId === currentUserId) return true;
  
  // Check if user is in the conversation
  if (conversation) {
    return validateConversationAccess(conversation);
  }
  
  // Check conversation participants from message
  if (message.conversation?.participants) {
    return message.conversation.participants.some(p => 
      String(p.userId || p.user?._id || p.user?.id || p) === currentUserId
    );
  }
  
  return false;
};

/**
 * Sanitize user data before sending to client
 * Removes sensitive information that shouldn't be exposed
 * @param {Object} userData - The user data object
 * @returns {Object} - Sanitized user data
 */
export const sanitizeUserData = (userData) => {
  if (!userData) return null;
  
  const { 
    password, 
    pin, 
    pinHash, 
    recoveryCodes, 
    twoFactorSecret,
    emailVerificationToken,
    passwordResetToken,
    ...sanitized 
  } = userData;
  
  return sanitized;
};

/**
 * Check if two users are the same
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {boolean} - True if they are the same user
 */
export const areSameUser = (userId1, userId2) => {
  return String(userId1) === String(userId2);
};

/**
 * Get current user ID safely
 * @returns {string|null} - Current user ID or null if not authenticated
 */
export const getCurrentUserId = () => {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) return null;
  return String(currentUser._id || currentUser.id);
};

/**
 * Create a secure query that only returns user's own data
 * @param {string} collection - The collection name
 * @param {Object} additionalFilters - Additional filters to apply
 * @returns {Object} - Secure query object
 */
export const createSecureQuery = (collection, additionalFilters = {}) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    throw new Error('Authentication required');
  }
  
  return {
    collection,
    filters: {
      $or: [
        { userId: currentUserId },
        { ownerId: currentUserId },
        { 'participants.userId': currentUserId },
        { 'user._id': currentUserId },
        { 'user.id': currentUserId }
      ],
      ...additionalFilters
    }
  };
};

export default {
  verifyUserAccess,
  filterUserItems,
  addUserIsolationFilter,
  validateConversationAccess,
  validateMessageAccess,
  sanitizeUserData,
  areSameUser,
  getCurrentUserId,
  createSecureQuery
};