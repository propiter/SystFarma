import { apiClient } from './apiClient';

export interface Sale {
  venta_id: number;
  usuario_id: number;
  cliente_id?: number;
  fecha_venta: string;
  subtotal: number;
  descuento_total: number;
  impuesto_total: number;
  total: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  monto_efectivo: number;
  monto_tarjeta: number;
  monto_transferencia: number;
  cambio: number;
  estado: 'pendiente' | 'completada' | 'cancelada';
  creado_en: string;
  cajero_nombre: string;
  cliente_nombre?: string;
  cliente_documento?: string;
  total_items: number;
}

export interface SaleDetail {
  detalle_venta_id: number;
  venta_id: number;
  producto_id: number;
  lote_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total_linea: number;
  devuelto: boolean;
  cantidad_devuelta: number;
  producto_nombre: string;
  presentacion: string;
  laboratorio?: string;
  lote_codigo: string;
  fecha_vencimiento: string;
}

export interface SalesFilters {
  page?: number;
  limit?: number;
  search?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  metodo_pago?: string;
  usuario_id?: string;
}

export interface SalesResponse {
  ventas: Sale[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CreateSaleData {
  cliente_id?: number;
  items: {
    producto_id: number;
    lote_id: number;
    cantidad: number;
    precio_unitario: number;
    descuento?: number;
    impuesto?: number;
  }[];
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  monto_efectivo?: number;
  monto_tarjeta?: number;
  monto_transferencia?: number;
  cambio?: number;
}

export interface CreateDevolucionData {
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

export interface SalesStats {
  estadisticasGenerales: {
    total_ventas: number;
    monto_total: number;
    promedio_venta: number;
    total_items_vendidos: number;
  };
  ventasPorDia: {
    fecha: string;
    total_ventas: number;
    monto_total: number;
  }[];
  productosMasVendidos: {
    nombre: string;
    presentacion: string;
    cantidad_vendida: number;
    monto_total: number;
  }[];
  ventasPorMetodoPago: {
    metodo_pago: string;
    total_ventas: number;
    monto_total: number;
  }[];
}

export const salesService = {
  async getSales(filters: SalesFilters = {}): Promise<SalesResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/sales?${params.toString()}`);
    return response.data;
  },

  async getSale(id: number): Promise<{ venta: Sale; detalles: SaleDetail[] }> {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data;
  },

  async createSale(data: CreateSaleData): Promise<{ message: string; venta: Sale }> {
    const response = await apiClient.post('/sales', data);
    return response.data;
  },

  async createDevolucion(data: CreateDevolucionData): Promise<{ message: string; devolucion: any }> {
    const response = await apiClient.post('/sales/devoluciones', data);
    return response.data;
  },

  async getEstadisticas(filters: { fecha_inicio?: string; fecha_fin?: string } = {}): Promise<SalesStats> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/sales/estadisticas?${params.toString()}`);
    return response.data;
  }
};