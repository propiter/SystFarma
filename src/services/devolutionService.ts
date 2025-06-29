import { apiClient } from './apiClient';

export interface Devolution {
  devolucion_id: number;
  venta_id: number;
  usuario_id: number;
  fecha: string;
  tipo: 'parcial' | 'total';
  motivo: string;
  observaciones?: string;
  monto_total: number;
  metodo_reembolso: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  estado: 'pendiente' | 'completada' | 'rechazada';
  creado_en: string;
  usuario_nombre: string;
  venta_numero: string;
}

export interface DevolutionDetail {
  detalle_devolucion_id: number;
  devolucion_id: number;
  detalle_venta_id: number;
  cantidad_devuelta: number;
  precio_unitario: number;
  motivo?: string;
  lote_id: number;
  monto_linea: number;
  producto_nombre: string;
  presentacion: string;
  lote_codigo: string;
}

export interface CreateDevolutionData {
  venta_id: number;
  tipo: 'parcial' | 'total';
  motivo: string;
  observaciones?: string;
  items: {
    detalle_venta_id: number;
    cantidad_devuelta: number;
    motivo?: string;
  }[];
  metodo_reembolso: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
}

export interface DevolutionFilters {
  page?: number;
  limit?: number;
  search?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  tipo?: string;
  usuario_id?: string;
}

export interface DevolutionsResponse {
  devoluciones: Devolution[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export const devolutionService = {
  async getDevolutions(filters: DevolutionFilters = {}): Promise<DevolutionsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/sales/devoluciones?${params.toString()}`);
    return response.data;
  },

  async getDevolution(id: number): Promise<{ devolucion: Devolution; detalles: DevolutionDetail[] }> {
    const response = await apiClient.get(`/sales/devoluciones/${id}`);
    return response.data;
  },

  async createDevolution(data: CreateDevolutionData): Promise<{ message: string; devolucion: Devolution }> {
    const response = await apiClient.post('/sales/devoluciones', data);
    return response.data;
  },

  async updateDevolutionStatus(id: number, estado: 'completada' | 'rechazada'): Promise<{ message: string }> {
    const response = await apiClient.put(`/sales/devoluciones/${id}/status`, { estado });
    return response.data;
  }
};