import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
const API_URL = resolveApiBase();
import { Upload, X, Camera, Video, MapPin, DollarSign, FileText, Check, XCircle, Clock, Star, Users, Phone, Mail, Edit3, Plus, Filter } from 'lucide-react';

const PaymentFeaturesManager = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    maxPrice: '',
    location: '',
    category: '',
    contactInfo: { phone: '', email: '' },
    tags: [],
    specifications: {},
    isPrivate: false,
    expiresAt: '',
    status: 'pending'
  });
  
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState([]);
  
  const categories = ['Real Estate', 'Services', 'Business', 'Automotive', 'Jobs', 'Electronics', 'Other'];
  
  useEffect(() => {
    fetchFeatures();
  }, [searchTerm, categoryFilter, locationFilter, priceRange, featuredFilter, statusFilter]);
  
  const fetchFeatures = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/payment-features?`;
      const params = [];
      
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (categoryFilter) params.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (locationFilter) params.push(`location=${encodeURIComponent(locationFilter)}`);
      if (priceRange.min) params.push(`minPrice=${priceRange.min}`);
      if (priceRange.max) params.push(`maxPrice=${priceRange.max}`);
      if (featuredFilter) params.push(`featured=${featuredFilter === 'true'}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      
      if (params.length > 0) {
        url += params.join('&');
      }
      
      const response = await authFetch(url);
      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch features');
      }
    } catch (error) {
      console.error('Error fetching features:', error);
      setError('Error fetching features');
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.slice(0, 5 - images.length);
    
    setImages(prev => [...prev, ...newImages]);
    
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviewUrls(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files);
    const newVideos = files.slice(0, 2 - videos.length);
    
    setVideos(prev => [...prev, ...newVideos]);
    
    newVideos.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreviewUrls(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeVideo = (index) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'contactInfo' || key === 'tags' || key === 'specifications') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      images.forEach((image, index) => {
        formDataToSend.append(`images[${index}]`, image);
      });
      
      videos.forEach((video, index) => {
        formDataToSend.append(`videos[${index}]`, video);
      });
      
      const response = await authFetch(`${API_URL}/payment-features`, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Feature created successfully!');
        resetForm();
        fetchFeatures();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating feature:', error);
      alert('Error creating feature');
    }
  };
  
  const handleEdit = (feature) => {
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      description: feature.description,
      price: feature.price,
      maxPrice: feature.maxPrice,
      location: feature.location,
      category: feature.category,
      contactInfo: feature.contactInfo || { phone: '', email: '' },
      tags: feature.tags || [],
      specifications: feature.specifications || {},
      isPrivate: feature.isPrivate || false,
      expiresAt: feature.expiresAt ? feature.expiresAt.split('T')[0] : '',
      status: feature.status
    });
    setImages([]);
    setVideos([]);
    setImagePreviewUrls([]);
    setVideoPreviewUrls([]);
    setShowCreateForm(true);
  };
  
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'contactInfo' || key === 'tags' || key === 'specifications') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      images.forEach((image, index) => {
        formDataToSend.append(`images[${index}]`, image);
      });
      
      videos.forEach((video, index) => {
        formDataToSend.append(`videos[${index}]`, video);
      });
      
      const response = await authFetch(`${API_URL}/payment-features/${editingFeature._id}`, {
        method: 'PUT',
        body: formDataToSend,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Feature updated successfully!');
        resetForm();
        fetchFeatures();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error updating feature:', error);
      alert('Error updating feature');
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this feature?')) {
      return;
    }
    
    try {
      const response = await authFetch(`${API_URL}/payment-features/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Feature deleted successfully!');
        fetchFeatures();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('Error deleting feature');
    }
  };
  
  const toggleFeatured = async (id, currentStatus) => {
    try {
      const response = await authFetch(`${API_URL}/payment-features/${id}/toggle-featured`, {
        method: 'PATCH'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Feature ${currentStatus === true ? 'unfeatured' : 'featured'} successfully!`);
        fetchFeatures();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Error toggling featured status');
    }
  };
  
  const handleInquiry = async (id) => {
    try {
      const response = await authFetch(`${API_URL}/payment-features/${id}/inquiry`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Inquiry submitted successfully!');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('Error submitting inquiry');
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      maxPrice: '',
      location: '',
      category: '',
      contactInfo: { phone: '', email: '' },
      tags: [],
      specifications: {},
      isPrivate: false,
      expiresAt: '',
      status: 'pending'
    });
    setImages([]);
    setVideos([]);
    setImagePreviewUrls([]);
    setVideoPreviewUrls([]);
    setShowCreateForm(false);
    setEditingFeature(null);
  };
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'featured': return 'bg-purple-100 text-purple-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const filteredFeatures = features.filter(feature => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return feature.name.toLowerCase().includes(searchLower) || 
             feature.description.toLowerCase().includes(searchLower) ||
             feature.location.toLowerCase().includes(searchLower);
    }
    return true;
  });
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Features Manager</h1>
        <p className="text-gray-600">Manage payment features for real estate, services, and businesses</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, location..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Filter by location"
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="featured">Featured</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                placeholder="Min"
                className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                placeholder="Max"
                className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Featured</label>
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="true">Featured Only</option>
              <option value="false">Non-Featured Only</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            {showCreateForm ? 'Cancel' : 'Create Feature'}
          </button>
        </div>
      </div>
      
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingFeature ? 'Edit Feature' : 'Create New Feature'}
          </h2>
          
          <form onSubmit={editingFeature ? handleUpdate : handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Feature Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter feature name"
                  className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter feature description"
                  rows="3"
                  className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Starting Price (ZAR)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Price (ZAR)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={formData.maxPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxPrice: e.target.value }))}
                    placeholder="0"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Downtown NYC, NY"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="featured">Featured</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expires At (Optional)</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Information</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="tel"
                        value={formData.contactInfo.phone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, phone: e.target.value }
                        }))}
                        placeholder="Phone"
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="email"
                        value={formData.contactInfo.email}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, email: e.target.value }
                        }))}
                        placeholder="Email"
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images (Max 5)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload images</span>
                  </label>
                </div>
                {imagePreviewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Videos (Max 2)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Video className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload videos</span>
                  </label>
                </div>
                {videoPreviewUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {videoPreviewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <video
                          src={url}
                          className="w-full h-24 object-cover rounded-lg bg-gray-100"
                          controls
                        />
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingFeature ? 'Update Feature' : 'Create Feature'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views/Inquiries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeatures.map((feature) => (
                  <tr key={feature._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {feature.primaryImage ? (
                            <img
                              src={feature.primaryImage}
                              alt={feature.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Upload className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{feature.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        {feature.formattedLocation}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatPrice(feature.price)}</div>
                      <div className="text-xs text-gray-500">to {formatPrice(feature.maxPrice)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {feature.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(feature.status)}`}>n
                        {feature.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Eye size={16} className="text-gray-400" />
                        {feature.views}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        {feature.inquiries}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleFeatured(feature._id, feature.featured)}
                        className={`p-2 rounded-lg transition-colors ${feature.featured
                          ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={feature.featured ? 'Unfeature' : 'Feature'}
                      >
                        <Star size={16} fill={feature.featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(feature)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(feature._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <XCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleInquiry(feature._id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Submit Inquiry"
                        >
                          <Mail size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredFeatures.length === 0 && (
            <div className="text-center py-12">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No features found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {showCreateForm ? 'Try a different search term or create a new feature.' : 'Try a different search term.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentFeaturesManager;