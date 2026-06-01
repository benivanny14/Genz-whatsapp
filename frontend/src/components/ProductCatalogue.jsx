import { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, DollarSign, Package, Send, Trash2, Loader } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const ProductCatalogue = ({ onClose, onSendProduct }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    image: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts(data.products || []);
        } else {
          setError(data.error || 'Imeshindwa kupakia bidhaa');
        }
      } else {
        setError('Kosa la mtandao wakati wa kupakia bidhaa');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Kosa la mtandao limetokea');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;

    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          image: newProduct.image
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts([data.product, ...products]);
          setNewProduct({ name: '', description: '', price: '', image: '' });
          setShowAddForm(false);
        } else {
          setError(data.error || 'Imeshindwa kuongeza bidhaa');
        }
      } else {
        setError('Kosa la mtandao wakati wa kuongeza bidhaa');
      }
    } catch (err) {
      console.error('Error adding product:', err);
      setError('Imeshindwa kuongeza bidhaa kwenye mtandao');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch(`/api/products/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts(products.filter(p => (p._id || p.id) !== id));
        } else {
          setError(data.error || 'Imeshindwa kufuta bidhaa');
        }
      } else {
        setError('Kosa la mtandao wakati wa kufuta bidhaa');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Imeshindwa kufuta bidhaa kwenye mtandao');
    } finally {
      setLoading(false);
    }
  };

  const handleSendProduct = (product) => {
    onSendProduct(product);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Package size={24} className="text-blue-400" />
            Katalogi ya Bidhaa (Product Catalogue)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Add Product Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 mb-4"
            >
              <Plus size={20} />
              Weka Bidhaa Mpya (Add Product)
            </button>
          )}

          {/* Add Product Form */}
          {showAddForm && (
            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-4 border border-gray-700 mb-4">
              <h3 className="text-white font-bold mb-4">Ongeza Bidhaa Mpya</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Jina la Bidhaa</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="mf. Laptop, Simu ya mkononi"
                    className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Maelezo ya Bidhaa</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Ufafanuzi mf. GB 8 RAM, GB 256 SSD"
                    rows={2}
                    className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Bei (TZS / $)</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">URL ya Picha (Hiari)</label>
                  <input
                    type="text"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setShowAddForm(false); setNewProduct({ name: '', description: '', price: '', image: '' }); }}
                    className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
                  >
                    Ghairi
                  </button>
                  <button
                    onClick={handleAddProduct}
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    {loading && <Loader size={16} className="animate-spin" />}
                    Hifadhi Bidhaa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          {loading && products.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader size={36} className="animate-spin text-blue-500" />
            </div>
          ) : products.length === 0 && !showAddForm ? (
            <div className="text-center text-gray-400 py-12">
              <Package size={48} className="mx-auto mb-4 opacity-50 text-blue-400" />
              <p className="text-lg">Hakuna bidhaa bado (No products)</p>
              <p className="text-sm">Ongeza bidhaa yako ya kwanza ili kuanza biashara</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => {
                const id = product._id || product.id;
                return (
                  <div key={id} className="bg-gray-800/30 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all flex flex-col">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-gray-800 flex items-center justify-center">
                        <ImageIcon size={32} className="text-gray-600" />
                      </div>
                    )}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-white font-bold truncate">{product.name}</h4>
                        {product.description && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{product.description}</p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mt-2 mb-3">
                          <DollarSign size={16} className="text-emerald-400" />
                          <span className="text-emerald-400 font-bold">{product.price.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSendProduct(product)}
                            className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 text-sm font-semibold"
                          >
                            <Send size={14} />
                            Tuma (Send)
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(id)}
                            disabled={loading}
                            className="p-1.5 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCatalogue;
