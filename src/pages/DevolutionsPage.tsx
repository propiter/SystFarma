import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Eye, CheckCircle, XCircle, Clock, ArrowLeft, Package } from 'lucide-react';
import { devolutionService, CreateDevolutionData } from '../services/devolutionService';
import { salesService } from '../services/salesService';
import toast from 'react-hot-toast';

const DevolutionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [devolutionData, setDevolutionData] = useState<CreateDevolutionData>({
    venta_id: 0,
    tipo: 'parcial',
    motivo: '',
    observaciones: '',
    items: [],
    metodo_reembolso: 'efectivo'
  });

  const queryClient = useQueryClient();

  // Query para obtener devoluciones
  const { data: devolutionsData, isLoading } = useQuery(
    ['devolutions', { page: currentPage, search: searchTerm, estado: selectedStatus }],
    () => devolutionService.getDevolutions({
      page: currentPage,
      limit: 20,
      search: searchTerm,
      estado: selectedStatus
    }),
    { keepPreviousData: true }
  );

  // Query para obtener ventas (para crear devoluciones)
  const { data: salesData } = useQuery(
    ['sales-for-devolutions', searchTerm],
    () => salesService.getSales({ 
      search: searchTerm, 
      limit: 50,
      estado: 'completada'
    }),
    { enabled: searchTerm.length > 2 }
  );

  // Mutación para crear devolución
  const createDevolutionMutation = useMutation(devolutionService.createDevolution, {
    onSuccess: () => {
      queryClient.invalidateQueries('devolutions');
      toast.success('Devolución creada exitosamente');
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear devolución');
    }
  });

  // Mutación para actualizar estado
  const updateStatusMutation = useMutation(
    ({ id, estado }: { id: number; estado: 'completada' | 'rechazada' }) =>
      devolutionService.updateDevolutionStatus(id, estado),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('devolutions');
        toast.success('Estado actualizado exitosamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar estado');
      }
    }
  );

  const resetForm = () => {
    setDevolutionData({
      venta_id: 0,
      tipo: 'parcial',
      motivo: '',
      observaciones: '',
      items: [],
      metodo_reembolso: 'efectivo'
    });
    setSelectedSale(null);
  };

  const handleSelectSale = async (sale: any) => {
    try {
      const saleDetail = await salesService.getSale(sale.venta_id);
      setSelectedSale(saleDetail);
      setDevolutionData({
        ...devolutionData,
        venta_id: sale.venta_id,
        items: saleDetail.detalles.map(detail => ({
          detalle_venta_id: detail.detalle_venta_id,
          cantidad_devuelta: 0,
          motivo: ''
        }))
      });
    } catch (error) {
      toast.error('Error al cargar detalles de la venta');
    }
  };

  const updateItemQuantity = (index: number, cantidad: number) => {
    const updatedItems = [...devolutionData.items];
    updatedItems[index].cantidad_devuelta = cantidad;
    setDevolutionData({
      ...devolutionData,
      items: updatedItems
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = devolutionData.items.filter(item => item.cantidad_devuelta > 0);
    
    if (validItems.length === 0) {
      toast.error('Debe especificar al menos un producto para devolver');
      return;
    }

    createDevolutionMutation.mutate({
      ...devolutionData,
      items: validItems
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completada': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'rechazada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completada': return CheckCircle;
      case 'pendiente': return Clock;
      case 'rechazada': return XCircle;
      default: return Clock;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devoluciones</h1>
          <p className="text-sm text-gray-600">
            Gestiona las devoluciones de productos y reembolsos
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Devolución</span>
        </button>
      </div>

      {/* Stats Cards */}
      {devolutionsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devoluciones</p>
                <p className="text-2xl font-bold text-gray-900">{devolutionsData.pagination.totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {devolutionsData.devoluciones.filter(d => d.estado === 'pendiente').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {devolutionsData.devoluciones.filter(d => d.estado === 'completada').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monto Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(devolutionsData.devoluciones.reduce((sum, d) => sum + d.monto_total, 0))}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar devoluciones..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
              <option value="rechazada">Rechazada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Devolutions Table */}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Venta</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Motivo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Monto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {devolutionsData?.devoluciones.map((devolution) => {
                  const StatusIcon = getStatusIcon(devolution.estado);
                  
                  return (
                    <tr key={devolution.devolucion_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        DEV-{devolution.devolucion_id.toString().padStart(6, '0')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        VT-{devolution.venta_id.toString().padStart(6, '0')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatDate(devolution.fecha)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          devolution.tipo === 'total' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {devolution.tipo === 'total' ? 'Total' : 'Parcial'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                        {devolution.motivo}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(devolution.monto_total)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className="w-4 h-4" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(devolution.estado)}`}>
                            {devolution.estado.charAt(0).toUpperCase() + devolution.estado.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-blue-600 hover:text-blue-700 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {devolution.estado === 'pendiente' && (
                            <>
                              <button 
                                onClick={() => updateStatusMutation.mutate({ id: devolution.devolucion_id, estado: 'completada' })}
                                className="p-1 text-green-600 hover:text-green-700 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => updateStatusMutation.mutate({ id: devolution.devolucion_id, estado: 'rechazada' })}
                                className="p-1 text-red-600 hover:text-red-700 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {devolutionsData?.devoluciones.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron devoluciones</h3>
          <p className="text-gray-500">
            No hay devoluciones que coincidan con los filtros seleccionados.
          </p>
        </div>
      )}

      {/* Modal para crear devolución */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nueva Devolución</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {!selectedSale ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Venta</h3>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar venta por número o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                {salesData && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {salesData.ventas.map((sale) => (
                      <div
                        key={sale.venta_id}
                        onClick={() => handleSelectSale(sale)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">VT-{sale.venta_id.toString().padStart(6, '0')}</p>
                            <p className="text-sm text-gray-600">{sale.cliente_nombre || 'Cliente general'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(sale.total)}</p>
                            <p className="text-sm text-gray-600">{formatDate(sale.fecha_venta)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSale(null)}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-lg font-medium text-gray-900">
                    Devolución para Venta VT-{selectedSale.venta.venta_id.toString().padStart(6, '0')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Devolución *
                    </label>
                    <select
                      required
                      value={devolutionData.tipo}
                      onChange={(e) => setDevolutionData({ ...devolutionData, tipo: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="parcial">Parcial</option>
                      <option value="total">Total</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Reembolso *
                    </label>
                    <select
                      required
                      value={devolutionData.metodo_reembolso}
                      onChange={(e) => setDevolutionData({ ...devolutionData, metodo_reembolso: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo *
                  </label>
                  <input
                    type="text"
                    required
                    value={devolutionData.motivo}
                    onChange={(e) => setDevolutionData({ ...devolutionData, motivo: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={devolutionData.observaciones}
                    onChange={(e) => setDevolutionData({ ...devolutionData, observaciones: e.target.value })}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Productos a Devolver</h4>
                  <div className="space-y-4">
                    {selectedSale.detalles.map((detail: any, index: number) => (
                      <div key={detail.detalle_venta_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{detail.producto_nombre}</p>
                            <p className="text-sm text-gray-600">{detail.presentacion}</p>
                            <p className="text-sm text-gray-600">Lote: {detail.lote_codigo}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Vendido: {detail.cantidad}</p>
                            <p className="text-sm font-medium">{formatCurrency(detail.precio_unitario)}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cantidad a Devolver
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={detail.cantidad - detail.cantidad_devuelta}
                              value={devolutionData.items[index]?.cantidad_devuelta || 0}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Motivo Específico
                            </label>
                            <input
                              type="text"
                              value={devolutionData.items[index]?.motivo || ''}
                              onChange={(e) => {
                                const updatedItems = [...devolutionData.items];
                                updatedItems[index].motivo = e.target.value;
                                setDevolutionData({ ...devolutionData, items: updatedItems });
                              }}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createDevolutionMutation.isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {createDevolutionMutation.isLoading ? 'Creando...' : 'Crear Devolución'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevolutionsPage;