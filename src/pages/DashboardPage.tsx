import React from 'react';
import { useQuery } from 'react-query';
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';

const DashboardPage: React.FC = () => {
  const { data: metrics, isLoading: loadingMetrics } = useQuery(
    'dashboard-metrics',
    dashboardService.getMetrics,
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  const { data: alerts, isLoading: loadingAlerts } = useQuery(
    'dashboard-alerts',
    dashboardService.getAlerts,
    { refetchInterval: 60000 } // Refresh every minute
  );

  const getExpirationColor = (priority: string) => {
    switch (priority) {
      case 'rojo': return 'bg-red-100 text-red-800 border-red-200';
      case 'amarillo': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'verde': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (loadingMetrics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Resumen general del sistema - {new Date().toLocaleDateString('es-CO')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Sistema activo</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/products" className="group">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.metricas?.totalProductos || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-blue-600 text-sm">
              <span>Ver productos</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link to="/pos" className="group">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.metricas?.ventasHoy?.cantidad || 0}
                </p>
                <p className="text-sm text-green-600">
                  {formatCurrency(metrics?.metricas?.ventasHoy?.monto || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-green-600 text-sm">
              <span>Nueva venta</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link to="/inventory" className="group">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Próximos a Vencer</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.metricas?.productosVencimiento || 0}
                </p>
                <p className="text-sm text-red-600">≤ 6 meses</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <span>Ver inventario</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link to="/inventory" className="group">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.metricas?.stockBajo || 0}
                </p>
                <p className="text-sm text-orange-600">Requiere reposición</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-orange-600 text-sm">
              <span>Gestionar stock</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* Charts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Semanales */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ventas de la Semana</h3>
            <Link to="/sales" className="text-green-600 hover:text-green-700 text-sm flex items-center">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {metrics?.ventasSemanales?.length > 0 ? (
              metrics.ventasSemanales.map((venta: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(venta.fecha)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {venta.total_ventas} ventas
                    </p>
                    <p className="text-xs text-green-600">
                      {formatCurrency(venta.total_monto)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay ventas registradas</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertas de Vencimiento */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alertas de Vencimiento</h3>
            <Link to="/inventory" className="text-red-600 hover:text-red-700 text-sm flex items-center">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts?.alertasVencimiento?.length > 0 ? (
              alerts.alertasVencimiento.slice(0, 5).map((alerta: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border ${getExpirationColor(alerta.prioridad)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{alerta.nombre}</p>
                      <p className="text-xs opacity-75">{alerta.presentacion}</p>
                      <p className="text-xs opacity-75">Lote: {alerta.lote_codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {alerta.dias_vencimiento > 0 
                          ? `${Math.floor(alerta.dias_vencimiento)} días`
                          : 'Vencido'
                        }
                      </p>
                      <p className="text-xs opacity-75">
                        Stock: {alerta.cantidad_disponible}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay alertas de vencimiento</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Productos más vendidos */}
      {metrics?.productosVendidos?.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos Hoy</h3>
            <Link to="/reports" className="text-blue-600 hover:text-blue-700 text-sm flex items-center">
              Ver reportes <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.productosVendidos.slice(0, 6).map((producto: any, index: number) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{producto.nombre}</h4>
                  <span className="text-xs text-gray-500">{producto.presentacion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vendido: {producto.cantidad_vendida}</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(producto.total_vendido)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Bajo */}
      {alerts?.stockBajo?.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Productos con Stock Bajo</h3>
            <Link to="/inventory" className="text-orange-600 hover:text-orange-700 text-sm flex items-center">
              Gestionar <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.stockBajo.slice(0, 6).map((producto: any, index: number) => (
              <div key={index} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{producto.nombre}</h4>
                  <span className="text-xs text-orange-600 font-medium">¡Bajo!</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock: {producto.stock}</span>
                  <span className="text-sm text-gray-600">Mín: {producto.stock_minimo}</span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((producto.stock / producto.stock_minimo) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/pos" className="group">
            <div className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
              <ShoppingCart className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-600 text-center">Nueva Venta</p>
            </div>
          </Link>
          
          <Link to="/products" className="group">
            <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-600 text-center">Agregar Producto</p>
            </div>
          </Link>
          
          <Link to="/reports" className="group">
            <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
              <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-purple-600 text-center">Ver Reportes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;