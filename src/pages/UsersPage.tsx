import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, User, Shield, UserCheck, X, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { userService, CreateUserData, UpdateUserData } from '../services/userService';
import toast from 'react-hot-toast';

const UsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CreateUserData>({
    nombre: '',
    correo: '',
    rol: 'cajero'
  });

  const queryClient = useQueryClient();

  // Query para obtener usuarios
  const { data: usersData, isLoading, error } = useQuery(
    ['users', { page: currentPage, search: searchTerm, rol: selectedRole }],
    () => userService.getUsers({
      page: currentPage,
      limit: 20,
      search: searchTerm,
      rol: selectedRole
    }),
    { keepPreviousData: true }
  );

  // Query para estadísticas
  const { data: statsData } = useQuery(
    'user-stats',
    userService.getUserStats
  );

  // Mutación para crear usuario
  const createUserMutation = useMutation(userService.createUser, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('users');
      queryClient.invalidateQueries('user-stats');
      toast.success('Usuario creado exitosamente');
      if (data.contraseña_temporal) {
        toast.success(`Contraseña temporal: ${data.contraseña_temporal}`, { duration: 8000 });
      }
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear usuario');
    }
  });

  // Mutación para actualizar usuario
  const updateUserMutation = useMutation(
    ({ id, data }: { id: number; data: UpdateUserData }) => 
      userService.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries('user-stats');
        toast.success('Usuario actualizado exitosamente');
        setShowModal(false);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar usuario');
      }
    }
  );

  // Mutación para eliminar usuario
  const deleteUserMutation = useMutation(userService.deleteUser, {
    onSuccess: () => {
      queryClient.invalidateQueries('users');
      queryClient.invalidateQueries('user-stats');
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario');
    }
  });

  // Mutación para cambiar estado
  const toggleStatusMutation = useMutation(userService.toggleUserStatus, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('users');
      queryClient.invalidateQueries('user-stats');
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    }
  });

  const resetForm = () => {
    setFormData({
      nombre: '',
      correo: '',
      rol: 'cajero'
    });
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.usuario_id, data: formData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      estado: user.estado
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate(id);
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'cajero': return 'Cajero';
      case 'bodega': return 'Bodega';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'cajero': return 'bg-blue-100 text-blue-800';
      case 'bodega': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'cajero': return User;
      case 'bodega': return UserCheck;
      default: return User;
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-CO'),
      time: date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error al cargar usuarios</div>
        <button 
          onClick={() => queryClient.invalidateQueries('users')}
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
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-600">
            Gestiona usuarios y permisos del sistema
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Usuario</span>
        </button>
      </div>

      {/* Stats Cards */}
      {statsData?.estadisticasGenerales && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.estadisticasGenerales.total_usuarios}</p>
              </div>
              <User className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">{statsData.estadisticasGenerales.usuarios_activos}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-purple-600">{statsData.estadisticasGenerales.total_admins}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cajeros</p>
                <p className="text-2xl font-bold text-blue-600">{statsData.estadisticasGenerales.total_cajeros}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bodega</p>
                <p className="text-2xl font-bold text-green-600">{statsData.estadisticasGenerales.total_bodega}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
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
              placeholder="Buscar usuarios..."
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
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="cajero">Cajero</option>
              <option value="bodega">Bodega</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Usuario</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Correo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Rol</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Último Acceso</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha Creación</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersData?.usuarios.map((user) => {
                  const RoleIcon = getRoleIcon(user.rol);
                  const lastAccess = formatDateTime(user.ultimo_acceso || '');
                  
                  return (
                    <tr key={user.usuario_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.nombre.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.nombre}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {user.correo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <RoleIcon className="w-4 h-4" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.rol)}`}>
                            {getRoleText(user.rol)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.estado 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.estado ? 'Activo' : 'Inactivo'}
                          </span>
                          <button
                            onClick={() => handleToggleStatus(user.usuario_id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {user.estado ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {typeof lastAccess === 'object' ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{lastAccess.date}</p>
                            <p className="text-xs text-gray-500">{lastAccess.time}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{lastAccess}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatDate(user.fecha_creacion)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.usuario_id)}
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
          {usersData && usersData.pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * usersData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(currentPage * usersData.pagination.itemsPerPage, usersData.pagination.totalItems)} de{' '}
                {usersData.pagination.totalItems} usuarios
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, usersData.pagination.totalPages))}
                  disabled={currentPage === usersData.pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {usersData?.usuarios.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
          <p className="text-gray-500">
            No hay usuarios que coincidan con tu búsqueda.
          </p>
        </div>
      )}

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  required
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="cajero">Cajero</option>
                  <option value="bodega">Bodega</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña (opcional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.contraseña || ''}
                      onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                      placeholder="Se generará automáticamente si se deja vacío"
                      className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Si no especificas una contraseña, se generará una automáticamente
                  </p>
                </div>
              )}

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
                  disabled={createUserMutation.isLoading || updateUserMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {createUserMutation.isLoading || updateUserMutation.isLoading
                    ? 'Guardando...'
                    : editingUser ? 'Actualizar' : 'Crear'
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

export default UsersPage;