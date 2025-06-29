import { apiClient } from './apiClient';

export interface InventoryItem {
  lote_id: number;
  lote_codigo: string;
  producto_id: number;
  fecha_vencimiento: string;
  cantidad_disponible: number;
  precio_compra: number;
  observaciones?: string;
  estado: boolean;
  fecha_ingreso: string;
  fecha_actualizacion: string;
  producto_nombre: string;
  presentacion: string;
  laboratorio?: string;
  categoria?: string;
  stock_minimo: number;
  proveedor_nombre?: string;
  temperatura_descripcion?: string;
  estado_vencimiento: 'rojo' | 'amarillo' | 'verde';
  dias_vencimiento: number;
  valor_total: number;
}

export interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoria?: string;
  estado_vencimiento?: string;
  ordenar?: string;
  direccion?: 'ASC' | 'DESC';
}

export interface InventoryResponse {
  inventario: InventoryItem[];
  estadisticas: {
    total_lotes: number;
    valor_total_inventario: number;
    lotes_criticos: number;
    lotes_advertencia: number;
    lotes_normales: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CreateLoteData {
  lote_codigo: string;
  producto_id: number;
  fecha_vencimiento: string;
  cantidad_disponible: number;
  precio_compra: number;
  observaciones?: string;
}

export interface AjusteInventarioData {
  motivo: string;
  observaciones?: string;
  ajustes: {
    lote_id: number;
    cantidad_nueva: number;
  }[];
}

export interface AlertsResponse {
  alertasVencimiento: {
    lote_id: number;
    lote_codigo: string;
    producto_nombre: string;
    presentacion: string;
    laboratorio?: string;
    fecha_vencimiento: string;
    cantidad_disponible: number;
    prioridad: 'rojo' | 'amarillo' | 'verde';
    dias_vencimiento: number;
  }[];
  stockBajo: {
    producto_id: number;
    nombre: string;
    presentacion: string;
    stock: number;
    stock_minimo: number;
    proveedor_nombre?: string;
    deficit: number;
  }[];
}

export const inventoryService = {
  async getInventory(filters: InventoryFilters = {}): Promise<InventoryResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/inventory?${params.toString()}`);
    return response.data;
  },

  async getAlerts(): Promise<AlertsResponse> {
    const response = await apiClient.get('/inventory/alerts');
    return response.data;
  },

  async createLote(data: CreateLoteData): Promise<{ message: string; lote: any }> {
    const response = await apiClient.post('/inventory/lotes', data);
    return response.data;
  },

  async updateLote(id: number, data: CreateLoteData): Promise<{ message: string; lote: any }> {
    const response = await apiClient.put(`/inventory/lotes/${id}`, data);
    return response.data;
  },

  async createAjuste(data: AjusteInventarioData): Promise<{ message: string; ajuste: any }> {
    const response = await apiClient.post('/inventory/ajustes', data);
    return response.data;
  },

  async getMovimientos(filters: any = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/inventory/movimientos?${params.toString()}`);
    return response.data;
  }
};