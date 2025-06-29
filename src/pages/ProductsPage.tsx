import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Filter, Edit, Trash2, Package, X } from 'lucide-react';
import { productService, Product, CreateProductData } from '../services/productService';
import { supplierService } from '../services/supplierService';
import toast from 'react-hot-toast';

const ProductsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductData>({
    nombre: '',
    presentacion: '',
    stock_minimo: 0,
    precio_venta: 0
  });

  const queryClient = useQueryClient();

  // Query para obtener productos
  const { data: productsData, isLoading, error } = useQuery(
    ['products', { page: currentPage, search: searchTerm, categoria: selectedCategory }],
    () => productService.getProducts({
      page: currentPage,
      limit: 20,
      search: searchTerm,
      categoria: selectedCategory
    }),
    { keepPreviousData: true }
  );

  // Query para obtener proveedores
  const { data: suppliersData } = useQuery(
    'suppliers-for-products',
    () => supplierService.getSuppliers({ limit: 100 })
  );

  // Mutación para crear producto
  const createProductMutation = useMutation(productService.createProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries('products');
      toast.success('Producto creado exitosamente');
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear producto');
    }
  });

  // Mutación para actualizar producto
  const updateProductMutation = useMutation(
    ({ id, data }: { id: number; data: CreateProductData }) => 
      productService.updateProduct(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        toast.success('Producto actualizado exitosamente');
        setShowModal(false);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar producto');
      }
    }
  );

  // Mutación para eliminar producto
  const deleteProductMutation = useMutation(productService.deleteProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries('products');
      toast.success('Producto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar producto');
    }
  });

  const resetForm = () => {
    setFormData({
      nombre: '',
      presentacion: '',
      stock_minimo: 0,
      precio_venta: 0
    });
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.producto_id, data: formData });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      codigo_barras: product.codigo_barras || '',
      nombre: product.nombre,
      concentracion: product.concentracion || '',
      forma_farmaceutica: product.forma_farmaceutica || '',
      presentacion: product.presentacion,
      laboratorio: product.laboratorio || '',
      registro_sanitario: product.registro_sanitario || '',
      temperatura_id: product.temperatura_id || undefined,
      proveedor_id: product.proveedor_id || undefined,
      categoria: product.categoria || '',
      stock_minimo: product.stock_minimo,
      precio_venta: product.precio_venta
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      deleteProductMutation.mutate(id);
    }
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= minStock) return 'bajo';
    if (stock <= minStock * 1.5) return 'medio';
    return 'alto';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'bajo': return 'bg-red-100 text-red-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'alto': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error al cargar productos</div>
        <button 
          onClick={() => queryClient.invalidateQueries('products')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-600">
            Gestiona el catálogo de medicamentos y productos
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Producto</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Todas las categorías</option>
                  <option value="Analgésico">Analgésico</option>
                  <option value="Antiinflamatorio">Antiinflamatorio</option>
                  <option value="Antihistamínico">Antihistamínico</option>
                  <option value="Antibiótico">Antibiótico</option>
                  <option value="Vitaminas">Vitaminas</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Producto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Presentación</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Laboratorio</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Precio</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productsData?.productos.map((product) => {
                  const stockStatus = getStockStatus(product.stock, product.stock_minimo);
                  return (
                    <tr key={product.producto_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.nombre}</p>
                            <p className="text-sm text-gray-500">{product.categoria}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {product.presentacion}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {product.laboratorio || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {product.stock}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockColor(stockStatus)}`}>
                            {stockStatus === 'bajo' ? 'Bajo' : stockStatus === 'medio' ? 'Medio' : 'Alto'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Mín: {product.stock_minimo}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(product.precio_venta)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.estado 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEdit(product)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.producto_id)}
                            className="p-1 text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {productsData && productsData.pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * productsData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(currentPage * productsData.pagination.itemsPerPage, productsData.pagination.totalItems)} de{' '}
                {productsData.pagination.totalItems} productos
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, productsData.pagination.totalPages))}
                  disabled={currentPage === productsData.pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_barras || ''}
                    onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concentración
                  </label>
                  <input
                    type="text"
                    value={formData.concentracion || ''}
                    onChange={(e) => setFormData({ ...formData, concentracion: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma Farmacéutica
                  </label>
                  <input
                    type="text"
                    value={formData.forma_farmaceutica || ''}
                    onChange={(e) => setFormData({ ...formData, forma_farmaceutica: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Presentación *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.presentacion}
                    onChange={(e) => setFormData({ ...formData, presentacion: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laboratorio
                  </label>
                  <input
                    type="text"
                    value={formData.laboratorio || ''}
                    onChange={(e) => setFormData({ ...formData, laboratorio: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registro Sanitario
                  </label>
                  <input
                    type="text"
                    value={formData.registro_sanitario || ''}
                    onChange={(e) => setFormData({ ...formData, registro_sanitario: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <select
                    value={formData.proveedor_id || ''}
                    onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliersData?.proveedores.map((supplier) => (
                      <option key={supplier.proveedor_id} value={supplier.proveedor_id}>
                        {supplier.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Analgésico">Analgésico</option>
                    <option value="Antiinflamatorio">Antiinflamatorio</option>
                    <option value="Antihistamínico">Antihistamínico</option>
                    <option value="Antibiótico">Antibiótico</option>
                    <option value="Vitaminas">Vitaminas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Mínimo *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Venta *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.precio_venta}
                    onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isLoading || updateProductMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {createProductMutation.isLoading || updateProductMutation.isLoading
                    ? 'Guardando...'
                    : editingProduct ? 'Actualizar' : 'Crear'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;