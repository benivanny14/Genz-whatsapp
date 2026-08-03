import { api } from './api';
import adminApi, { adminTokenStore } from './adminApi';

// ---------------------------------------------------------------------
// USER-FACING
// ---------------------------------------------------------------------
export const getPaymentInfo = () => api.get('/payment/manual/info').then((r) => r.data);

export const getSubscriptionStatus = () => api.get('/payment/manual/subscription').then((r) => r.data);

export const previewSms = (sms) => api.post('/payment/manual/preview', { sms }).then((r) => r.data);

export const submitPayment = (payload) => api.post('/payment/manual/submit', payload).then((r) => r.data);

export const getMyPayments = () => api.get('/payment/manual/mine').then((r) => r.data);

export const getMyPaymentById = (id) => api.get(`/payment/manual/mine/${id}`).then((r) => r.data);

export const sendUserReply = (id, message) =>
  api.post(`/payment/manual/mine/${id}/reply`, { message }).then((r) => r.data);

// ---------------------------------------------------------------------
// ADMIN (uses adminApi to include the admin-only access token)
// ---------------------------------------------------------------------
export const listPayments = (params) =>
  adminApi.get('/admin/manual-payments', { params }).then((r) => r.data);

export const getStatistics = () => adminApi.get('/admin/manual-payments/stats').then((r) => r.data);

export const getPaymentDetails = (id) => adminApi.get(`/admin/manual-payments/${id}`).then((r) => r.data);

export const getUserProfile = (userId) =>
  adminApi.get(`/admin/manual-payments/user/${userId}`).then((r) => r.data);

export const approvePayment = (id) => adminApi.post(`/admin/manual-payments/${id}/approve`).then((r) => r.data);

export const rejectPayment = (id, reason) =>
  adminApi.post(`/admin/manual-payments/${id}/reject`, { reason }).then((r) => r.data);

export const adminSendMessage = (id, message) =>
  adminApi.post(`/admin/manual-payments/${id}/message`, { message }).then((r) => r.data);

// Reuse existing admin user-management endpoints (no duplicated logic).
export const suspendUser = (userId) => adminApi.post(`/admin/users/${userId}/block`).then((r) => r.data);
export const reactivateUser = (userId) => adminApi.post(`/admin/users/${userId}/unblock`).then((r) => r.data);
