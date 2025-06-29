import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Search, Filter, Receipt, Eye, Calendar } from 'lucide-react';
import { salesService } from '../services/salesService';

const SalesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('hoy');
  const [currentPage, setCurrentPage] = useState(1);

  // Calcular fechas según el filtro
  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (dateFilter) {
      case 'hoy':
        return { fecha_inicio: todayStr, fecha_fin: todayStr };
      case 'semana':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { fecha_inicio: weekAgo.toISOString().split('T')[0], fecha_fin: todayStr };
      case 'mes':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { fecha_inicio: monthAgo.toISOString().split('T')[0], fecha_fin: todayStr };
      default:
        return {};
    }
  };

  // Query para obtener ventas
  const { data: salesData, isLoading, error } = useQuery(
    ['sales', { page: currentPage, search: searchTerm, dateFilter }],
    () => salesService.getSales({
      page: currentPage,
      limit: 50,
      search: searchTerm,
      ...getDateRange()
    }),
    { keepPreviousData: true }
  );

  // Query para obtener estadísticas
  const { data: statsData } = useQuery(
    ['sales-stats', { dateFilter }],
    () => salesService.getEstadisticas(getDateRange())
  );

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta': return 'Tarjeta';
      case 'transferencia': return 'Transferencia';
      case 'mixto': return 'Mixto';
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'efectivo': return 'bg-green-100 text-green-800';
      case 'tarjeta': return 'bg-blue-100 text-blue-800';
      case 'transferencia': return 'bg-purple-100 text-purple-800';
      case 'mixto': return 'bg-yellow-100 text-yellow-800';
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-CO'),
      time: date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error al cargar ventas</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-600">
            Historial y gestión de ventas realizadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {statsData?.estadisticasGenerales && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.estadisticasGenerales.total_ventas}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monto Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(statsData.estadisticasGenerales.monto_total)}
                </p>
              </div>
              <Receipt className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items Vendidos</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.estadisticasGenerales.total_items_vendidos}</p>
              </div>
              <Receipt className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(statsData.estadisticasGenerales.promedio_venta)}
                </p>
              </div>
              <Receipt className="w-8 h-8 text-orange-500" />
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
              placeholder="Buscar por número de venta, cliente o cajero..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Table */}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Número</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Cajero</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Items</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Método Pago</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salesData?.ventas.map((sale) => {
                  const dateTime = formatDateTime(sale.fecha_venta);
                  return (
                    <tr key={sale.venta_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">VT-{sale.venta_id.toString().padStart(6, '0')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{dateTime.date}</p>
                          <p className="text-xs text-gray-500">{dateTime.time}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {sale.cliente_nombre || 'Cliente general'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {sale.cajero_nombre}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {sale.total_items}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(sale.total)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Subtotal: {formatCurrency(sale.subtotal)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentMethodColor(sale.metodo_pago)}`}>
                          {getPaymentMethodText(sale.metodo_pago)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Completada
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-blue-600 hover:text-blue-700 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:text-green-700 transition-colors">
                            <Receipt className="w-4 h-4" />
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
          {salesData && salesData.pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * salesData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(currentPage * salesData.pagination.itemsPerPage, salesData.pagination.totalItems)} de{' '}
                {salesData.pagination.totalItems} ventas
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, salesData.pagination.totalPages))}
                  disabled={currentPage === salesData.pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {salesData?.ventas.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron ventas</h3>
          <p className="text-gray-500">
            No hay ventas que coincidan con los filtros seleccionados.
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesPage;