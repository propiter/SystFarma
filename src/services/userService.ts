import { apiClient } from './apiClient';

export interface User {
  usuario_id: number;
  nombre: string;
  correo: string;
  rol: 'admin' | 'cajero' | 'bodega';
  estado: boolean;
  fecha_creacion: string;
  ultimo_acceso?: string;
  total_ventas?: number;
  monto_total_ventas?: number;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  rol?: string;
  estado?: string;
}

export interface UsersResponse {
  usuarios: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CreateUserData {
  nombre: string;
  correo: string;
  rol: 'admin' | 'cajero' | 'bodega';
  contraseña?: string;
}

export interface UpdateUserData extends CreateUserData {
  estado?: boolean;
}

export interface ChangePasswordData {
  contraseña_actual: string;
  contraseña_nueva: string;
  confirmar_contraseña: string;
}

export interface UserStats {
  estadisticasGenerales: {
    total_usuarios: number;
    usuarios_activos: number;
    total_admins: number;
    total_cajeros: number;
    total_bodega: number;
    activos_semana: number;
    activos_mes: number;
  };
  ventasPorUsuario: {
    nombre: string;
    rol: string;
    total_ventas: number;
    monto_total: number;
  }[];
}

export const userService = {
  async getUsers(filters: UserFilters = {}): Promise<UsersResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/users?${params.toString()}`);
    return response.data;
  },

  async getUser(id: number): Promise<{ usuario: User; estadisticas: any }> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  async createUser(data: CreateUserData): Promise<{ message: string; usuario: User; contraseña_temporal?: string }> {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  async updateUser(id: number, data: UpdateUserData): Promise<{ message: string; usuario: User }> {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  async toggleUserStatus(id: number): Promise<{ message: string; usuario: User }> {
    const response = await apiClient.put(`/users/${id}/toggle-status`);
    return response.data;
  },

  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await apiClient.put('/users/change-password', data);
    return response.data;
  },

  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get('/users/estadisticas/generales');
    return response.data;
  }
};