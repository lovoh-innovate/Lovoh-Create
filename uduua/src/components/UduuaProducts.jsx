// components/UduuaProducts.jsx - Properly sized and spaced buttons
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaTimes, 
  FaShoppingCart,
  FaStar,
  FaThLarge,
  FaList,
  FaSpinner,
  FaStore,
  FaTag,
  FaTruck,
  FaCheckCircle,
  FaPercentage,
  FaHeart,
} from 'react-icons/fa';
import { useGetProductsQuery, useSearchProductsQuery, useGetCategoriesQuery } from '../slices/productApiSlice';
import { useAddToCartMutation, useGetCartSummaryQuery } from '../slices/orderApiSlice';
import { useSelector } from 'react-redux';
import ShopSidebar from './ShopSidebar';
import { toast } from 'react-toastify';

const UduuaProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('bestmatch');
  const [addingToCartId, setAddingToCartId] = useState(null);
  const productsPerPage = 12;

  const { userInfo } = useSelector((state) => state.auth);

  // Get search query from URL
  const urlParams = new URLSearchParams(location.search);
  const urlSearch = urlParams.get('search');
  const urlCategory = urlParams.get('category');

  // Determine if we should use search endpoint
  const isSearching = urlSearch && urlSearch.trim() !== '';
  
  // Map sortBy to API sort parameter
  const getSortParam = () => {
    switch (sortBy) {
      case 'price_asc': return 'price-asc';
      case 'price_desc': return 'price-desc';
      case 'newest': return 'newest';
      case 'popular': return 'popular';
      default: return undefined;
    }
  };

  // Use search endpoint when there's a search query
  const { 
    data: searchData, 
    isLoading: searchLoading,
    isFetching: searchFetching
  } = useSearchProductsQuery({
    q: urlSearch || '',
    category: urlCategory || selectedCategory || undefined,
    inStock: true,
    sort: getSortParam(),
    page: currentPage,
    limit: productsPerPage
  }, {
    skip: !isSearching,
  });

  // Use regular products endpoint when no search
  const { 
    data: productsData, 
    isLoading: productsLoading,
    isFetching: productsFetching
  } = useGetProductsQuery({ 
    available: true,
    category: urlCategory || selectedCategory || undefined,
    search: !isSearching ? (urlSearch || searchTerm) : undefined,
    sort: getSortParam(),
    page: currentPage,
    limit: productsPerPage
  }, {
    skip: isSearching,
  });

  const { data: categoriesData } = useGetCategoriesQuery();
  
  const [addToCart] = useAddToCartMutation();
  const { refetch: refetchCartSummary } = useGetCartSummaryQuery(undefined, {
    skip: !userInfo,
  });

  // Determine which data to use
  const responseData = isSearching ? searchData : productsData;
  const products = responseData?.products || [];
  const totalProducts = responseData?.total || 0;
  const totalPages = responseData?.pages || 1;
  const isLoading = (productsLoading || searchLoading) && products.length === 0;
  const isFetching = productsFetching || searchFetching;

  const categories = categoriesData || [];

  // Update search term and category from URL
  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
    if (urlCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [urlSearch, urlCategory]);

  // Update URL when search or category changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    
    const newUrl = params.toString() ? `/shop?${params.toString()}` : '/shop';
    window.history.replaceState({}, '', newUrl);
  }, [searchTerm, selectedCategory]);

  // Reset to page 1 when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortBy]);

  // Listen for search events from navbar
  useEffect(() => {
    const handleSearchEvent = (event) => {
      if (event.detail?.searchTerm) {
        setSearchTerm(event.detail.searchTerm);
        setCurrentPage(1);
      }
    };
    window.addEventListener('shopSearch', handleSearchEvent);
    return () => window.removeEventListener('shopSearch', handleSearchEvent);
  }, []);

  const getDiscountedPrice = (product) => {
    if (product.discount && product.discount > 0) {
      const now = new Date();
      const isDiscountValid = (!product.discountStartDate || now >= new Date(product.discountStartDate)) &&
                              (!product.discountEndDate || now <= new Date(product.discountEndDate));
      if (isDiscountValid) {
        const originalPrice = product.retailPrice || product.price || 0;
        return originalPrice * (1 - product.discount / 100);
      }
    }
    return product.retailPrice || product.price || 0;
  };

  const getStatusBadge = (status) => {
    const badges = {
      "New": { bg: "bg-green-500", text: "New" },
      "Trending": { bg: "bg-gradient-to-r from-orange-500 to-red-500", text: "Trending" },
      "Bulk Available": { bg: "bg-blue-500", text: "Bulk" },
      "Shoppers Favourite": { bg: "bg-purple-500", text: "Favourite" },
      "Limited": { bg: "bg-yellow-500", text: "Limited" },
      "Featured": { bg: "bg-pink-500", text: "Featured" },
    };
    return badges[status] || badges["New"];
  };

  const getDeliveryBadge = (product) => {
    if (product.deliveryOptions?.payOnDelivery) return { text: "Pay on Delivery", color: "bg-green-600" };
    if (product.deliveryOptions?.payOnline) return { text: "Pay Online", color: "bg-blue-600" };
    return { text: "Pay on Delivery", color: "bg-green-600" };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSortBy('bestmatch');
    navigate('/shop');
  };

  const handleProductClick = (productId) => {
    navigate(`/shop/product/${productId}`);
  };

  const formatPrice = (price) => {
    if (!price) return "₦0";
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getStockStatus = (product) => {
    if (product.isSoldOut || product.quantityAvailable === 0) {
      return { text: 'Sold Out', color: 'bg-red-500', available: false };
    }
    if (product.quantityAvailable < 10) {
      return { text: 'Low Stock', color: 'bg-orange-500', available: true };
    }
    return { text: 'In Stock', color: 'bg-green-500', available: true };
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userInfo) {
      toast.error('Please login to add items to cart');
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/shop/login');
      return;
    }

    const stockStatus = getStockStatus(product);
    if (!stockStatus.available) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setAddingToCartId(product._id);
    try {
      const result = await addToCart({ productId: product._id, quantity: 1 }).unwrap();
      if (result?.success) {
        await refetchCartSummary();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { action: 'add', product: product } }));
        toast.success(`${product.name} added to cart!`, { position: 'bottom-right', autoClose: 2000 });
      } else {
        toast.error('Failed to add to cart. Please try again.');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to add to cart. Please try again.';
      toast.error(errorMessage);
    } finally {
      setAddingToCartId(null);
    }
  };

  const indexOfFirstProduct = (currentPage - 1) * productsPerPage + 1;
  const indexOfLastProduct = Math.min(currentPage * productsPerPage, totalProducts);

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-[#0043FC] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-2 pb-16">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex gap-4 lg:gap-6">
          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="sticky top-28">
              <ShopSidebar 
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchTerm={searchTerm}
                onClearFilters={clearFilters}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Results Header - Mobile optimized */}
            <div className="sticky top-14 sm:top-28 z-20 bg-gray-50 pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  {isFetching && products.length > 0 ? (
                    <FaSpinner className="animate-spin text-[#0043FC] text-xs sm:text-sm" />
                  ) : (
                    <span className="text-gray-500 truncate">
                      {totalProducts > 0 ? (
                        <>
                          <span className="font-semibold text-gray-900">{indexOfFirstProduct} - {indexOfLastProduct}</span>
                          {' '}of{' '}
                          <span className="font-semibold text-gray-900">{totalProducts.toLocaleString()}</span>
                          {' '}product{totalProducts !== 1 ? 's' : ''}
                          {searchTerm && (
                            <span className="text-[#0043FC] hidden xs:inline"> matching "{searchTerm}"</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-900">No products found</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative flex-1 sm:flex-none">
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none h-8 sm:h-9 pl-2 pr-6 sm:pl-3 sm:pr-8 border border-gray-200 rounded-md text-xs sm:text-sm text-gray-700 bg-white focus:outline-none focus:border-[#0043FC] focus:ring-1 focus:ring-[#0043FC] cursor-pointer w-full sm:w-auto"
                    >
                      <option value="bestmatch">Best Match</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="newest">Newest First</option>
                      <option value="popular">Most Popular</option>
                    </select>
                    <FaTimes className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none rotate-90" />
                  </div>

                  <div className="flex items-center border border-gray-200 rounded-md overflow-hidden shrink-0">
                    <button 
                      onClick={() => setViewMode('grid')} 
                      className={`p-1.5 sm:p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#0043FC] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <FaThLarge className="text-xs sm:text-sm" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')} 
                      className={`p-1.5 sm:p-2 transition-colors ${viewMode === 'list' ? 'bg-[#0043FC] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <FaList className="text-xs sm:text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filter Tags - Mobile optimized */}
            {(searchTerm || selectedCategory) && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-gray-100 rounded-full text-[10px] sm:text-xs text-gray-700">
                    Search: {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center rounded-full bg-gray-300 text-gray-600 hover:bg-red-500 hover:text-white transition-colors">
                      <FaTimes className="text-[8px] sm:text-[10px]" />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-[#0043FC]/10 rounded-full text-[10px] sm:text-xs text-[#0043FC]">
                    Category: {selectedCategory}
                    <button onClick={() => setSelectedCategory('')} className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center rounded-full bg-[#0043FC]/20 text-[#0043FC] hover:bg-red-500 hover:text-white transition-colors">
                      <FaTimes className="text-[8px] sm:text-[10px]" />
                    </button>
                  </span>
                )}
                <button onClick={clearFilters} className="text-[10px] sm:text-xs text-[#0043FC] hover:text-[#0033cc] font-medium ml-1 sm:ml-2">Clear All</button>
              </div>
            )}

            {/* Products Display */}
            <div>
              {products.length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-white rounded-lg border border-gray-200">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl text-gray-400">🔍</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">No products found</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                    {searchTerm ? `No products match "${searchTerm}"` : 'Try adjusting your search or filters'}
                  </p>
                  <button onClick={clearFilters} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#0043FC] hover:bg-[#0033cc] text-white rounded-md text-xs sm:text-sm font-medium transition-colors">
                    Clear Filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Grid View - Smaller cards, more per row on desktop */}
                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-3">
                      {products.map((product) => {
                        const statusStyle = getStatusBadge(product.status);
                        const deliveryBadge = getDeliveryBadge(product);
                        const productPrice = getDiscountedPrice(product);
                        const originalPrice = product.retailPrice || product.price || 0;
                        const hasDiscount = product.discount > 0 && productPrice < originalPrice;
                        const productImage = product.images?.[0] || "/placeholder-product.jpg";
                        const stockStatus = getStockStatus(product);
                        const isAddingThisProduct = addingToCartId === product._id;
                        
                        return (
                          <div
                            key={product._id}
                            onClick={() => handleProductClick(product._id)}
                            className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col"
                          >
                            <div className="relative aspect-square overflow-hidden bg-gray-50 flex-shrink-0">
                              <img
                                src={productImage}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => { e.target.src = "/placeholder-product.jpg"; }}
                              />
                              <div className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 ${statusStyle.bg} text-white text-[6px] sm:text-[8px] font-bold px-0.5 sm:px-1 py-0.5 rounded-full z-10`}>
                                {statusStyle.text}
                              </div>
                              {hasDiscount && (
                                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-red-500 text-white text-[6px] sm:text-[8px] font-bold px-0.5 sm:px-1 py-0.5 rounded-full z-10 flex items-center gap-0.5">
                                  <FaPercentage className="text-[4px] sm:text-[6px]" />
                                  {product.discount}% OFF
                                </div>
                              )}
                              {!stockStatus.available && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                  <span className="text-white font-bold text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-red-500 rounded-lg">Sold Out</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="p-1.5 sm:p-2 flex flex-col flex-1">
                              <div className="flex items-center gap-0.5 mb-0.5">
                                <FaStore className="text-gray-400 text-[6px] sm:text-[7px] flex-shrink-0" />
                                <span className="text-[7px] sm:text-[8px] text-gray-500 font-bold uppercase tracking-wide truncate">
                                  {product.brandName || "GENERIC"}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 mb-0.5">
                                <FaTag className="text-[#0043FC] text-[6px] sm:text-[7px] flex-shrink-0" />
                                <span className="text-[7px] sm:text-[8px] text-gray-400 truncate">
                                  {Array.isArray(product.category) ? product.category[0] : product.category || "General"}
                                </span>
                              </div>
                              <h3 className="font-semibold text-gray-900 text-[10px] sm:text-xs leading-tight mb-0.5 line-clamp-2 min-h-[24px] sm:min-h-[28px]">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-0.5 mb-0.5 sm:mb-1">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar 
                                    key={i}
                                    className={`text-[6px] sm:text-[7px] ${i < Math.floor(product.rating || 4) ? 'text-yellow-400' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                              <div className="mb-0.5 sm:mb-1">
                                {hasDiscount ? (
                                  <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                                    <span className="text-[10px] sm:text-xs font-bold text-[#0043FC]">
                                      {formatPrice(productPrice)}
                                    </span>
                                    <span className="text-[7px] sm:text-[8px] text-gray-400 line-through">
                                      {formatPrice(originalPrice)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] sm:text-xs font-bold text-[#0043FC]">
                                    {formatPrice(productPrice)}
                                  </span>
                                )}
                              </div>
                              <div className={`inline-flex items-center gap-0.5 px-0.5 sm:px-1 py-0.5 rounded-full text-white text-[6px] sm:text-[7px] font-medium mb-1 sm:mb-1.5 ${deliveryBadge.color} w-fit`}>
                                <FaTruck className="text-[4px] sm:text-[5px]" />
                                <span className="hidden xs:inline">{deliveryBadge.text}</span>
                                <span className="xs:hidden">{deliveryBadge.text === 'Pay on Delivery' ? 'POD' : 'Pay Online'}</span>
                              </div>
                              
                              {/* Buttons - Proper size with spacing */}
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-auto">
                                {stockStatus.available ? (
                                  <>
                                    <button 
                                      onClick={(e) => handleAddToCart(e, product)}
                                      disabled={isAddingThisProduct}
                                      className="flex-1 h-7 sm:h-8 rounded-md bg-[#0043FC]/10 text-[#0043FC] hover:bg-[#0043FC]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[8px] sm:text-[10px] font-medium flex items-center justify-center gap-1 whitespace-nowrap"
                                    >
                                      {isAddingThisProduct ? (
                                        <FaSpinner className="animate-spin text-[8px] sm:text-[10px]" />
                                      ) : (
                                        <>
                                          <FaShoppingCart className="text-[8px] sm:text-[10px] flex-shrink-0" /> 
                                          <span>Cart</span>
                                        </>
                                      )}
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProductClick(product._id);
                                      }}
                                      className="flex-1 h-7 sm:h-8 rounded-md bg-[#0043FC] hover:bg-[#0038D4] text-white text-[8px] sm:text-[10px] font-medium transition-colors flex items-center justify-center whitespace-nowrap"
                                    >
                                      Buy
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProductClick(product._id);
                                    }}
                                    className="w-full h-7 sm:h-8 rounded-md bg-gray-400 hover:bg-gray-500 text-white text-[8px] sm:text-[10px] font-medium transition-colors flex items-center justify-center whitespace-nowrap"
                                  >
                                    View
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* List View - Completely redesigned for mobile */}
                  {viewMode === 'list' && (
                    <div className="space-y-2 sm:space-y-3">
                      {products.map((product) => {
                        const statusStyle = getStatusBadge(product.status);
                        const deliveryBadge = getDeliveryBadge(product);
                        const productPrice = getDiscountedPrice(product);
                        const originalPrice = product.retailPrice || product.price || 0;
                        const hasDiscount = product.discount > 0 && productPrice < originalPrice;
                        const productImage = product.images?.[0] || "/placeholder-product.jpg";
                        const stockStatus = getStockStatus(product);
                        const isAddingThisProduct = addingToCartId === product._id;
                        
                        return (
                          <div
                            key={product._id}
                            onClick={() => handleProductClick(product._id)}
                            className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300 cursor-pointer"
                          >
                            <div className="flex gap-2 sm:gap-4 p-2 sm:p-3 lg:p-4">
                              <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 shrink-0 rounded-md overflow-hidden bg-gray-50">
                                <img
                                  src={productImage}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.src = "/placeholder-product.jpg"; }}
                                />
                                {hasDiscount && (
                                  <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 bg-red-500 text-white text-[7px] sm:text-[8px] font-bold px-0.5 sm:px-1 py-0.5 rounded flex items-center gap-0.5">
                                    <FaPercentage className="text-[5px] sm:text-[6px]" /> {product.discount}%
                                  </div>
                                )}
                                {!stockStatus.available && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white font-bold text-[8px] sm:text-[10px] px-1 py-0.5 bg-red-500 rounded">Sold</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1 sm:gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                                      <span className={`${statusStyle.bg} text-white text-[7px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full`}>
                                        {statusStyle.text}
                                      </span>
                                      <span className={`inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full text-white text-[7px] sm:text-[8px] ${deliveryBadge.color}`}>
                                        <FaTruck className="text-[5px] sm:text-[6px]" /> 
                                        <span className="hidden xs:inline">{deliveryBadge.text}</span>
                                        <span className="xs:hidden">{deliveryBadge.text === 'Pay on Delivery' ? 'POD' : 'Online'}</span>
                                      </span>
                                    </div>
                                    <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 truncate">
                                      {product.name}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                                      {product.brandName || "GENERIC"} • {Array.isArray(product.category) ? product.category[0] : product.category || "General"}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0 ml-1 sm:ml-2">
                                    {hasDiscount ? (
                                      <>
                                        <div className="text-xs sm:text-sm lg:text-xl font-bold text-[#0043FC]">
                                          {formatPrice(productPrice)}
                                        </div>
                                        <div className="text-[8px] sm:text-[10px] text-gray-400 line-through">
                                          {formatPrice(originalPrice)}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-xs sm:text-sm lg:text-xl font-bold text-[#0043FC]">
                                        {formatPrice(productPrice)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Hidden on mobile, visible on tablet+ */}
                                <p className="hidden sm:block text-xs text-gray-500 line-clamp-2 mt-1 lg:mt-2">
                                  {product.description || 'No description available'}
                                </p>
                                
                                <div className="flex items-center justify-between mt-1 sm:mt-2 lg:mt-3">
                                  <div className="flex items-center gap-1 sm:gap-2 text-[8px] sm:text-xs text-gray-400">
                                    <span>{product.quantitySold || 0} sold</span>
                                    <div className="flex items-center gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <FaStar 
                                          key={i}
                                          className={`text-[8px] sm:text-[10px] ${i < Math.floor(product.rating || 4) ? 'text-yellow-400' : 'text-gray-300'}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    {stockStatus.available && (
                                      <button 
                                        onClick={(e) => handleAddToCart(e, product)}
                                        disabled={isAddingThisProduct}
                                        className="h-7 sm:h-8 px-3 sm:px-4 rounded-md bg-[#0043FC]/10 text-[#0043FC] hover:bg-[#0043FC]/20 transition-colors disabled:opacity-50 text-[8px] sm:text-[10px] font-medium flex items-center gap-1 whitespace-nowrap"
                                      >
                                        {isAddingThisProduct ? (
                                          <FaSpinner className="animate-spin text-[8px] sm:text-[10px]" />
                                        ) : (
                                          <>
                                            <FaShoppingCart className="text-[8px] sm:text-[10px]" />
                                            <span>Cart</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProductClick(product._id);
                                      }}
                                      className="h-7 sm:h-8 px-3 sm:px-4 rounded-md bg-[#0043FC] hover:bg-[#0038D4] text-white text-[8px] sm:text-[10px] font-medium transition-colors flex items-center justify-center whitespace-nowrap"
                                    >
                                      {stockStatus.available ? 'Buy' : 'View'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Pagination - Mobile optimized */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-1 sm:gap-2 mt-6 sm:mt-8">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-md text-[10px] sm:text-sm text-gray-600 hover:border-[#0043FC] hover:text-[#0043FC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Prev
                      </button>
                      
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-md text-[10px] sm:text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-[#0043FC] text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2 sm:px-4 py-1 sm:py-2 border border-gray-200 rounded-md text-[10px] sm:text-sm text-gray-600 hover:border-[#0043FC] hover:text-[#0043FC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UduuaProducts;