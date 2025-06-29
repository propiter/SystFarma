export interface User {
  id: number;
  nombre: string;
  correo: string;
  rol: 'admin' | 'cajero' | 'bodega';
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}