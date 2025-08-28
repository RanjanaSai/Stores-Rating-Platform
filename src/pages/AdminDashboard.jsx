import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import * as service from '../services/supabaseService';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import StarRating from '../components/StarRating';
import { Users, Store, Star, Plus } from 'lucide-react';

function AdminDashboard() {
  const { user, createUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, storesData] = await Promise.all([
        service.getAllUsers(),
        service.getAllStoresWithRatings()
      ]);
      setUsers(usersData);
      setStores(storesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddUser = async (userData) => {
    await createUser(userData);
    await loadData();
    setShowAddUser(false);
  };

  // const handleAddStore = async (storeData) => {
  //   await service.createStore(storeData);
  //   await loadData();
  //   setShowAddStore(false);
  // };
  const handleAddStore = async (storeData) => {
    try {
      const result = await service.createStore(storeData);
      console.log('Created store:', result);
      await loadData();
      setShowAddStore(false);
    } catch (err) {
      console.error('Failed to add store:', err);
      alert(err.message); // Or show in UI
    }
  };

  const normalize = (val) => (val || '').toLowerCase();

  const filteredUsers = users.filter(u => {
    const searchLower = filters.search.toLowerCase();
    if (filters.search && !normalize(u.name).includes(searchLower) &&
      !normalize(u.email).includes(searchLower) &&
      !normalize(u.address).includes(searchLower)) return false;
    if (filters.role && u.role !== filters.role) return false;
    return true;
  }).sort((a, b) => {
    const valA = (a[filters.sortBy] || '').toString().toLowerCase();
    const valB = (b[filters.sortBy] || '').toString().toLowerCase();
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    return valA.localeCompare(valB) * order;
  });


  const filteredStores = stores.filter(s => {
    const searchLower = filters.search.toLowerCase();
    if (filters.search && !s.name.toLowerCase().includes(searchLower) &&
      !s.email.toLowerCase().includes(searchLower) &&
      !s.address.toLowerCase().includes(searchLower)) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    const valA = a[filters.sortBy] || '';
    const valB = b[filters.sortBy] || '';
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    return valA.localeCompare(valB) * order;
  });

  const totalRatings = stores.reduce((total, store) => total + store.totalRatings, 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'stores', label: 'Stores', icon: Store }
  ];

  const storeOwners = users.filter(u => u.role === 'store_owner');

  return (
    <DashboardLayout user={user} title="Admin Dashboard">
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={Users} title="Total Users" value={users.length} color="blue" />
            <StatCard icon={Store} title="Total Stores" value={stores.length} color="green" />
            <StatCard icon={Star} title="Total Ratings" value={totalRatings} color="yellow" />
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium text-gray-900">Users Management</h3>
              <Button onClick={() => setShowAddUser(true)} variant="primary" className="mt-2 sm:mt-0">
                <Plus className="w-4 h-4 mr-2" /> Add User
              </Button>
            </div>
            <UsersTable users={filteredUsers} filters={filters} setFilters={setFilters} />
          </motion.div>
        )}

        {activeTab === 'stores' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium text-gray-900">Stores Management</h3>
              <Button onClick={() => setShowAddStore(true)} variant="primary" className="mt-2 sm:mt-0">
                <Plus className="w-4 h-4 mr-2" /> Add Store
              </Button>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <FormInput label="Search Stores" type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search by name, email, or address" />
            </div>
            <StoresGrid stores={filteredStores} />
          </motion.div>
        )}

        {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onSubmit={handleAddUser} />}
        {showAddStore && <AddStoreModal onClose={() => setShowAddStore(false)} onSubmit={handleAddStore} storeOwners={storeOwners} />}
      </div>
    </DashboardLayout>
  );
}

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border">
    <div className="flex items-center">
      <div className={`p-3 bg-${color}-100 rounded-lg`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const UsersTable = ({ users, filters, setFilters }) => (
  <>
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormInput label="Search" type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search users..." />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="store_owner">Store Owner</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="role">Role</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
          <select value={filters.sortOrder} onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
    </div>
    <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{user.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'store_owner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

const StoresGrid = ({ stores }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {stores.map((store) => (
      <div key={store.id} className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-900 mb-2 truncate">{store.name}</h4>
        <p className="text-sm text-gray-600 mb-1 truncate">{store.email}</p>
        <p className="text-sm text-gray-600 mb-3 truncate">{store.address}</p>
        <div className="flex items-center justify-between">
          <StarRating rating={store.averageRating} readonly />
          <span className="text-xs text-gray-500">{store.totalRatings} rating{store.totalRatings !== 1 ? 's' : ''}</span>
        </div>
      </div>
    ))}
  </div>
);

function AddUserModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', address: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim() || formData.name.length < 20 || formData.name.length > 60) newErrors.name = 'Name must be 20-60 characters';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.address.trim() || formData.address.length > 400) newErrors.address = 'Address is required (max 400 characters)';
    if (!formData.password || formData.password.length < 8 || formData.password.length > 16 || !/(?=.*[A-Z])/.test(formData.password) || !/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password)) newErrors.password = 'Password must be 8-16 chars with uppercase and special character';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ general: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={errors.name} required />
          <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={errors.email} required />
          <FormInput label="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} error={errors.password} required />
          <FormInput label="Address" type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} error={errors.address} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="store_owner">Store Owner</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">Add User</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AddStoreModal({ onClose, onSubmit, storeOwners }) {
  const [formData, setFormData] = useState({ name: '', email: '', address: '', owner_id: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Store name is required';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.owner_id) newErrors.owner_id = 'You must assign an owner';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ general: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New Store</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Store Name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={errors.name} required />
          <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={errors.email} required />
          <FormInput label="Address" type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} error={errors.address} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Owner
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={formData.owner_id}
              onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.owner_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select an owner...</option>
              {storeOwners.map(owner => (
                <option key={owner.id} value={owner.id}>{owner.name} ({owner.email})</option>
              ))}
            </select>
            {errors.owner_id && <p className="text-sm text-red-600 mt-1">{errors.owner_id}</p>}
            {storeOwners.length === 0 && <p className="text-sm text-gray-500 mt-1">No store owners found. Please create a user with the 'Store Owner' role first.</p>}
          </div>
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={storeOwners.length === 0} className="flex-1">Add Store</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default AdminDashboard;
