import React, { useState, useEffect } from 'react';

const ProductImageFinder = ({ products }) => {
  const [productImages, setProductImages] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Function to search for product image
  const fetchProductImage = async (product) => {
    setLoading(prev => ({ ...prev, [product.id]: true }));
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { 
              role: "user", 
              content: `Search for an official product image of "${product.name}" perfume. Return ONLY a JSON object with this structure: {"imageUrl": "the direct image URL", "source": "source website"}. No other text.`
            }
          ],
          tools: [
            {
              "type": "web_search_20250305",
              "name": "web_search"
            }
          ]
        })
      });

      const data = await response.json();
      const textContent = data.content
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("");
      
      // Try to parse JSON from response
      const cleanText = textContent.replace(/```json|```/g, "").trim();
      const imageData = JSON.parse(cleanText);
      
      setProductImages(prev => ({
        ...prev,
        [product.id]: imageData.imageUrl || 'https://via.placeholder.com/200x200?text=No+Image'
      }));
      
    } catch (error) {
      console.error(`Error fetching image for ${product.name}:`, error);
      setProductImages(prev => ({
        ...prev,
        [product.id]: 'https://via.placeholder.com/200x200?text=No+Image'
      }));
    } finally {
      setLoading(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // Fetch all images button
  const fetchAllImages = async () => {
    for (const product of products) {
      if (!productImages[product.id]) {
        await fetchProductImage(product);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Perfume Catalog with Images</h1>
          <p className="text-gray-600 mb-6">
            Click on individual products to fetch their images, or use the button below to fetch all at once.
          </p>
          <button
            onClick={fetchAllImages}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
          >
            Fetch All Product Images
          </button>
        </div>

        {/* Women's Products */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg mr-3">
              Women's Fragrances
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.filter(p => p.category === 'women').map(product => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => {
                  if (!productImages[product.id]) {
                    fetchProductImage(product);
                  }
                  setSelectedProduct(product);
                }}
              >
                <div className="relative h-64 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                  {loading[product.id] ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading image...</p>
                    </div>
                  ) : productImages[product.id] ? (
                    <img
                      src={productImages[product.id]}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain p-4"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200x200?text=Image+Error';
                      }}
                    />
                  ) : (
                    <div className="text-center p-4">
                      <svg className="w-16 h-16 text-purple-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">Click to load image</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-lg">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{product.desc}</p>
                  <p className="text-2xl font-bold text-purple-600">₱{product.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Men's Products */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg mr-3">
              Men's Fragrances
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.filter(p => p.category === 'men').map(product => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => {
                  if (!productImages[product.id]) {
                    fetchProductImage(product);
                  }
                  setSelectedProduct(product);
                }}
              >
                <div className="relative h-64 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  {loading[product.id] ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading image...</p>
                    </div>
                  ) : productImages[product.id] ? (
                    <img
                      src={productImages[product.id]}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain p-4"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200x200?text=Image+Error';
                      }}
                    />
                  ) : (
                    <div className="text-center p-4">
                      <svg className="w-16 h-16 text-blue-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">Click to load image</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-lg">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{product.desc}</p>
                  <p className="text-2xl font-bold text-blue-600">₱{product.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal for selected product */}
        {selectedProduct && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedProduct(null)}
          >
            <div
              className="bg-white rounded-2xl p-8 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-800">{selectedProduct.name}</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                >
                  ×
                </button>
              </div>
              {productImages[selectedProduct.id] && (
                <img
                  src={productImages[selectedProduct.id]}
                  alt={selectedProduct.name}
                  className="w-full max-h-96 object-contain mb-4 bg-gray-50 rounded-lg p-4"
                />
              )}
              <p className="text-gray-600 mb-4">{selectedProduct.desc}</p>
              <p className="text-3xl font-bold text-purple-600 mb-4">
                ₱{selectedProduct.price.toLocaleString()}
              </p>
              {productImages[selectedProduct.id] && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Image URL:</p>
                  <input
                    type="text"
                    value={productImages[selectedProduct.id]}
                    readOnly
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageFinder;
