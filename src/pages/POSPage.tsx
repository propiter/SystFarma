import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Minus, ShoppingCart, Receipt, Search } from 'lucide-react';
import { productService } from '../services/productService';
import { salesService, CreateSaleData } from '../services/salesService';
import toast from 'react-hot-toast';

interface CartItem {
  producto_id: number;
  lote_id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  stock_disponible: number;
  lote_codigo: string;
}

const POSPage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'>('efectivo');
  const [paymentAmounts, setPaymentAmounts] = useState({
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();

  // Query para buscar productos
  const { data: productsData, isLoading: loadingProducts } = useQuery(
    ['products-pos', searchTerm],
    () => productService.getProducts({ 
      search: searchTerm, 
      limit: 20,
      estado: 'true'
    }),
    { 
      enabled: searchTerm.length > 2,
      keepPreviousData: true 
    }
  );

  // Mutación para crear venta
  const createSaleMutation = useMutation(salesService.createSale, {
    onSuccess: () => {
      toast.success('Venta procesada exitosamente');
      setCart([]);
      setPaymentAmounts({ efectivo: 0, tarjeta: 0, transferencia: 0 });
      queryClient.invalidateQueries('products');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al procesar la venta');
    }
  });

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.19; // 19% IVA
  const total = subtotal + tax;

  const addToCart = (product: any) => {
    // Por simplicidad, usamos el primer lote disponible
    // En una implementación real, deberías mostrar los lotes disponibles
    const existingItem = cart.find(item => item.producto_id === product.producto_id);
    
    if (existingItem) {
      if (existingItem.cantidad < existingItem.stock_disponible) {
        setCart(cart.map(item => 
          item.producto_id === product.producto_id 
            ? { 
                ...item, 
                cantidad: item.cantidad + 1, 
                subtotal: (item.cantidad + 1) * item.precio_unitario 
              }
            : item
        ));
      } else {
        toast.error('Stock insuficiente');
      }
    } else {
      // Necesitarías obtener información del lote aquí
      // Por ahora usamos datos simulados
      const newItem: CartItem = {
        producto_id: product.producto_id,
        lote_id: 1, // Esto debería venir de la selección de lote
        nombre: product.nombre,
        precio_unitario: product.precio_venta,
        cantidad: 1,
        subtotal: product.precio_venta,
        stock_disponible: product.stock,
        lote_codigo: 'LOT-001' // Esto debería venir del lote seleccionado
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (producto_id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.producto_id !== producto_id));
    } else {
      setCart(cart.map(item => 
        item.producto_id === producto_id 
          ? { 
              ...item, 
              cantidad: Math.min(newQuantity, item.stock_disponible), 
              subtotal: Math.min(newQuantity, item.stock_disponible) * item.precio_unitario 
            }
          : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setIsProcessing(true);
    
    try {
      const saleData: CreateSaleData = {
        items: cart.map(item => ({
          producto_id: item.producto_id,
          lote_id: item.lote_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          descuento: 0,
          impuesto: 19
        })),
        metodo_pago: paymentMethod,
        monto_efectivo: paymentMethod === 'efectivo' || paymentMethod === 'mixto' ? paymentAmounts.efectivo : 0,
        monto_tarjeta: paymentMethod === 'tarjeta' || paymentMethod === 'mixto' ? paymentAmounts.tarjeta : 0,
        monto_transferencia: paymentMethod === 'transferencia' || paymentMethod === 'mixto' ? paymentAmounts.transferencia : 0,
        cambio: paymentMethod === 'efectivo' ? Math.max(paymentAmounts.efectivo - total, 0) : 0
      };

      await createSaleMutation.mutateAsync(saleData);
    } catch (error) {
      // Error manejado por la mutación
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Productos Panel */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Punto de Venta</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {loadingProducts && searchTerm.length > 2 && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Buscando productos...</p>
          </div>
        )}

        {searchTerm.length > 2 && productsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productsData.productos.map((product) => (
              <div
                key={product.producto_id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => addToCart(product)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-sm">{product.nombre}</h3>
                  <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{product.presentacion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(product.precio_venta)}
                  </span>
                  <button className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchTerm.length <= 2 && (
          <div className="text-center py-12 text-gray-500">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Escribe al menos 3 caracteres para buscar productos</p>
          </div>
        )}
      </div>

      {/* Carrito Panel */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        {/* Header del carrito */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Carrito</h2>
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Carrito vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.producto_id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{item.nombre}</h4>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}
                        className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}
                        className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatCurrency(item.precio_unitario)} c/u
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen y pago */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4">
            {/* Totales */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (19%):</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

            {/* Campos de pago según método */}
            {paymentMethod === 'efectivo' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Recibido
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmounts.efectivo}
                  onChange={(e) => setPaymentAmounts({ ...paymentAmounts, efectivo: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {paymentAmounts.efectivo > total && (
                  <p className="text-sm text-green-600 mt-1">
                    Cambio: {formatCurrency(paymentAmounts.efectivo - total)}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === 'mixto' && (
              <div className="mb-4 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Efectivo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmounts.efectivo}
                    onChange={(e) => setPaymentAmounts({ ...paymentAmounts, efectivo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmounts.tarjeta}
                    onChange={(e) => setPaymentAmounts({ ...paymentAmounts, tarjeta: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transferencia</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmounts.transferencia}
                    onChange={(e) => setPaymentAmounts({ ...paymentAmounts, transferencia: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}

            {/* Botón de procesamiento */}
            <button
              onClick={processSale}
              disabled={isProcessing || createSaleMutation.isLoading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isProcessing || createSaleMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Procesar Venta</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default POSPage;