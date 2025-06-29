import { apiClient } from './apiClient';

export interface InventoryAdjustment {
  ajuste_id: number;
  usuario_id: number;
  fecha: string;
  motivo: string;
  observaciones?: string;
  usuario_nombre: string;
  total_ajustes: number;
}

export interface AdjustmentDetail {
  detalle_ajuste_inventario_id: number;
  ajuste_id: number;
  lote_id: number;
  cantidad_antes: number;
  cantidad_despues: number;
  diferencia: number;
  producto_nombre: string;
  presentacion: string;
  lote_codigo: string;
}

export interface CreateAdjustmentData {
  motivo: string;
  observaciones?: string;
  ajustes: {
    lote_id: number;
    cantidad_nueva: number;
  }[];
}

export interface AdjustmentFilters {
  page?: number;
  limit?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  usuario_id?: string;
  motivo?: string;
}

export interface AdjustmentsResponse {
  ajustes: InventoryAdjustment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export const adjustmentService = {
  async getAdjustments(filters: AdjustmentFilters = {}): Promise<AdjustmentsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/inventory/ajustes?${params.toString()}`);
    return response.data;
  },

  async getAdjustment(id: number): Promise<{ ajuste: InventoryAdjustment; detalles: AdjustmentDetail[] }> {
    const response = await apiClient.get(`/inventory/ajustes/${id}`);
    return response.data;
  },

  async createAdjustment(data: CreateAdjustmentData): Promise<{ message: string; ajuste: InventoryAdjustment }> {
    const response = await apiClient.post('/inventory/ajustes', data);
    return response.data;
  }
};