const { buildPreview } = require('../utils/conversationPush');

describe('status and message notification helpers', () => {
  test('hides message preview when privacy forbids it', () => {
    expect(buildPreview({ showPreview: false, messageType: 'text', text: 'secret' })).toBe('New message');
  });

  test('maps media types to preview labels', () => {
    expect(buildPreview({ showPreview: true, messageType: 'image', text: 'x' })).toBe('Photo');
    expect(buildPreview({ showPreview: true, messageType: 'video', text: 'x' })).toBe('Video');
    expect(buildPreview({ showPreview: true, messageType: 'voice', text: 'x' })).toBe('Voice note');
  });

  test('truncates long text previews', () => {
    const text = 'a'.repeat(200);
    expect(buildPreview({ showPreview: true, messageType: 'text', text }).length).toBe(120);
  });

  test('maps contact and location previews', () => {
    expect(buildPreview({ showPreview: true, messageType: 'location', text: 'x' })).toBe('Location');
    expect(buildPreview({ showPreview: true, messageType: 'contact', text: 'x' })).toBe('Contact');
  });
});

describe('status model expiry default', () => {
  test('Status schema exposes 24h expiry default factory', () => {
    const Status = require('../models/Status');
    const expiryPath = Status.schema.path('expiresAt');
    expect(typeof expiryPath.defaultValue).toBe('function');
    const value = expiryPath.defaultValue();
    const delta = value.getTime() - Date.now();
    expect(delta).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(delta).toBeLessThan(25 * 60 * 60 * 1000);
  });
});
