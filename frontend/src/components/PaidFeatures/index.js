// Paid Features Index
// This file exports all paid features including Genz After Work and other monetization features

export { default as GenzAfterWork } from './GenzAfterWork';
export { default as SubscriptionPayment } from './SubscriptionPayment';
export { default as PaymentRequestModal, PaymentRequestsPanel } from './PaymentRequestModal';
// Feature Categories
export const PAID_FEATURE_CATEGORIES = {
  GENZ_AFTER_WORK: 'Genz After Work',
  SUBSCRIPTION: 'Subscription',
  PAYMENT_REQUESTS: 'Payment Requests',
  THEME_STORE: 'Theme Store'
};

// Feature Descriptions
export const PAID_FEATURE_DESCRIPTIONS = {
  GENZ_AFTER_WORK: 'Discover Amazing Features for Real Estate, Services & Businesses',
  SUBSCRIPTION: 'Premium subscription with exclusive features',
  PAYMENT_REQUESTS: 'Send and receive payment requests',
  THEME_STORE: 'Premium themes and customizations'
};
