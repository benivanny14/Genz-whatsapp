// Paid Features Index
// This file exports all paid features including Genz After Work and other monetization features

export { default as GenzAfterWork } from './GenzAfterWork';
export { default as SubscriptionPayment } from './SubscriptionPayment';
export { default as PaymentRequestModal, PaymentRequestsPanel } from './PaymentRequestModal';
export { default as ThemeStore } from './ThemeStore';
export { default as StatusBoostPanel } from './StatusBoostPanel';
export { default as StatusMonetizationPanel } from './StatusMonetizationPanel';

// Feature Categories
export const PAID_FEATURE_CATEGORIES = {
  GENZ_AFTER_WORK: 'Genz After Work',
  SUBSCRIPTION: 'Subscription',
  PAYMENT_REQUESTS: 'Payment Requests',
  THEME_STORE: 'Theme Store',
  STATUS_BOOST: 'Status Boost',
  STATUS_MONETIZATION: 'Status Monetization'
};

// Feature Descriptions
export const PAID_FEATURE_DESCRIPTIONS = {
  GENZ_AFTER_WORK: 'Discover Amazing Features for Real Estate, Services & Businesses',
  SUBSCRIPTION: 'Premium subscription with exclusive features',
  PAYMENT_REQUESTS: 'Send and receive payment requests',
  THEME_STORE: 'Premium themes and customizations',
  STATUS_BOOST: 'Boost your status reach and visibility',
  STATUS_MONETIZATION: 'Monetize your status updates with ads and donations'
};
