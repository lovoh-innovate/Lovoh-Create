// components/ShopNavbar.jsx – All brands visible, mobile optimized with correct logo
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaSearch,
  FaShoppingCart,
  FaBars,
  FaTimes,
  FaQuestionCircle,
  FaUser,
  FaArrowLeft,
  FaHome,
  FaSignOutAlt,
  FaBox,
  FaStore,
  FaChartLine,
  FaWallet,
  FaCreditCard,
  FaHistory,
  FaTachometerAlt,
  FaCheckCircle,
  FaChevronDown,
} from 'react-icons/fa';
import { useLogoutMutation } from '../slices/userApiSlice.js';
import { useGetCartSummaryQuery, useGetSellerBalanceQuery } from '../slices/orderApiSlice.js';
import { useGetSellerApplicationStatusQuery } from '../slices/sellerApiSlice.js';
import { logout } from '../slices/authslice.js';

// --- Domain constants (cross‑domain navigation) ---
const MAIN_DOMAIN = "https://lovohcreate.com";
const SUBDOMAINS = {
  biizzed: "https://biizzed.lovohcreate.com",
  uduua: "https://uduua.lovohcreate.com",
  events: "https://eventroom.lovohcreate.com",
};

// Sub‑brands data (including main brand for quick access)
const BRANDS = [
  { id: "biizzed", name: "Biizzed", path: "/", icon: "/biizzed.png" },
  { id: "uduua", name: "Uduua", path: "/", icon: "/uduua.png" },
  { id: "events", name: "EventRoom", path: "/", icon: "/eventroom.png" },
  { id: "lovoh", name: "Lovoh Create", path: "/", icon: "/logo.png", isMain: true },
];

// Detect current subdomain
const getCurrentSubdomain = () => {
  const hostname = window.location.hostname;
  if (hostname.includes("biizzed")) return "biizded";
  if (hostname.includes("uduua")) return "uduua";
  if (hostname.includes("eventroom")) return "events";
  return null;
};
const currentSub = getCurrentSubdomain();

// Helper: get URL for a main‑domain path (absolute when on subdomain)
const getMainDomainUrl = (path) => `${MAIN_DOMAIN}${path}`;
const getSubdomainUrl = (brand) => SUBDOMAINS[brand] || MAIN_DOMAIN;

// Decide link href for cross‑domain navigation
const getLinkHref = (to, brandId) => {
  if (brandId && SUBDOMAINS[brandId]) {
    return getSubdomainUrl(brandId);
  }
  const mainPages = ["/", "/about", "/work", "/services", "/contact"];
  if (mainPages.includes(to)) {
    if (currentSub !== null) return getMainDomainUrl(to);
    return to;
  }
  return to;
};

// Grid icon (3x3 dots)
const GridIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="4" cy="4" r="2" />
    <circle cx="12" cy="4" r="2" />
    <circle cx="20" cy="4" r="2" />
    <circle cx="4" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="20" cy="12" r="2" />
    <circle cx="4" cy="20" r="2" />
    <circle cx="12" cy="20" r="2" />
    <circle cx="20" cy="20" r="2" />
  </svg>
);

const ShopNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { userInfo } = useSelector((state) => state.auth);
  const [logoutApiCall] = useLogoutMutation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [showSellerMenu, setShowSellerMenu] = useState(false);
  const [isBrandsOpen, setIsBrandsOpen] = useState(false);
  const brandsRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const { data: cartSummary, refetch: refetchCartSummary } = useGetCartSummaryQuery(undefined, {
    skip: !userInfo,
  });

  const { data: sellerStatus } = useGetSellerApplicationStatusQuery(undefined, {
    skip: !userInfo,
  });

  const { data: sellerBalance } = useGetSellerBalanceQuery(undefined, {
    skip: !userInfo || sellerStatus?.sellerStatus !== 'approved',
  });

  const cartCount = cartSummary?.cartCount || 0;
  const isApprovedSeller = sellerStatus?.sellerStatus === 'approved' && sellerStatus?.isSeller === true;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (userInfo) {
      refetchCartSummary();
    }
  }, [userInfo, refetchCartSummary]);

  useEffect(() => {
    const handleCartUpdate = () => {
      if (userInfo) {
        refetchCartSummary();
      }
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [userInfo, refetchCartSummary]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close brands dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (brandsRef.current && !brandsRef.current.contains(event.target)) {
        setIsBrandsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close brands dropdown on route change
  useEffect(() => {
    setIsBrandsOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Brand navigation (cross‑domain)
  const handleBrandClick = (brandId, path) => {
    setIsBrandsOpen(false);
    const href = getLinkHref(path, brandId);
    if (href.startsWith("http")) {
      window.location.href = href;
    } else {
      navigate(href);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const value = searchTerm.trim();
    if (value) {
      navigate(`/shop?search=${encodeURIComponent(value)}`);
    } else {
      navigate('/shop');
    }
    setIsMobileSearchOpen(false);
    setSearchTerm('');
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate('/shop');
  };

  const handleLogout = async () => {
    try {
      await logoutApiCall().unwrap();
      dispatch(logout());
      navigate('/shop');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 w-full bg-white transition-all duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
        <div className="w-full">
          {/* Top Bar - Optimized for mobile */}
          <div className="border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
              <div className="h-14 sm:h-16 flex items-center justify-between gap-1 sm:gap-2 lg:gap-4">
                {/* Left - Logo */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleLogoClick}
                    className="flex items-center gap-2 group"
                    aria-label="Go to shop"
                  >
                    <img src="/uduua.png" alt="Logo" className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105 duration-200" />
                  </button>
                </div>

                {/* Center - Desktop Search Bar */}
                <div className="hidden md:flex flex-1 max-w-2xl mx-4">
                  <form onSubmit={handleSearch} className="w-full flex items-center">
                    <div className="relative flex-1">
                      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search products, brands and categories..."
                        className="w-full h-11 pl-11 pr-4 border border-gray-200 border-r-0 bg-white text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#0043FC] focus:ring-1 focus:ring-[#0043FC]/20 transition-all rounded-l-xl"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-11 px-6 bg-[#0043FC] hover:bg-[#0033cc] text-white font-semibold text-sm rounded-r-xl transition-colors duration-200"
                    >
                      Search
                    </button>
                  </form>
                </div>

                {/* Right - Actions */}
                <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 shrink-0">
                  {/* Mobile Search Button */}
                  <button
                    onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                    className="md:hidden flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 text-gray-600 hover:text-[#0043FC] hover:border-[#0043FC]/30 transition-all duration-200"
                    aria-label="Search"
                  >
                    <FaSearch className="text-sm sm:text-base" />
                  </button>

                  {/* Help - Hidden on very small screens */}
                  <Link to="/shop/help" className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0043FC] transition-colors duration-200">
                    <FaQuestionCircle className="text-base" />
                    <span className="hidden lg:inline">Help</span>
                  </Link>

                  {/* Cart */}
                  <Link to="/shop/cart" className="relative flex items-center gap-1 sm:gap-2 text-sm font-medium text-gray-600 hover:text-[#0043FC] transition-colors duration-200">
                    <div className="relative">
                      <FaShoppingCart className="text-lg sm:text-xl" />
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0043FC] text-white text-[10px] font-bold flex items-center justify-center">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm">Cart</span>
                  </Link>

                  {/* Brands Grid Button - Always visible, mobile optimized */}
                  <div className="relative" ref={brandsRef}>
                    <button
                      onClick={() => setIsBrandsOpen((prev) => !prev)}
                      className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 text-gray-600 hover:text-[#0043FC] hover:border-[#0043FC]/30 transition-all duration-200"
                      aria-label="All brands"
                    >
                      <GridIcon />
                    </button>
                    
                    {/* Brands Dropdown - Mobile optimized with all brands */}
                    {isBrandsOpen && (
                      <div className={`absolute top-full ${window.innerWidth < 640 ? 'right-0' : 'right-0'} mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 max-h-[80vh] overflow-y-auto`}>
                        <div className="flex items-center justify-between mb-3 sm:hidden">
                          <span className="text-sm font-semibold text-gray-900">Switch Brand</span>
                          <button 
                            onClick={() => setIsBrandsOpen(false)}
                            className="p-1 hover:bg-gray-100 rounded-lg"
                          >
                            <FaTimes className="text-gray-500" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                          {BRANDS.map((brand) => (
                            <button
                              key={brand.id}
                              onClick={() => handleBrandClick(brand.id === "lovoh" ? null : brand.id, brand.path)}
                              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl hover:bg-[#0043FC]/5 transition-all duration-200 ${
                                (brand.id === currentSub || (brand.isMain && !currentSub)) ? 'bg-[#0043FC]/10 border-2 border-[#0043FC]/30' : ''
                              }`}
                            >
                              <img
                                src={brand.icon}
                                alt={brand.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain mb-1"
                                onError={(e) => { e.target.src = "/logo.png"; }}
                              />
                              <span className="text-xs sm:text-sm font-medium text-gray-700 text-center leading-tight">{brand.name}</span>
                              {brand.isMain && (
                                <span className="text-[8px] text-gray-400 uppercase tracking-wider">Main</span>
                              )}
                              {(brand.id === currentSub || (brand.isMain && !currentSub)) && (
                                <span className="text-[8px] text-[#0043FC] font-semibold">Active</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] text-center text-gray-400">Visit other brands in our ecosystem</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Seller Hub - Hidden on mobile */}
                  {isApprovedSeller && (
                    <div className="relative hidden lg:block">
                      <button
                        onClick={() => setShowSellerMenu(!showSellerMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#0043FC]/10 text-[#0043FC] rounded-lg text-sm font-medium hover:bg-[#0043FC]/20 transition-colors"
                      >
                        <FaStore className="text-sm" />
                        <span>Seller Hub</span>
                      </button>
                    </div>
                  )}

                  {/* User Profile / Login */}
                  {userInfo ? (
                    <div className="relative group">
                      <button className="flex items-center gap-1 sm:gap-2 p-1 pr-2 sm:pr-3 rounded-full hover:bg-gray-50 transition-colors">
                        <img 
                          src={userInfo.profile || '/default-avatar.png'} 
                          alt={userInfo.name}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-gray-200"
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="hidden lg:block text-left">
                          <div className="text-sm font-semibold text-gray-900 leading-tight">
                            {userInfo.name?.split(' ')[0]}
                          </div>
                          <div className="text-xs text-gray-500 leading-tight">@{userInfo.username}</div>
                        </div>
                      </button>

                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="p-3 border-b border-gray-100">
                          <div className="font-semibold text-gray-900">{userInfo.name}</div>
                          <div className="text-xs text-gray-500">{userInfo.email}</div>
                          {isApprovedSeller && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                              <FaCheckCircle className="text-[8px]" /> Seller
                            </div>
                          )}
                        </div>
                        
                        <Link to="/shop/orders" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0043FC]">
                          <FaBox className="text-xs" /> My Orders
                        </Link>

                        {isApprovedSeller && (
                          <>
                            <div className="border-t border-gray-100 my-1"></div>
                            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Seller Dashboard</div>
                            <Link to="/seller/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0043FC]">
                              <FaTachometerAlt className="text-xs" /> Dashboard
                            </Link>
                            <Link to="/seller/products" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0043FC]">
                              <FaStore className="text-xs" /> My Products
                            </Link>
                            <Link to="/seller/orders" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0043FC]">
                              <FaBox className="text-xs" /> Seller Orders
                            </Link>
                            <Link to="/seller/wallet" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0043FC]">
                              <FaWallet className="text-xs" /> Wallet
                            </Link>
                            <Link to="/seller/payment-history" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0043FC]">
                              <FaHistory className="text-xs" /> Payment History
                            </Link>
                            <div className="px-4 py-1 text-xs text-green-600 bg-green-50">
                              Balance: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(sellerBalance?.availableBalance || 0)}
                            </div>
                          </>
                        )}
                        
                        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                          <FaSignOutAlt className="text-xs" /> Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Link to="/shop/login" className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0043FC] transition-colors duration-200">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <FaUser className="text-xs sm:text-sm" />
                        </div>
                        <span className="hidden lg:inline">Login</span>
                      </Link>
                      <Link to="/shop/signup" className="hidden sm:block text-sm font-semibold text-white bg-[#0043FC] hover:bg-[#0033cc] px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-colors duration-200">
                        Sign Up
                      </Link>
                    </>
                  )}

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                    className="md:hidden inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 text-gray-600 hover:text-[#0043FC] hover:border-[#0043FC]/30 transition-all duration-200"
                    aria-label="Toggle menu"
                  >
                    {isMobileMenuOpen ? <FaTimes className="text-base sm:text-lg" /> : <FaBars className="text-base sm:text-lg" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Navigation - Hidden on mobile */}
          <div className="hidden md:block border-b border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="h-12 flex items-center gap-6">
                <Link to="/shop" className="flex items-center gap-2 text-sm font-semibold text-[#0043FC] transition-colors">
                  <FaBars className="text-sm" />
                  <span>All Products</span>
                </Link>
                <div className="h-4 w-px bg-gray-200"></div>
                <div className="flex items-center gap-6">
                  <Link to="/shop/help" className="text-sm font-medium text-gray-600 hover:text-[#0043FC] transition-colors">
                    Help Center
                  </Link>
                  <Link to="/shop/orders" className="text-sm font-medium text-gray-600 hover:text-[#0043FC] transition-colors">
                    My Orders
                  </Link>
                  {isApprovedSeller && (
                    <Link to="/seller/dashboard" className="text-sm font-medium text-[#0043FC] hover:text-[#0033cc] transition-colors flex items-center gap-1">
                      <FaStore className="text-xs" /> Seller Dashboard
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seller Hub Dropdown Menu */}
          {showSellerMenu && isApprovedSeller && (
            <div className="absolute right-4 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-[#0043FC]/5 to-transparent">
                <div className="flex items-center gap-2">
                  <FaStore className="text-[#0043FC]" />
                  <span className="font-semibold text-gray-900">Seller Hub</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Manage your selling business</p>
              </div>
              <div className="p-2">
                <Link to="/seller/dashboard" onClick={() => setShowSellerMenu(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-[#0043FC] transition-colors">
                  <FaTachometerAlt className="text-sm" /> <span>Dashboard</span>
                </Link>
                <Link to="/seller/products" onClick={() => setShowSellerMenu(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-[#0043FC] transition-colors">
                  <FaStore className="text-sm" /> <span>My Products</span>
                </Link>
                <Link to="/seller/orders" onClick={() => setShowSellerMenu(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-[#0043FC] transition-colors">
                  <FaBox className="text-sm" /> <span>Orders</span>
                </Link>
                <Link to="/seller/wallet" onClick={() => setShowSellerMenu(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-[#0043FC] transition-colors">
                  <FaWallet className="text-sm" /> <span>Wallet & Balance</span>
                </Link>
                <Link to="/seller/payment-history" onClick={() => setShowSellerMenu(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-[#0043FC] transition-colors">
                  <FaHistory className="text-sm" /> <span>Payment History</span>
                </Link>
                <Link to="/seller/analytics" onClick={() => setShowSellerMenu(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-[#0043FC] transition-colors">
                  <FaChartLine className="text-sm" /> <span>Analytics</span>
                </Link>
              </div>
              <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Available Balance</span>
                  <span className="font-bold text-[#0043FC]">
                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(sellerBalance?.availableBalance || 0)}
                  </span>
                </div>
                <button onClick={() => { setShowSellerMenu(false); navigate('/seller/withdraw'); }} className="w-full mt-2 py-1.5 bg-[#0043FC] text-white rounded-lg text-xs font-medium hover:bg-[#0038D4] transition-colors">
                  Withdraw Funds
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-x-0 top-0 z-50 md:hidden">
          <div className="bg-white border-b border-gray-200 pt-4 pb-4 px-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Search Products</h3>
              <button onClick={() => setIsMobileSearchOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#0043FC] hover:bg-gray-50 transition-all">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#0043FC] focus:ring-2 focus:ring-[#0043FC]/20 focus:bg-white transition-all"
                  autoFocus
                />
              </div>
              <button type="submit" className="h-11 px-5 rounded-xl font-semibold text-white bg-[#0043FC] hover:bg-[#0033cc] transition-colors duration-200">
                Search
              </button>
            </form>
          </div>
          <div className="fixed inset-0 bg-black/50 -z-10" onClick={() => setIsMobileSearchOpen(false)}></div>
        </div>
      )}

      {/* Spacer - Adjusted for mobile */}
      <div className="h-14 sm:h-16 md:h-28"></div>

      {/* Mobile Sidebar Menu - Optimized with correct logo */}
      <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsMobileMenuOpen(false)}></div>
        <div 
          ref={mobileMenuRef}
          className={`absolute right-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Same logo as navbar */}
                  <img src="/uduua.png" alt="Logo" className="h-8 w-auto" />
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#0043FC] hover:bg-white transition-all">
                  <FaTimes />
                </button>
              </div>
              {userInfo && (
                <div className="mt-3 flex items-center gap-3">
                  <img src={userInfo.profile || '/default-avatar.png'} alt={userInfo.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" onError={(e) => { e.target.src = '/default-avatar.png'; }} />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{userInfo.name}</div>
                    <div className="text-xs text-gray-500">@{userInfo.username}</div>
                    {isApprovedSeller && (
                      <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-medium">
                        <FaStore className="text-[8px]" /> Seller
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!userInfo && <p className="text-xs text-gray-500 mt-2">Shop with confidence</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[#0043FC] font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200">
                <FaBars className="text-base" />
                <span className="text-sm">All Products</span>
              </Link>
              <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                <FaHome className="text-base" />
                <span className="text-sm">Home</span>
              </Link>

              {/* Mobile Brand Switcher - Quick access to all brands */}
              <div className="border-t border-gray-100 my-2"></div>
              <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Switch Brand</p>
              <div className="grid grid-cols-4 gap-1 px-1 py-2">
                {BRANDS.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      handleBrandClick(brand.id === "lovoh" ? null : brand.id, brand.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg hover:bg-[#0043FC]/5 transition-all duration-200 ${
                      (brand.id === currentSub || (brand.isMain && !currentSub)) ? 'bg-[#0043FC]/10 border border-[#0043FC]/30' : ''
                    }`}
                  >
                    <img
                      src={brand.icon}
                      alt={brand.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => { e.target.src = "/logo.png"; }}
                    />
                    <span className="text-[8px] font-medium text-gray-700 text-center mt-0.5 leading-tight">{brand.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 my-2"></div>

              {userInfo ? (
                <>
                  <Link to="/shop/orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                    <FaBox className="text-base" />
                    <span className="text-sm">My Orders</span>
                  </Link>

                  {isApprovedSeller && (
                    <>
                      <div className="border-t border-gray-100 my-2"></div>
                      <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Seller Dashboard</p>
                      <Link to="/seller/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                        <FaTachometerAlt className="text-base" /> <span className="text-sm">Dashboard</span>
                      </Link>
                      <Link to="/seller/products" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                        <FaStore className="text-base" /> <span className="text-sm">My Products</span>
                      </Link>
                      <Link to="/seller/orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                        <FaBox className="text-base" /> <span className="text-sm">Seller Orders</span>
                      </Link>
                      <Link to="/seller/wallet" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                        <FaWallet className="text-base" /> <span className="text-sm">Wallet</span>
                      </Link>
                      <Link to="/seller/payment-history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                        <FaHistory className="text-base" /> <span className="text-sm">Payment History</span>
                      </Link>
                    </>
                  )}

                  <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-all duration-200">
                    <FaSignOutAlt className="text-base" /> <span className="text-sm">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/shop/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                    <FaUser className="text-base" /> <span className="text-sm">Login</span>
                  </Link>
                  <Link to="/shop/signup" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center w-full px-3 py-2.5 mt-2 rounded-xl text-white font-semibold bg-[#0043FC] hover:bg-[#0033cc] transition-all duration-200 text-sm">
                    Sign Up
                  </Link>
                </>
              )}

              <div className="border-t border-gray-100 my-2"></div>
              <Link to="/shop/help" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                <FaQuestionCircle className="text-base" /> <span className="text-sm">Help Center</span>
              </Link>
              <Link to="/shop/cart" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-[#0043FC] transition-all duration-200">
                <div className="relative">
                  <FaShoppingCart className="text-base" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#0043FC] text-white text-[9px] font-bold flex items-center justify-center">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </div>
                <span className="text-sm">My Cart</span>
              </Link>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-center text-gray-500">Need help? Contact our support team</p>
              <p className="text-[10px] text-center text-gray-400 mt-1">© 2024 Úduua. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopNavbar;