import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { BarChart3, Download, Calendar, Filter, TrendingUp, Package, DollarSign, FileText, Users } from 'lucide-react';
import { reportService } from '../services/reportService';
import toast from 'react-hot-toast';

const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('ventas');
  const [filters, setFilters] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    usuario_id: '',
    metodo_pago: '',
    categoria: '',
    proveedor_id: '',
    producto_id: ''
  });

  const reportTypes = [
    { id: 'ventas', name: 'Ventas y Utilidades', icon: DollarSign },
    { id: 'inventario', name: 'Estado de Inventario', icon: Package },
    { id: 'proveedores', name: 'Análisis de Proveedores', icon: TrendingUp },
    { id: 'utilidades', name: 'Reporte de Utilidades', icon: BarChart3 },
    { id: 'corte-caja', name: 'Corte de Caja', icon: FileText },
  ];

  // Queries para cada tipo de reporte
  const { data: salesReport, isLoading: loadingSales } = useQuery(
    ['sales-report', filters],
    () => reportService.getSalesReport({
      fecha_inicio: filters.fecha_inicio,
      fecha_fin: filters.fecha_fin,
      usuario_id: filters.usuario_id,
      metodo_pago: filters.metodo_pago
    }),
    { enabled: selectedReport === 'ventas' }
  );

  const { data: inventoryReport, isLoading: loadingInventory } = useQuery(
    ['inventory-report', filters],
    () => reportService.getInventoryReport({
      categoria: filters.categoria,
      proveedor_id: filters.proveedor_id
    }),
    { enabled: selectedReport === 'inventario' }
  );

  const { data: suppliersReport, isLoading: loadingSuppliers } = useQuery(
    ['suppliers-report', filters],
    () => reportService.getSuppliersReport({
      fecha_inicio: filters.fecha_inicio,
      fecha_fin: filters.fecha_fin,
      proveedor_id: filters.proveedor_id
    }),
    { enabled: selectedReport === 'proveedores' }
  );

  const { data: profitReport, isLoading: loadingProfit } = useQuery(
    ['profit-report', filters],
    () => reportService.getProfitReport({
      fecha_inicio: filters.fecha_inicio,
      fecha_fin: filters.fecha_fin,
      categoria: filters.categoria,
      producto_id: filters.producto_id
    }),
    { enabled: selectedReport === 'utilidades' }
  );

  const { data: cashCutReport, isLoading: loadingCashCut } = useQuery(
    ['cash-cut-report', filters],
    () => reportService.getCashCutReport({
      fecha_inicio: filters.fecha_inicio,
      fecha_fin: filters.fecha_fin,
      usuario_id: filters.usuario_id
    }),
    { enabled: selectedReport === 'corte-caja' }
  );

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

  const getExpirationColor = (estado: string) => {
    switch (estado) {
      case 'rojo': return 'bg-red-100 text-red-800';
      case 'amarillo': return 'bg-yellow-100 text-yellow-800';
      case 'verde': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = () => {
    toast.success('Función de exportación en desarrollo');
  };

  const isLoading = loadingSales || loadingInventory || loadingSuppliers || loadingProfit || loadingCashCut;

  const renderSalesReport = () => {
    if (!salesReport) return null;

    return (
      <div className="space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Ventas</h3>
            <p className="text-2xl font-bold text-gray-900">{salesReport.resumen.total_ventas}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Monto Total</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(salesReport.resumen.monto_total)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Promedio por Venta</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(salesReport.resumen.promedio_venta)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Descuentos</h3>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(salesReport.resumen.descuento_total)}</p>
          </div>
        </div>

        {/* Ventas por día */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Día</h3>
          <div className="space-y-3">
            {salesReport.ventasPorDia.map((venta: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{formatDate(venta.fecha)}</p>
                  <p className="text-sm text-gray-600">{venta.total_ventas} ventas</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">{formatCurrency(venta.total_monto)}</p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(venta.total_monto / Math.max(...salesReport.ventasPorDia.map((d: any) => d.total_monto))) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Productos más vendidos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Producto</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Cantidad</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salesReport.ventasPorProducto.map((producto: any, index: number) => (
                  <tr key={index}>
                    <td className="py-2 px-4">{producto.producto_nombre}</td>
                    <td className="py-2 px-4">{producto.cantidad_vendida}</td>
                    <td className="py-2 px-4">{formatCurrency(producto.monto_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    if (!inventoryReport) return null;

    return (
      <div className="space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Productos</h3>
            <p className="text-2xl font-bold text-gray-900">{inventoryReport.resumen.total_productos}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Valor Total</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(inventoryReport.resumen.valor_total_inventario)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Lotes Críticos</h3>
            <p className="text-2xl font-bold text-red-600">{inventoryReport.resumen.lotes_criticos}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Stock Bajo</h3>
            <p className="text-2xl font-bold text-orange-600">{inventoryReport.resumen.productos_stock_bajo}</p>
          </div>
        </div>

        {/* Inventario por categoría */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventario por Categoría</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Categoría</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Productos</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Valor Total</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Stock Bajo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventoryReport.inventarioPorCategoria.map((categoria: any, index: number) => (
                  <tr key={index}>
                    <td className="py-2 px-4 font-medium">{categoria.categoria || 'Sin categoría'}</td>
                    <td className="py-2 px-4">{categoria.total_productos}</td>
                    <td className="py-2 px-4">{formatCurrency(categoria.valor_total)}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        categoria.productos_stock_bajo > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {categoria.productos_stock_bajo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas de vencimiento */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas de Vencimiento</h3>
          <div className="space-y-3">
            {inventoryReport.alertasVencimiento.slice(0, 10).map((alerta: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{alerta.producto_nombre}</p>
                  <p className="text-sm text-gray-600">Lote: {alerta.lote_codigo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatDate(alerta.fecha_vencimiento)}</p>
                  <span className={`px-2 py-1 text-xs rounded-full ${getExpirationColor(alerta.prioridad)}`}>
                    {alerta.dias_vencimiento > 0 ? `${Math.floor(alerta.dias_vencimiento)} días` : 'Vencido'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProfitReport = () => {
    if (!profitReport) return null;

    return (
      <div className="space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Ingresos Totales</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(profitReport.resumen.ingresos_totales)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Costos Totales</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(profitReport.resumen.costos_totales)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Utilidad Bruta</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(profitReport.resumen.utilidad_bruta)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Margen Promedio</h3>
            <p className="text-2xl font-bold text-purple-600">{profitReport.resumen.margen_promedio.toFixed(1)}%</p>
          </div>
        </div>

        {/* Utilidades por producto */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilidades por Producto</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Producto</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Ingresos</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Costos</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Utilidad</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {profitReport.utilidadesPorProducto.slice(0, 10).map((producto: any, index: number) => (
                  <tr key={index}>
                    <td className="py-2 px-4">
                      <div>
                        <p className="font-medium">{producto.producto_nombre}</p>
                        <p className="text-sm text-gray-600">{producto.presentacion}</p>
                      </div>
                    </td>
                    <td className="py-2 px-4">{formatCurrency(producto.ingresos_totales)}</td>
                    <td className="py-2 px-4">{formatCurrency(producto.costos_totales)}</td>
                    <td className="py-2 px-4 font-medium text-green-600">{formatCurrency(producto.utilidad_bruta)}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        producto.margen_porcentaje > 30 ? 'bg-green-100 text-green-800' :
                        producto.margen_porcentaje > 15 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {producto.margen_porcentaje}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCashCutReport = () => {
    if (!cashCutReport) return null;

    return (
      <div className="space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Ventas</h3>
            <p className="text-2xl font-bold text-gray-900">{cashCutReport.resumen.total_ventas}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Efectivo</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(cashCutReport.resumen.total_efectivo)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Tarjeta</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(cashCutReport.resumen.total_tarjeta)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Transferencia</h3>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(cashCutReport.resumen.total_transferencia)}</p>
          </div>
        </div>

        {/* Ventas por método de pago */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Método de Pago</h3>
          <div className="space-y-3">
            {cashCutReport.ventasPorMetodo.map((metodo: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 capitalize">{metodo.metodo_pago}</p>
                  <p className="text-sm text-gray-600">{metodo.total_ventas} ventas</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">{formatCurrency(metodo.monto_total)}</p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(metodo.monto_total / cashCutReport.resumen.monto_total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ventas por usuario */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Cajero</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Cajero</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Ventas</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Monto Total</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cashCutReport.ventasPorUsuario.map((usuario: any, index: number) => (
                  <tr key={index}>
                    <td className="py-2 px-4 font-medium">{usuario.cajero_nombre}</td>
                    <td className="py-2 px-4">{usuario.total_ventas}</td>
                    <td className="py-2 px-4">{formatCurrency(usuario.monto_total)}</td>
                    <td className="py-2 px-4">{formatCurrency(usuario.promedio_venta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      );
    }

    switch (selectedReport) {
      case 'ventas':
        return renderSalesReport();
      case 'inventario':
        return renderInventoryReport();
      case 'proveedores':
        return <div className="text-center py-12 text-gray-500">Reporte de proveedores en desarrollo</div>;
      case 'utilidades':
        return renderProfitReport();
      case 'corte-caja':
        return renderCashCutReport();
      default:
        return <div className="text-center py-12 text-gray-500">Selecciona un tipo de reporte</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-600">
            Análisis detallado y reportes del sistema
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Exportar</span>
        </button>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Reporte
            </label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedReport(type.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedReport === type.id
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{type.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filters.fecha_inicio}
              onChange={(e) => setFilters({ ...filters, fecha_inicio: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={filters.fecha_fin}
              onChange={(e) => setFilters({ ...filters, fecha_fin: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {(selectedReport === 'ventas' || selectedReport === 'corte-caja') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                value={filters.metodo_pago}
                onChange={(e) => setFilters({ ...filters, metodo_pago: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
          )}

          {(selectedReport === 'inventario' || selectedReport === 'utilidades') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={filters.categoria}
                onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas</option>
                <option value="Analgésico">Analgésico</option>
                <option value="Antiinflamatorio">Antiinflamatorio</option>
                <option value="Antihistamínico">Antihistamínico</option>
                <option value="Antibiótico">Antibiótico</option>
                <option value="Vitaminas">Vitaminas</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
};

export default ReportsPage;