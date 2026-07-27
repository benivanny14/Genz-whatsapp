import { api } from './api';

// ---------------------------------------------------------------------
// USER-FACING
// ---------------------------------------------------------------------
export const getPaymentInfo = () => api.get('/payment/manual/info').then((r) => r.data);

export const previewSms = (sms) => api.post('/payment/manual/preview', { sms }).then((r) => r.data);

export const submitPayment = (payload) => api.post('/payment/manual/submit', payload).then((r) => r.data);

export const getMyPayments = () => api.get('/payment/manual/mine').then((r) => r.data);

export const getMyPaymentById = (id) => api.get(`/payment/manual/mine/${id}`).then((r) => r.data);

export const sendUserReply = (id, message) =>
  api.post(`/payment/manual/mine/${id}/reply`, { message }).then((r) => r.data);

// ---------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------
export const listPayments = (params) =>
  api.get('/admin/manual-payments', { params }).then((r) => r.data);

export const getStatistics = () => api.get('/admin/manual-payments/stats').then((r) => r.data);

export const getPaymentDetails = (id) => api.get(`/admin/manual-payments/${id}`).then((r) => r.data);

export const getUserProfile = (userId) =>
  api.get(`/admin/manual-payments/user/${userId}`).then((r) => r.data);

export const approvePayment = (id) => api.post(`/admin/manual-payments/${id}/approve`).then((r) => r.data);

export const rejectPayment = (id, reason) =>
  api.post(`/admin/manual-payments/${id}/reject`, { reason }).then((r) => r.data);

export const adminSendMessage = (id, message) =>
  api.post(`/admin/manual-payments/${id}/message`, { message }).then((r) => r.data);

// Reuse existing admin user-management endpoints (no duplicated logic).
export const suspendUser = (userId) => api.post(`/admin/users/${userId}/block`).then((r) => r.data);
export const reactivateUser = (userId) => api.post(`/admin/users/${userId}/unblock`).then((r) => r.data);
