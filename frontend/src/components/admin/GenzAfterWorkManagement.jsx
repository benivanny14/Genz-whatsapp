import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';
import {
  DollarSign,
  MapPin,
  Star,
  Eye,
  Mail,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Edit3,
  Trash2,
  Upload,
  Camera,
  Video,
  Check,
  Search,
  Filter
} from 'lucide-react';

const GenzAfterWorkManagement = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [search, setSearch] = useState('');
  
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    price: '',
    maxPrice: '',
    location: '',
    contactInfo: { phone: '', email: '' },
    tags: [],
    specifications: {},
    images: [],
    videos: [],
    isPrivate: false,
    expiresAt: '',
    status: 'active'
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/payment-features?status=all');
      setFeatures(data.data || []);
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    setCreateForm(prev => ({ ...prev, images: [...prev.images, ...files] }));
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert('Maximum 3 videos allowed');
      return;
    }
    setCreateForm(prev => ({ ...prev, videos: [...prev.videos, ...files] }));
  };

  const removeImage = (index) => {
    setCreateForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeVideo = (index) => {
    setCreateForm(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    formData.append('name', createForm.name);
    formData.append('description', createForm.description);
    formData.append('price', createForm.price);
    formData.append('maxPrice', createForm.maxPrice);
    formData.append('location', createForm.location);
    formData.append('contactInfo', JSON.stringify(createForm.contactInfo));
    formData.append('tags', JSON.stringify(createForm.tags));
    formData.append('specifications', JSON.stringify(createForm.specifications));
    formData.append('isPrivate', createForm.isPrivate);
    formData.append('expiresAt', createForm.expiresAt);
    formData.append('status', createForm.status);
    
    createForm.images.forEach((image, index) => {
      formData.append('images', image);
    });
    
    createForm.videos.forEach((video, index) => {
      formData.append('videos', video);
    });

    try {
      const { data } = await adminApi.post('/payment-features', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (data.success) {
        alert('Feature created successfully');
        setShowCreateForm(false);
        setCreateForm({
          name: '',
          description: '',
          price: '',
          maxPrice: '',
          location: '',
          contactInfo: { phone: '', email: '' },
          tags: [],
          specifications: {},
          images: [],
          videos: [],
          isPrivate: false,
          expiresAt: '',
          status: 'active'
        });
        loadFeatures();
      } else {
        alert('Failed to create feature');
      }
    } catch (error) {
      console.error('Error creating feature:', error);
      alert('Error creating feature');
    }
  };

  const handleDelete = async (featureId) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
      const { data } = await adminApi.delete(`/payment-features/${featureId}`);
      if (data.success) {
        alert('Feature deleted successfully');
        loadFeatures();
      } else {
        alert('Failed to delete feature');
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('Error deleting feature');
    }
  };

  const filteredFeatures = features.filter(feature => {
    if (search && !feature.name.toLowerCase().includes(search.toLowerCase()) &&
        !feature.description.toLowerCase().includes(search.toLowerCase()) &&
        !feature.location.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">GENZ AFTER WORK Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          Create Feature
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Create New Feature</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feature Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Luxury Villa with Pool"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the feature..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price (ZAR)</label>
                <input
                  type="number"
                  value={createForm.price}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maximum Price (ZAR)</label>
                <input
                  type="number"
                  value={createForm.maxPrice}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Sandton, Johannesburg"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="featured">Featured</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expires At</label>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Images (Max 5)</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload images</span>
                  </label>
                </div>
                {createForm.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {createForm.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Videos (Max 3)</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Video className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload videos</span>
                  </label>
                </div>
                {createForm.videos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {createForm.videos.map((video, index) => (
                      <div key={index} className="relative">
                        <video
                          src={URL.createObjectURL(video)}
                          className="w-full h-24 object-cover rounded-lg bg-gray-100 dark:bg-gray-800"
                          controls
                        />
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
              >
                Create Feature
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-8 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Features List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin h-12 w-12 text-emerald-600" />
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No features found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or create a new feature</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature) => (
            <div
              key={feature._id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-md overflow-hidden"
            >
              <div className="relative">
                {feature.primaryImage ? (
                  <img
                    src={feature.primaryImage}
                    alt={feature.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {feature.featured && (
                  <span className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    Featured
                  </span>
                )}
                <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  feature.status === 'active' ? 'bg-green-500 text-white' :
                  feature.status === 'featured' ? 'bg-yellow-500 text-white' :
                  feature.status === 'inactive' ? 'bg-red-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {feature.status}
                </span>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2 line-clamp-1 text-gray-900 dark:text-white">{feature.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{feature.description}</p>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-600 font-semibold">{formatPrice(feature.price)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">to {formatPrice(feature.maxPrice)}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <MapPin size={14} className="mr-1" />
                  {feature.location}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {feature.views || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail size={14} />
                    {feature.inquiries || 0}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(feature._id)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 size={16} className="inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenzAfterWorkManagement;
