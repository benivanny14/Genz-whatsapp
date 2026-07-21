import React, { useState, useEffect } from 'react';
import { Building2, Store, Package, ShoppingCart, Star, Clock, MapPin, Phone, Mail, Globe, Edit, Plus, Trash2, Settings, TrendingUp, Users, CreditCard, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BusinessProfileManager = ({ businessProfile, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    businessName: businessProfile?.businessName || '',
    category: businessProfile?.category || '',
    description: businessProfile?.description || '',
    address: businessProfile?.address || '',
    email: businessProfile?.email || '',
    phone: businessProfile?.phone || '',
    website: businessProfile?.website || '',
    hours: businessProfile?.hours || '',
  });

  const [products, setProducts] = useState(businessProfile?.products || []);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    description: '',
    image: '',
    category: ''
  });

  const categories = [
    'Retail', 'Food & Beverage', 'Services', 'Technology', 'Healthcare',
    'Education', 'Entertainment', 'Fashion', 'Automotive', 'Other'
  ];

  const handleSave = () => {
    onUpdate({
      ...businessProfile,
      ...formData,
      products
    });
    setIsEditing(false);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;

    const product = {
      id: Date.now(),
      ...newProduct,
      price: parseFloat(newProduct.price)
    };

    setProducts([...products, product]);
    setShowProductModal(false);
    setNewProduct({ name: '', price: '', description: '', image: '', category: '' });
  };

  const handleDeleteProduct = (productId) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Building2 className="text-[#00a884]" size={24} />
            <h2 className="text-white text-xl font-semibold">Business Profile</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[#00a884] hover:text-[#008f72] transition-colors flex items-center gap-2"
              >
                <Edit size={20} />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                    <MapPin size={16} />
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                    <Phone size={16} />
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                    <Globe size={16} />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                  <Clock size={16} />
                  Business Hours
                </label>
                <input
                  type="text"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                  className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-6">
              {/* Business Info Card */}
              <div className="bg-[#0b141a] rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 bg-[#00a884]/20 rounded-lg flex items-center justify-center">
                    <Building2 size={40} className="text-[#00a884]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white text-xl font-semibold">{formData.businessName}</h3>
                    <p className="text-[#00a884] text-sm">{formData.category}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle size={16} className="text-[#00a884]" />
                      <span className="text-gray-400 text-sm">Verified Business</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-300">{formData.description}</p>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {formData.address && (
                  <div className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3">
                    <MapPin className="text-[#00a884]" size={20} />
                    <div>
                      <p className="text-gray-400 text-xs">Address</p>
                      <p className="text-white text-sm">{formData.address}</p>
                    </div>
                  </div>
                )}
                {formData.phone && (
                  <div className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3">
                    <Phone className="text-[#00a884]" size={20} />
                    <div>
                      <p className="text-gray-400 text-xs">Phone</p>
                      <p className="text-white text-sm">{formData.phone}</p>
                    </div>
                  </div>
                )}
                {formData.email && (
                  <div className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3">
                    <Mail className="text-[#00a884]" size={20} />
                    <div>
                      <p className="text-gray-400 text-xs">Email</p>
                      <p className="text-white text-sm">{formData.email}</p>
                    </div>
                  </div>
                )}
                {formData.website && (
                  <div className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3">
                    <Globe className="text-[#00a884]" size={20} />
                    <div>
                      <p className="text-gray-400 text-xs">Website</p>
                      <p className="text-white text-sm truncate">{formData.website}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Business Hours */}
              {formData.hours && (
                <div className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3">
                  <Clock className="text-[#00a884]" size={20} />
                  <div>
                    <p className="text-gray-400 text-xs">Business Hours</p>
                    <p className="text-white text-sm">{formData.hours}</p>
                  </div>
                </div>
              )}

              {/* Products Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Package size={20} />
                    Products & Services
                  </h3>
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="text-[#00a884] hover:text-[#008f72] transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Product
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {products.map(product => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#0b141a] rounded-lg overflow-hidden"
                    >
                      {product.image && (
                        <div className="h-32 bg-[#00a884]/10 flex items-center justify-center">
                          <Package size={32} className="text-[#00a884]/50" />
                        </div>
                      )}
                      <div className="p-4">
                        <h4 className="text-white font-medium mb-1">{product.name}</h4>
                        <p className="text-[#00a884] font-semibold mb-2">${product.price.toFixed(2)}</p>
                        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{product.description}</p>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {products.length === 0 && (
                  <div className="text-center py-12 bg-[#0b141a] rounded-lg">
                    <Package className="text-gray-600 mx-auto mb-4" size={48} />
                    <p className="text-gray-400">No products yet</p>
                    <button
                      onClick={() => setShowProductModal(true)}
                      className="mt-4 text-[#00a884] hover:underline"
                    >
                      Add your first product
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
              <h3 className="text-white text-xl font-semibold mb-4">Add Product</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Product Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Price</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddProduct}
                    disabled={!newProduct.name || !newProduct.price}
                    className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    Add Product
                  </button>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Order Management Component
export const OrderManager = ({ orders, onUpdateOrder, onCreateOrder }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-blue-500/20 text-blue-400',
      processing: 'bg-purple-500/20 text-purple-400',
      shipped: 'bg-orange-500/20 text-orange-400',
      delivered: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ShoppingCart size={20} />
          Orders
        </h3>
        <button
          onClick={() => setShowOrderModal(true)}
          className="text-[#00a884] hover:text-[#008f72] transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          New Order
        </button>
      </div>

      <div className="space-y-3">
        {orders.map(order => (
          <div
            key={order.id}
            className="bg-[#0b141a] rounded-lg p-4 hover:bg-[#1a2e35] transition-colors cursor-pointer"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-medium">Order #{order.id}</p>
                <p className="text-gray-400 text-sm">{order.customerName}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[#00a884] font-semibold">${order.total.toFixed(2)}</p>
              <p className="text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 bg-[#0b141a] rounded-lg">
          <ShoppingCart className="text-gray-600 mx-auto mb-4" size={48} />
          <p className="text-gray-400">No orders yet</p>
        </div>
      )}
    </div>
  );
};

// Business Analytics Component
export const BusinessAnalytics = ({ data }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <BarChart3 size={20} />
        Analytics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0b141a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-[#00a884]" size={18} />
            <p className="text-gray-400 text-sm">Total Customers</p>
          </div>
          <p className="text-white text-2xl font-bold">{data?.totalCustomers || 0}</p>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <TrendingUp size={12} />
            +12% this month
          </p>
        </div>

        <div className="bg-[#0b141a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="text-[#00a884]" size={18} />
            <p className="text-gray-400 text-sm">Total Orders</p>
          </div>
          <p className="text-white text-2xl font-bold">{data?.totalOrders || 0}</p>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <TrendingUp size={12} />
            +8% this month
          </p>
        </div>

        <div className="bg-[#0b141a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="text-[#00a884]" size={18} />
            <p className="text-gray-400 text-sm">Revenue</p>
          </div>
          <p className="text-white text-2xl font-bold">${(data?.revenue || 0).toFixed(2)}</p>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <TrendingUp size={12} />
            +15% this month
          </p>
        </div>

        <div className="bg-[#0b141a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-[#00a884]" size={18} />
            <p className="text-gray-400 text-sm">Rating</p>
          </div>
          <p className="text-white text-2xl font-bold">{data?.rating || 0}</p>
          <p className="text-gray-400 text-xs">{data?.reviews || 0} reviews</p>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfileManager;
