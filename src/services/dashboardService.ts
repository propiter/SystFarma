import { apiClient } from './apiClient';

export const dashboardService = {
  async getMetrics() {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data;
  },

  async getAlerts() {
    const response = await apiClient.get('/dashboard/alerts');
    return response.data;
  }
};