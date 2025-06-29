import { apiClient } from './apiClient';
import { LoginResponse, User } from '../types/auth';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', {
      correo: email,
      contraseña: password
    });
    return response.data;
  },

  async register(userData: {
    nombre: string;
    correo: string;
    contraseña: string;
    rol: 'admin' | 'cajero' | 'bodega';
  }): Promise<{ message: string; user: User }> {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get('/auth/profile');
    return response.data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }
};