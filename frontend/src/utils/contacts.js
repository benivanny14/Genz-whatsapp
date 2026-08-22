/**
 * Phone Contacts Integration
 * Uses Capacitor Contacts plugin for native contact access
 */

import { Contacts } from '@capacitor/contacts';
import { Capacitor } from '@capacitor/core';

/**
 * Check if contacts plugin is available
 * @returns {boolean}
 */
export function isContactsAvailable() {
  return Capacitor.isNativePlatform() && Contacts !== undefined;
}

/**
 * Request contacts permission
 * @returns {Promise<boolean>}
 */
export async function requestContactsPermission() {
  if (!isContactsAvailable()) {
    console.warn('[Contacts] Contacts plugin not available');
    return false;
  }

  try {
    const permission = await Contacts.requestPermissions();
    return permission.contacts === 'granted';
  } catch (error) {
    console.error('[Contacts] Permission request failed:', error);
    return false;
  }
}

/**
 * Get all contacts from phone
 * @returns {Promise<Array>} Array of contacts
 */
export async function getPhoneContacts() {
  if (!isContactsAvailable()) {
    console.warn('[Contacts] Contacts plugin not available');
    return [];
  }

  try {
    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
        image: true,
        organizations: true,
        urls: true,
        notes: true
      }
    });

    const contacts = result.contacts.map(contact => ({
      id: contact.contactId,
      name: contact.name?.display || contact.name?.given || 'Unknown',
      phone: contact.phones?.[0]?.number || '',
      email: contact.emails?.[0]?.address || '',
      avatar: contact.image,
      organization: contact.organizations?.[0]?.company || '',
      title: contact.organizations?.[0]?.title || '',
      urls: contact.urls || [],
      notes: contact.notes || ''
    }));

    return contacts.filter(c => c.name && c.name !== 'Unknown');
  } catch (error) {
    console.error('[Contacts] Failed to get contacts:', error);
    return [];
  }
}

/**
 * Search contacts by name or phone
 * @param {string} query - Search query
 * @returns {Promise<Array>} Filtered contacts
 */
export async function searchContacts(query) {
  const contacts = await getPhoneContacts();
  const lowerQuery = query.toLowerCase();
  
  return contacts.filter(contact => 
    contact.name.toLowerCase().includes(lowerQuery) ||
    contact.phone.includes(query)
  );
}

/**
 * Save contact to phone
 * @param {Object} contact - Contact object
 * @returns {Promise<boolean>}
 */
export async function saveContactToPhone(contact) {
  if (!isContactsAvailable()) {
    console.warn('[Contacts] Contacts plugin not available');
    return false;
  }

  try {
    await Contacts.saveContact({
      contact: {
        name: {
          display: contact.name,
          given: contact.name.split(' ')[0],
          family: contact.name.split(' ').slice(1).join(' ')
        },
        phones: contact.phone ? [{
          number: contact.phone,
          label: 'mobile'
        }] : [],
        emails: contact.email ? [{
          address: contact.email,
          label: 'home'
        }] : [],
        image: contact.avatar ? contact.avatar : undefined,
        organizations: contact.organization ? [{
          company: contact.organization,
          title: contact.title || ''
        }] : []
      }
    });
    return true;
  } catch (error) {
    console.error('[Contacts] Failed to save contact:', error);
    return false;
  }
}

/**
 * Pick a single contact from phone
 * @returns {Promise<Object|null>} Selected contact
 */
export async function pickContact() {
  if (!isContactsAvailable()) {
    console.warn('[Contacts] Contacts plugin not available');
    return null;
  }

  try {
    const result = await Contacts.pickContact();
    if (!result || !result.contact) {
      return null;
    }

    const contact = result.contact;
    return {
      id: contact.contactId,
      name: contact.name?.display || contact.name?.given || 'Unknown',
      phone: contact.phones?.[0]?.number || '',
      email: contact.emails?.[0]?.address || '',
      avatar: contact.image,
      organization: contact.organizations?.[0]?.company || '',
      title: contact.organizations?.[0]?.title || ''
    };
  } catch (error) {
    console.error('[Contacts] Failed to pick contact:', error);
    return null;
  }
}
