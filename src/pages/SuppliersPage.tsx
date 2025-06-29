import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, Truck, Phone, Mail, MapPin, X, FileText, CheckCircle, Clock } from 'lucide-react';
import { supplierService, CreateSupplierData, CreateActaData } from '../services/supplierService';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';

const SuppliersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showActaModal, setShowActaModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [formData, setFormData] = useState<CreateSupplierData>({
    nombre: '',
    contacto: '',
    telefono: '',
    correo: '',
    direccion: ''
  });
  const [actaData, setActaData] = useState<CreateActaData>({
    fecha_recepcion: new Date().toISOString().split('T')[0],
    ciudad: '',
    responsable: '',
    numero_factura: '',
    proveedor_id: 0,
    tipo_acta: 'Recepción de Medicamentos',
    observaciones: '',
    productos: []
  });

  const queryClient = useQueryClient();

  // Query para obtener proveedores
  const { data: suppliersData, isLoading, error } = useQuery(
    ['suppliers', { page: currentPage, search: searchTerm }],
    () => supplierService.getSuppliers({
      page: currentPage,
      limit: 20,
      search: searchTerm
    }),
    { keepPreviousData: true }
  );

  // Query para obtener productos (para actas)
  const { data: productsData } = useQuery(
    'products-for-actas',
    () => productService.getProducts({ limit: 1000 })
  );

  // Query para obtener actas
  const { data: actasData } = useQuery(
    'actas',
    () => supplierService.getActas({ limit: 50 })
  );

  // Mutación para crear proveedor
  const createSupplierMutation = useMutation(supplierService.createSupplier, {
    onSuccess: () => {
      queryClient.invalidateQueries('suppliers');
      toast.success('Proveedor creado exitosamente');
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear proveedor');
    }
  });

  // Mutación para actualizar proveedor
  const updateSupplierMutation = useMutation(
    ({ id, data }: { id: number; data: CreateSupplierData }) => 
      supplierService.updateSupplier(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers');
        toast.success('Proveedor actualizado exitosamente');
        setShowModal(false);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar proveedor');
      }
    }
  );

  // Mutación para eliminar proveedor
  const deleteSupplierMutation = useMutation(supplierService.deleteSupplier, {
    onSuccess: () => {
      queryClient.invalidateQueries('suppliers');
      toast.success('Proveedor eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar proveedor');
    }
  });

  // Mutación para crear acta
  const createActaMutation = useMutation(supplierService.createActa, {
    onSuccess: () => {
      queryClient.invalidateQueries('actas');
      toast.success('Acta de recepción creada exitosamente');
      setShowActaModal(false);
      resetActaForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear acta');
    }
  });

  // Mutación para aprobar acta
  const aprobarActaMutation = useMutation(supplierService.aprobarActa, {
    onSuccess: () => {
      queryClient.invalidateQueries('actas');
      queryClient.invalidateQueries('inventory');
      toast.success('Acta aprobada y cargada al inventario');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al aprobar acta');
    }
  });

  const resetForm = () => {
    setFormData({
      nombre: '',
      contacto: '',
      telefono: '',
      correo: '',
      direccion: ''
    });
    setEditingSupplier(null);
  };

  const resetActaForm = () => {
    setActaData({
      fecha_recepcion: new Date().toISOString().split('T')[0],
      ciudad: '',
      responsable: '',
      numero_factura: '',
      proveedor_id: 0,
      tipo_acta: 'Recepción de Medicamentos',
      observaciones: '',
      productos: []
    });
    setSelectedSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.proveedor_id, data: formData });
    } else {
      createSupplierMutation.mutate(formData);
    }
  };

  const handleActaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (actaData.productos.length === 0) {
      toast.error('Debe agregar al menos un producto al acta');
      return;
    }

    createActaMutation.mutate(actaData);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      nombre: supplier.nombre,
      contacto: supplier.contacto || '',
      telefono: supplier.telefono || '',
      correo: supplier.correo || '',
      direccion: supplier.direccion || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este proveedor?')) {
      deleteSupplierMutation.mutate(id);
    }
  };

  const handleCreateActa = (supplier: any) => {
    setSelectedSupplier(supplier);
    setActaData({
      ...actaData,
      proveedor_id: supplier.proveedor_id
    });
    setShowActaModal(true);
  };

  const addProductToActa = () => {
    setActaData({
      ...actaData,
      productos: [
        ...actaData.productos,
        {
          producto_id: 0,
          lote_codigo: '',
          fecha_vencimiento: '',
          cantidad_recibida: 0,
          precio_compra: 0,
          observaciones: ''
        }
      ]
    });
  };

  const updateProductInActa = (index: number, field: string, value: any) => {
    const updatedProductos = [...actaData.productos];
    updatedProductos[index] = {
      ...updatedProductos[index],
      [field]: value
    };
    setActaData({
      ...actaData,
      productos: updatedProductos
    });
  };

  const removeProductFromActa = (index: number) => {
    const updatedProductos = actaData.productos.filter((_, i) => i !== index);
    setActaData({
      ...actaData,
      productos: updatedProductos
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error al cargar proveedores</div>
        <button 
          onClick={() => queryClient.invalidateQueries('suppliers')}
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
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-600">
            Gestiona la información de proveedores y actas de recepción
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Proveedor</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {suppliersData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Proveedores</p>
                <p className="text-2xl font-bold text-gray-900">{suppliersData.pagination.totalItems}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {suppliersData.proveedores.filter(s => s.estado).length}
                </p>
              </div>
              <Truck className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productos Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {suppliersData.proveedores.reduce((sum, s) => sum + s.productos_activos, 0)}
                </p>
              </div>
              <Truck className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actas Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {actasData?.actas.filter(a => a.estado === 'Borrador').length || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar proveedores..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliersData?.proveedores.map((supplier) => (
            <div key={supplier.proveedor_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{supplier.nombre}</h3>
                    <p className="text-sm text-gray-500">{supplier.contacto}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  supplier.estado 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {supplier.estado ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="space-y-3">
                {supplier.telefono && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{supplier.telefono}</span>
                  </div>
                )}
                
                {supplier.correo && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{supplier.correo}</span>
                  </div>
                )}
                
                {supplier.direccion && (
                  <div className="flex items-start space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{supplier.direccion}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-600">Productos:</span>
                    <span className="ml-1 font-medium text-gray-900">{supplier.productos_activos}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Actas:</span>
                    <span className="ml-1 font-medium text-gray-900">{supplier.total_actas}</span>
                  </div>
                </div>
                {supplier.ultima_compra && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Última compra:</span>
                    <span className="ml-1 font-medium text-gray-900">{formatDate(supplier.ultima_compra)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => handleCreateActa(supplier)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>Nueva Acta</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleEdit(supplier)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(supplier.proveedor_id)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {suppliersData && suppliersData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((currentPage - 1) * suppliersData.pagination.itemsPerPage) + 1} a{' '}
            {Math.min(currentPage * suppliersData.pagination.itemsPerPage, suppliersData.pagination.totalItems)} de{' '}
            {suppliersData.pagination.totalItems} proveedores
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, suppliersData.pagination.totalPages))}
              disabled={currentPage === suppliersData.pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Actas Section */}
      {actasData && actasData.actas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actas de Recepción Recientes</h3>
          <div className="space-y-3">
            {actasData.actas.slice(0, 5).map((acta) => (
              <div key={acta.acta_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    acta.estado === 'Aprobada' ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    {acta.estado === 'Aprobada' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Acta #{acta.acta_id}</p>
                    <p className="text-sm text-gray-600">{acta.proveedor_nombre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatDate(acta.fecha_recepcion)}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      acta.estado === 'Aprobada' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {acta.estado}
                    </span>
                    {acta.estado === 'Borrador' && (
                      <button
                        onClick={() => aprobarActaMutation.mutate(acta.acta_id)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Aprobar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suppliersData?.proveedores.length === 0 && (
        <div className="text-center py-12">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron proveedores</h3>
          <p className="text-gray-500">
            No hay proveedores que coincidan con tu búsqueda.
          </p>
        </div>
      )}

      {/* Modal para crear/editar proveedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
                  Contacto
                </label>
                <input
                  type="text"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
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
                  disabled={createSupplierMutation.isLoading || updateSupplierMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {createSupplierMutation.isLoading || updateSupplierMutation.isLoading
                    ? 'Guardando...'
                    : editingSupplier ? 'Actualizar' : 'Crear'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para crear acta de recepción */}
      {showActaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Nueva Acta de Recepción - {selectedSupplier?.nombre}
              </h2>
              <button
                onClick={() => {
                  setShowActaModal(false);
                  resetActaForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleActaSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Recepción *
                  </label>
                  <input
                    type="date"
                    required
                    value={actaData.fecha_recepcion}
                    onChange={(e) => setActaData({ ...actaData, fecha_recepcion: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    required
                    value={actaData.ciudad}
                    onChange={(e) => setActaData({ ...actaData, ciudad: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    value={actaData.responsable}
                    onChange={(e) => setActaData({ ...actaData, responsable: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Factura *
                  </label>
                  <input
                    type="text"
                    required
                    value={actaData.numero_factura}
                    onChange={(e) => setActaData({ ...actaData, numero_factura: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={actaData.observaciones}
                  onChange={(e) => setActaData({ ...actaData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Productos</h3>
                  <button
                    type="button"
                    onClick={addProductToActa}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar Producto</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {actaData.productos.map((producto, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Producto *
                          </label>
                          <select
                            required
                            value={producto.producto_id}
                            onChange={(e) => updateProductInActa(index, 'producto_id', parseInt(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value={0}>Seleccionar producto</option>
                            {productsData?.productos.map((p) => (
                              <option key={p.producto_id} value={p.producto_id}>
                                {p.nombre} - {p.presentacion}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Código de Lote *
                          </label>
                          <input
                            type="text"
                            required
                            value={producto.lote_codigo}
                            onChange={(e) => updateProductInActa(index, 'lote_codigo', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Vencimiento *
                          </label>
                          <input
                            type="date"
                            required
                            value={producto.fecha_vencimiento}
                            onChange={(e) => updateProductInActa(index, 'fecha_vencimiento', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad Recibida *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={producto.cantidad_recibida}
                            onChange={(e) => updateProductInActa(index, 'cantidad_recibida', parseInt(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio de Compra *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={producto.precio_compra}
                            onChange={(e) => updateProductInActa(index, 'precio_compra', parseFloat(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeProductFromActa(index)}
                            className="w-full p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observaciones
                        </label>
                        <input
                          type="text"
                          value={producto.observaciones}
                          onChange={(e) => updateProductInActa(index, 'observaciones', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowActaModal(false);
                    resetActaForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createActaMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {createActaMutation.isLoading ? 'Creando...' : 'Crear Acta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;