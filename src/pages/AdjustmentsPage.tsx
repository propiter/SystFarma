import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Eye, Package, Edit3, AlertTriangle } from 'lucide-react';
import { adjustmentService, CreateAdjustmentData } from '../services/adjustmentService';
import { inventoryService } from '../services/inventoryService';
import toast from 'react-hot-toast';

const AdjustmentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState<CreateAdjustmentData>({
    motivo: '',
    observaciones: '',
    ajustes: []
  });
  const [selectedLotes, setSelectedLotes] = useState<any[]>([]);

  const queryClient = useQueryClient();

  // Query para obtener ajustes
  const { data: adjustmentsData, isLoading } = useQuery(
    ['adjustments', { page: currentPage }],
    () => adjustmentService.getAdjustments({
      page: currentPage,
      limit: 20
    }),
    { keepPreviousData: true }
  );

  // Query para obtener inventario (para ajustes)
  const { data: inventoryData } = useQuery(
    ['inventory-for-adjustments', searchTerm],
    () => inventoryService.getInventory({
      search: searchTerm,
      limit: 100
    }),
    { enabled: searchTerm.length > 2 }
  );

  // Mutación para crear ajuste
  const createAdjustmentMutation = useMutation(adjustmentService.createAdjustment, {
    onSuccess: () => {
      queryClient.invalidateQueries('adjustments');
      queryClient.invalidateQueries('inventory');
      toast.success('Ajuste de inventario creado exitosamente');
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear ajuste');
    }
  });

  const resetForm = () => {
    setAdjustmentData({
      motivo: '',
      observaciones: '',
      ajustes: []
    });
    setSelectedLotes([]);
  };

  const addLoteToAdjustment = (lote: any) => {
    if (selectedLotes.find(l => l.lote_id === lote.lote_id)) {
      toast.error('Este lote ya está en la lista de ajustes');
      return;
    }

    setSelectedLotes([...selectedLotes, lote]);
    setAdjustmentData({
      ...adjustmentData,
      ajustes: [
        ...adjustmentData.ajustes,
        {
          lote_id: lote.lote_id,
          cantidad_nueva: lote.cantidad_disponible
        }
      ]
    });
  };

  const removeLoteFromAdjustment = (loteId: number) => {
    setSelectedLotes(selectedLotes.filter(l => l.lote_id !== loteId));
    setAdjustmentData({
      ...adjustmentData,
      ajustes: adjustmentData.ajustes.filter(a => a.lote_id !== loteId)
    });
  };

  const updateAdjustmentQuantity = (loteId: number, cantidad: number) => {
    const updatedAjustes = adjustmentData.ajustes.map(ajuste =>
      ajuste.lote_id === loteId ? { ...ajuste, cantidad_nueva: cantidad } : ajuste
    );
    setAdjustmentData({
      ...adjustmentData,
      ajustes: updatedAjustes
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adjustmentData.ajustes.length === 0) {
      toast.error('Debe agregar al menos un lote para ajustar');
      return;
    }

    createAdjustmentMutation.mutate(adjustmentData);
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

  const getAdjustmentType = (antes: number, despues: number) => {
    if (despues > antes) return { type: 'increase', text: 'Incremento', color: 'text-green-600' };
    if (despues < antes) return { type: 'decrease', text: 'Reducción', color: 'text-red-600' };
    return { type: 'none', text: 'Sin cambio', color: 'text-gray-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajustes de Inventario</h1>
          <p className="text-sm text-gray-600">
            Gestiona correcciones y ajustes manuales del inventario
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Ajuste</span>
        </button>
      </div>

      {/* Stats Cards */}
      {adjustmentsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ajustes</p>
                <p className="text-2xl font-bold text-gray-900">{adjustmentsData.pagination.totalItems}</p>
              </div>
              <Edit3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Este Mes</p>
                <p className="text-2xl font-bold text-green-600">
                  {adjustmentsData.ajustes.filter(a => 
                    new Date(a.fecha).getMonth() === new Date().getMonth()
                  ).length}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio Semanal</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(adjustmentsData.pagination.totalItems / 4)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Adjustments Table */}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Usuario</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Motivo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Ajustes</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adjustmentsData?.ajustes.map((adjustment) => (
                  <tr key={adjustment.ajuste_id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      ADJ-{adjustment.ajuste_id.toString().padStart(6, '0')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatDate(adjustment.fecha)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {adjustment.usuario_nombre}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                      {adjustment.motivo}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {adjustment.total_ajustes} lotes
                    </td>
                    <td className="py-3 px-4">
                      <button className="p-1 text-blue-600 hover:text-blue-700 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustmentsData?.ajustes.length === 0 && (
        <div className="text-center py-12">
          <Edit3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ajustes registrados</h3>
          <p className="text-gray-500">
            Los ajustes de inventario aparecerán aquí cuando se realicen.
          </p>
        </div>
      )}

      {/* Modal para crear ajuste */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nuevo Ajuste de Inventario</h2>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo del Ajuste *
                  </label>
                  <select
                    required
                    value={adjustmentData.motivo}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, motivo: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Seleccionar motivo</option>
                    <option value="Conteo físico">Conteo físico</option>
                    <option value="Producto dañado">Producto dañado</option>
                    <option value="Producto vencido">Producto vencido</option>
                    <option value="Error de sistema">Error de sistema</option>
                    <option value="Robo o pérdida">Robo o pérdida</option>
                    <option value="Devolución proveedor">Devolución proveedor</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar Lotes
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar por producto o lote..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={adjustmentData.observaciones}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Búsqueda de lotes */}
              {inventoryData && searchTerm.length > 2 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Lotes Disponibles</h4>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    {inventoryData.inventario.map((item) => (
                      <div
                        key={item.lote_id}
                        className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => addLoteToAdjustment(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.producto_nombre}</p>
                            <p className="text-sm text-gray-600">{item.presentacion}</p>
                            <p className="text-sm text-gray-600">Lote: {item.lote_codigo}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Stock: {item.cantidad_disponible}</p>
                            <p className="text-sm text-gray-600">{formatCurrency(item.precio_compra)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lotes seleccionados para ajuste */}
              {selectedLotes.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Lotes a Ajustar</h4>
                  <div className="space-y-4">
                    {selectedLotes.map((lote, index) => {
                      const ajuste = adjustmentData.ajustes.find(a => a.lote_id === lote.lote_id);
                      const adjustment = getAdjustmentType(lote.cantidad_disponible, ajuste?.cantidad_nueva || 0);
                      
                      return (
                        <div key={lote.lote_id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-medium text-gray-900">{lote.producto_nombre}</p>
                              <p className="text-sm text-gray-600">{lote.presentacion}</p>
                              <p className="text-sm text-gray-600">Lote: {lote.lote_codigo}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLoteFromAdjustment(lote.lote_id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cantidad Actual
                              </label>
                              <input
                                type="number"
                                value={lote.cantidad_disponible}
                                disabled
                                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nueva Cantidad *
                              </label>
                              <input
                                type="number"
                                min="0"
                                required
                                value={ajuste?.cantidad_nueva || 0}
                                onChange={(e) => updateAdjustmentQuantity(lote.lote_id, parseInt(e.target.value) || 0)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Diferencia
                              </label>
                              <div className={`p-2 rounded-lg bg-gray-50 ${adjustment.color}`}>
                                <p className="text-sm font-medium">
                                  {ajuste ? (ajuste.cantidad_nueva - lote.cantidad_disponible > 0 ? '+' : '') : ''}
                                  {ajuste ? ajuste.cantidad_nueva - lote.cantidad_disponible : 0}
                                </p>
                                <p className="text-xs">{adjustment.text}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  disabled={createAdjustmentMutation.isLoading || selectedLotes.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {createAdjustmentMutation.isLoading ? 'Creando...' : 'Crear Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdjustmentsPage;