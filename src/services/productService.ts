import { apiClient } from './apiClient';

export interface Product {
  producto_id: number;
  codigo_barras?: string;
  nombre: string;
  concentracion?: string;
  forma_farmaceutica?: string;
  presentacion: string;
  laboratorio?: string;
  registro_sanitario?: string;
  temperatura_id?: number;
  proveedor_id?: number;
  categoria?: string;
  stock: number;
  stock_minimo: number;
  precio_venta: number;
  estado: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  proveedor_nombre?: string;
  temperatura_descripcion?: string;
  estado_stock?: 'bajo' | 'medio' | 'alto';
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoria?: string;
  estado?: string;
  ordenar?: string;
  direccion?: 'ASC' | 'DESC';
}

export interface ProductResponse {
  productos: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CreateProductData {
  codigo_barras?: string;
  nombre: string;
  concentracion?: string;
  forma_farmaceutica?: string;
  presentacion: string;
  laboratorio?: string;
  registro_sanitario?: string;
  temperatura_id?: number;
  proveedor_id?: number;
  categoria?: string;
  stock_minimo: number;
  precio_venta: number;
}

export const productService = {
  async getProducts(filters: ProductFilters = {}): Promise<ProductResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/products?${params.toString()}`);
    return response.data;
  },

  async getProduct(id: number): Promise<{ producto: Product; lotes: any[] }> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  async createProduct(data: CreateProductData): Promise<{ message: string; producto: Product }> {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  async updateProduct(id: number, data: CreateProductData): Promise<{ message: string; producto: Product }> {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  }
};