import React, { useState } from 'react';

/**
 * SIMPLIFIED VERSION - Uses Google Image Search URLs
 * This version creates predictable image URLs without API calls
 * Perfect if you want instant image display
 */

const ProductCatalogWithImages = ({ products }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Generate search URL for product image
  const getImageSearchUrl = (productName) => {
    const searchQuery = encodeURIComponent(`${productName} perfume bottle`);
    return `https://www.google.com/search?q=${searchQuery}&tbm=isch`;
  };

  // Placeholder image URL
  const getPlaceholderImage = (category) => {
    return category === 'women'
      ? 'https://via.placeholder.com/300x400/ec4899/ffffff?text=Women%27s+Perfume'
      : 'https://via.placeholder.com/300x400/3b82f6/ffffff?text=Men%27s+Perfume';
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">🌸 Perfume Catalog 🌸</h1>
          <p className="text-gray-600 mb-4">
            Click "Find Image" on any product to search for its official image on Google.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Click any product card to view details and get direct image search links!
            </p>
          </div>
        </div>

        {/* Women's Products */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg mr-3">
              👩 Women's Fragrances ({products.filter(p => p.category === 'women').length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.filter(p => p.category === 'women').map(product => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative h-64 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={getPlaceholderImage('women')}
                    alt={product.name}
                    className="max-h-full max-w-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="text-center text-white">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-semibold">Click to find image</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-lg line-clamp-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.desc}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold text-pink-600">₱{product.price.toLocaleString()}</p>
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">{product.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Men's Products */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg mr-3">
              👨 Men's Fragrances ({products.filter(p => p.category === 'men').length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.filter(p => p.category === 'men').map(product => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative h-64 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={getPlaceholderImage('men')}
                    alt={product.name}
                    className="max-h-full max-w-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="text-center text-white">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-semibold">Click to find image</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-lg line-clamp-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.desc}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold text-blue-600">₱{product.price.toLocaleString()}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{product.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal for selected product */}
        {selectedProduct && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedProduct(null)}
          >
            <div
              className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">{selectedProduct.name}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedProduct.category === 'women' 
                      ? 'bg-pink-100 text-pink-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedProduct.category === 'women' ? '👩 Women' : '👨 Men'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-700 text-4xl leading-none font-light"
                >
                  ×
                </button>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 mb-6 text-center">
                <img
                  src={getPlaceholderImage(selectedProduct.category)}
                  alt={selectedProduct.name}
                  className="w-48 h-64 object-cover mx-auto rounded-lg shadow-lg opacity-60 mb-4"
                />
                <p className="text-gray-600 text-sm">Product image placeholder</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Description</label>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedProduct.desc}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Price</label>
                  <p className={`text-4xl font-bold ${
                    selectedProduct.category === 'women' ? 'text-pink-600' : 'text-blue-600'
                  }`}>
                    ₱{selectedProduct.price.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Product ID</label>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg font-mono">{selectedProduct.id}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-2 border-purple-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  Find Product Images
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Click the button below to search for official product images on Google:
                </p>
                <a
                  href={getImageSearchUrl(selectedProduct.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg text-center"
                >
                  🔍 Search Google Images for "{selectedProduct.name}"
                </a>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Opens in new tab • Find and download official product images
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCatalogWithImages;
