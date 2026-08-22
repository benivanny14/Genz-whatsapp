/**
 * vCard Utility for Contact Sharing
 * Generates and parses vCard 3.0 format (.vcf files)
 * Compatible with WhatsApp and other contact apps
 */

/**
 * Generate vCard string from contact data
 * @param {Object} contact - Contact object
 * @param {string} contact.name - Contact name
 * @param {string} contact.phone - Phone number
 * @param {string} contact.email - Email address (optional)
 * @param {string} contact.avatar - Profile picture URL (optional)
 * @param {string} contact.organization - Organization (optional)
 * @param {string} contact.title - Job title (optional)
 * @returns {string} vCard string
 */
export function generateVCard(contact) {
  const {
    name = '',
    phone = '',
    email = '',
    avatar = '',
    organization = '',
    title = ''
  } = contact;

  // Format phone number (remove non-numeric characters except +)
  const formattedPhone = phone.replace(/[^\d+]/g, '');

  let vcard = 'BEGIN:VCARD\n';
  vcard += 'VERSION:3.0\n';
  vcard += `FN:${name}\n`;
  
  if (formattedPhone) {
    vcard += `TEL;TYPE=CELL:${formattedPhone}\n`;
  }
  
  if (email) {
    vcard += `EMAIL;TYPE=INTERNET:${email}\n`;
  }
  
  if (organization) {
    vcard += `ORG:${organization}\n`;
  }
  
  if (title) {
    vcard += `TITLE:${title}\n`;
  }
  
  if (avatar) {
    vcard += `PHOTO;TYPE=JPEG;VALUE=URI:${avatar}\n`;
  }
  
  vcard += `REV:${new Date().toISOString()}\n`;
  vcard += 'END:VCARD\n';
  
  return vcard;
}

/**
 * Parse vCard string to contact object
 * @param {string} vcardString - vCard string
 * @returns {Object} Contact object
 */
export function parseVCard(vcardString) {
  const lines = vcardString.split('\n');
  const contact = {
    name: '',
    phone: '',
    email: '',
    avatar: '',
    organization: '',
    title: ''
  };
  
  for (const line of lines) {
    if (line.startsWith('FN:')) {
      contact.name = line.substring(3);
    } else if (line.startsWith('TEL;TYPE=CELL:')) {
      contact.phone = line.substring(14);
    } else if (line.startsWith('EMAIL;TYPE=INTERNET:')) {
      contact.email = line.substring(21);
    } else if (line.startsWith('ORG:')) {
      contact.organization = line.substring(4);
    } else if (line.startsWith('TITLE:')) {
      contact.title = line.substring(6);
    } else if (line.startsWith('PHOTO;TYPE=JPEG;VALUE=URI:')) {
      contact.avatar = line.substring(28);
    }
  }
  
  return contact;
}

/**
 * Download vCard as .vcf file
 * @param {Object} contact - Contact object
 */
export function downloadVCard(contact) {
  const vcard = generateVCard(contact);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${contact.name.replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read vCard file
 * @param {File} file - vCard file
 * @returns {Promise<Object>} Contact object
 */
export function readVCardFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const contact = parseVCard(e.target.result);
        resolve(contact);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Encode contact data for message transmission
 * @param {Object} contact - Contact object
 * @returns {Object} Encoded contact data
 */
export function encodeContactForMessage(contact) {
  return {
    name: contact.name,
    phone: contact.phone,
    email: contact.email || '',
    avatar: contact.avatar || '',
    organization: contact.organization || '',
    title: contact.title || '',
    vcard: generateVCard(contact)
  };
}

/**
 * Decode contact data from message
 * @param {Object} data - Encoded contact data
 * @returns {Object} Contact object
 */
export function decodeContactFromMessage(data) {
  return {
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    avatar: data.avatar || '',
    organization: data.organization || '',
    title: data.title || '',
    vcard: data.vcard || ''
  };
}
