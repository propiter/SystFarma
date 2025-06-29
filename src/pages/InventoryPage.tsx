import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { AlertTriangle, Package, Calendar, Search, Filter, Plus } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';

const InventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Query para obtener inventario
  const { data: inventoryData, isLoading, error } = useQuery(
    ['inventory', { page: currentPage, search: searchTerm, estado_vencimiento: selectedFilter === 'todos' ? '' : selectedFilter }],
    () => inventoryService.getInventory({
      page: currentPage,
      limit: 50,
      search: searchTerm,
      estado_vencimiento: selectedFilter === 'todos' ? '' : selectedFilter
    }),
    { keepPreviousData: true }
  );

  const getExpirationColor = (estado: string) => {
    switch (estado) {
      case 'rojo': return 'bg-red-100 text-red-800 border-red-200';
      case 'amarillo': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'verde': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getExpirationText = (estado: string) => {
    switch (estado) {
      case 'rojo': return 'Crítico (≤ 6 meses)';
      case 'amarillo': return 'Próximo (7-12 meses)';
      case 'verde': return 'Normal (> 12 meses)';
      default: return 'Desconocido';
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
        <div className="text-red-600 mb-4">Error al cargar inventario</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-600">
            Control de stock y fechas de vencimiento por lotes
          </p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Agregar Lote</span>
        </button>
      </div>

      {/* Stats Cards */}
      {inventoryData?.estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(inventoryData.estadisticas.valor_total_inventario)}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lotes</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryData.estadisticas.total_lotes}</p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Críticos</p>
                <p className="text-2xl font-bold text-red-600">{inventoryData.estadisticas.lotes_criticos}</p>
                <p className="text-xs text-red-500">≤ 6 meses</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Advertencia</p>
                <p className="text-2xl font-bold text-yellow-600">{inventoryData.estadisticas.lotes_advertencia}</p>
                <p className="text-xs text-yellow-500">7-12 meses</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-500" />
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
              placeholder="Buscar por producto o lote..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="rojo">Crítico</option>
              <option value="amarillo">Advertencia</option>
              <option value="verde">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Lote</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha Vencimiento</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Cantidad</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Precio Compra</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventoryData?.inventario.map((item) => (
                  <tr key={item.lote_id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.producto_nombre}</p>
                          <p className="text-sm text-gray-500">{item.presentacion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-900">
                      {item.lote_codigo}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(item.fecha_vencimiento).toLocaleDateString('es-CO')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.dias_vencimiento > 0 
                            ? `${Math.floor(item.dias_vencimiento)} días` 
                            : 'Vencido'
                          }
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {item.cantidad_disponible.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatCurrency(item.precio_compra)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getExpirationColor(item.estado_vencimiento)}`}>
                        {getExpirationText(item.estado_vencimiento)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {formatCurrency(item.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {inventoryData && inventoryData.pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * inventoryData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(currentPage * inventoryData.pagination.itemsPerPage, inventoryData.pagination.totalItems)} de{' '}
                {inventoryData.pagination.totalItems} lotes
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, inventoryData.pagination.totalPages))}
                  disabled={currentPage === inventoryData.pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Código de Colores:</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Crítico: Vence en 6 meses o menos</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Advertencia: Vence entre 7-12 meses</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Normal: Vence en más de 12 meses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;