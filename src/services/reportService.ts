import { apiClient } from './apiClient';

export interface SalesReportFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  usuario_id?: string;
  metodo_pago?: string;
  formato?: 'json' | 'pdf' | 'excel';
}

export interface InventoryReportFilters {
  categoria?: string;
  estado_vencimiento?: string;
  proveedor_id?: string;
  formato?: 'json' | 'pdf' | 'excel';
}

export interface SuppliersReportFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  proveedor_id?: string;
}

export interface ProfitReportFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  producto_id?: string;
  categoria?: string;
}

export interface CashCutReportFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  usuario_id?: string;
}

export interface SalesReport {
  resumen: {
    total_ventas: number;
    monto_total: number;
    promedio_venta: number;
    subtotal_total: number;
    descuento_total: number;
    impuesto_total: number;
    primera_venta: string;
    ultima_venta: string;
  };
  ventas: any[];
  ventasPorDia: any[];
  ventasPorProducto: any[];
  ventasPorMetodo: any[];
  parametros: SalesReportFilters;
  generado_en: string;
}

export interface InventoryReport {
  resumen: {
    total_productos: number;
    total_lotes: number;
    total_unidades: number;
    valor_total_inventario: number;
    lotes_criticos: number;
    lotes_advertencia: number;
    productos_stock_bajo: number;
  };
  inventario: any[];
  inventarioPorCategoria: any[];
  alertasVencimiento: any[];
  stockBajo: any[];
  parametros: InventoryReportFilters;
  generado_en: string;
}

export interface SuppliersReport {
  resumen: {
    total_proveedores: number;
    total_productos: number;
    total_actas: number;
    monto_total_compras: number;
  };
  comprasPorProveedor: any[];
  productosProveedor: any[];
  actasRecepcion: any[];
  parametros: SuppliersReportFilters;
  generado_en: string;
}

export interface ProfitReport {
  resumen: {
    ingresos_totales: number;
    costos_totales: number;
    utilidad_bruta: number;
    margen_promedio: number;
    total_ventas: number;
    total_unidades_vendidas: number;
  };
  utilidadesPorProducto: any[];
  utilidadesPorCategoria: any[];
  utilidadesPorDia: any[];
  parametros: ProfitReportFilters;
  generado_en: string;
}

export interface CashCutReport {
  resumen: {
    total_ventas: number;
    monto_total: number;
    subtotal_total: number;
    descuento_total: number;
    impuesto_total: number;
    total_efectivo: number;
    total_tarjeta: number;
    total_transferencia: number;
    primera_venta: string;
    ultima_venta: string;
  };
  ventasPorMetodo: any[];
  ventasPorUsuario: any[];
  detalleVentas: any[];
  devoluciones: any[];
  parametros: CashCutReportFilters;
  generado_en: string;
}

export const reportService = {
  async getSalesReport(filters: SalesReportFilters = {}): Promise<SalesReport> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/reports/ventas?${params.toString()}`);
    return response.data;
  },

  async getInventoryReport(filters: InventoryReportFilters = {}): Promise<InventoryReport> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/reports/inventario?${params.toString()}`);
    return response.data;
  },

  async getSuppliersReport(filters: SuppliersReportFilters = {}): Promise<SuppliersReport> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/reports/proveedores?${params.toString()}`);
    return response.data;
  },

  async getProfitReport(filters: ProfitReportFilters = {}): Promise<ProfitReport> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/reports/utilidades?${params.toString()}`);
    return response.data;
  },

  async getCashCutReport(filters: CashCutReportFilters = {}): Promise<CashCutReport> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/reports/corte-caja?${params.toString()}`);
    return response.data;
  }
};