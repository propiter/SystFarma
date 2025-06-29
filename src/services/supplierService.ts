import { apiClient } from './apiClient';

export interface Supplier {
  proveedor_id: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  estado: boolean;
  fecha_creacion: string;
  productos_activos: number;
  ultima_compra?: string;
  total_actas: number;
}

export interface SuppliersFilters {
  page?: number;
  limit?: number;
  search?: string;
  estado?: string;
}

export interface SuppliersResponse {
  proveedores: Supplier[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CreateSupplierData {
  nombre: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}

export interface ActaRecepcion {
  acta_id: number;
  usuario_id: number;
  fecha_recepcion: string;
  ciudad: string;
  responsable: string;
  numero_factura: string;
  proveedor_id: number;
  tipo_acta: string;
  observaciones?: string;
  cargada_inventario: boolean;
  estado: 'Borrador' | 'Aprobada';
  fecha_creacion: string;
  proveedor_nombre: string;
  usuario_nombre: string;
  total_productos: number;
}

export interface CreateActaData {
  fecha_recepcion: string;
  ciudad: string;
  responsable: string;
  numero_factura: string;
  proveedor_id: number;
  tipo_acta: string;
  observaciones?: string;
  productos: {
    producto_id: number;
    lote_codigo: string;
    fecha_vencimiento: string;
    cantidad_recibida: number;
    precio_compra: number;
    observaciones?: string;
  }[];
}

export const supplierService = {
  async getSuppliers(filters: SuppliersFilters = {}): Promise<SuppliersResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/suppliers?${params.toString()}`);
    return response.data;
  },

  async getSupplier(id: number): Promise<{ proveedor: Supplier; productos: any[]; actas: ActaRecepcion[] }> {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
  },

  async createSupplier(data: CreateSupplierData): Promise<{ message: string; proveedor: Supplier }> {
    const response = await apiClient.post('/suppliers', data);
    return response.data;
  },

  async updateSupplier(id: number, data: CreateSupplierData): Promise<{ message: string; proveedor: Supplier }> {
    const response = await apiClient.put(`/suppliers/${id}`, data);
    return response.data;
  },

  async deleteSupplier(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  },

  async createActa(data: CreateActaData): Promise<{ message: string; acta: ActaRecepcion }> {
    const response = await apiClient.post('/suppliers/actas', data);
    return response.data;
  },

  async aprobarActa(id: number): Promise<{ message: string; acta: ActaRecepcion }> {
    const response = await apiClient.put(`/suppliers/actas/${id}/aprobar`);
    return response.data;
  },

  async getActas(filters: any = {}): Promise<{ actas: ActaRecepcion[]; pagination: any }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/suppliers/actas?${params.toString()}`);
    return response.data;
  }
};