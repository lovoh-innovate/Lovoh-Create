// components/Header.jsx – Cross‑domain + Logo animation + Sub‑brand grid dropdown
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

// --- Domain constants ---
const MAIN_DOMAIN = "https://lovohcreate.com";
const SUBDOMAINS = {
  biizzed: "https://biizzed.lovohcreate.com",
  uduua: "https://uduua.lovohcreate.com",
  events: "https://eventroom.lovohcreate.com",
};

// Sub‑brands data
const SUB_BRANDS = [
  { id: "biizzed", name: "Biizzed", path: "/biizzed", icon: "/biizzed.png" },
  { id: "uduua", name: "Uduua", path: "/uduua", icon: "/uduua.png" },
  { id: "events", name: "EventRoom", path: "/events", icon: "/eventroom.png" },
];

// Detect current subdomain
const getCurrentSubdomain = () => {
  const hostname = window.location.hostname;
  if (hostname.includes("biizzed")) return "biizzed";
  if (hostname.includes("uduua")) return "uduua";
  if (hostname.includes("eventroom")) return "events";
  return null;
};
const currentSub = getCurrentSubdomain();

// Helper: get URL for a main‑domain path (always absolute to MAIN_DOMAIN when on subdomain)
const getMainDomainUrl = (path) => `${MAIN_DOMAIN}${path}`;
const getSubdomainUrl = (brand) => SUBDOMAINS[brand] || MAIN_DOMAIN;

// Decide link href (for cross‑domain navigation)
const getLinkHref = (to) => {
  const mainPages = ["/", "/about", "/work", "/services", "/contact"];
  if (mainPages.includes(to)) {
    if (currentSub !== null) return getMainDomainUrl(to);
    return to;
  }
  if (to === "/biizzed") return getSubdomainUrl("biizzed");
  if (to === "/uduua") return getSubdomainUrl("uduua");
  if (to === "/events") return getSubdomainUrl("events");
  return to;
};

// Map subdomain to logo (used when on that subdomain)
const subdomainLogoMap = {
  events: "/eventroom.png",
  biizzed: "/biizzed.png",
  uduua: "/uduua.png",
};

// Get target logo based on subdomain and path (main domain)
const getTargetLogo = (pathname, sub) => {
  if (sub !== null) {
    return subdomainLogoMap[sub] || "/logo.png";
  }
  if (pathname.startsWith("/uduua")) return "/uduua.png";
  if (pathname.startsWith("/thefruiit")) return "/thefruiit-logo.png";
  if (pathname.startsWith("/biizzed")) return "/biizzed.png";
  if (pathname.startsWith("/events")) return "/eventroom.png";
  return "/logo.png";
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubBrandsOpen, setIsSubBrandsOpen] = useState(false);
  const [currentLogo, setCurrentLogo] = useState("/logo.png");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const subBrandsRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const navContainerRef = useRef(null);

  // Animate logo change based on path/subdomain
  useEffect(() => {
    const targetLogo = getTargetLogo(location.pathname, currentSub);
    if (targetLogo === currentLogo) return;

    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setCurrentLogo(targetLogo);
      setIsTransitioning(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname, currentLogo]);

  const closeAllMenus = useCallback(() => {
    setIsMenuOpen(false);
    setIsSubBrandsOpen(false);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNavigation = useCallback(
    (to) => {
      closeAllMenus();
      const href = getLinkHref(to);
      if (href.startsWith("http")) {
        window.location.href = href;
      } else {
        navigate(to);
        scrollToTop();
      }
    },
    [closeAllMenus, navigate, scrollToTop]
  );

  // Close menus on route change
  useEffect(() => {
    closeAllMenus();
  }, [location.pathname, closeAllMenus]);

  // Desktop: click outside closes dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth < 768) return;
      if (subBrandsRef.current && !subBrandsRef.current.contains(event.target)) {
        setIsSubBrandsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mobile: click outside closes everything
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target)) {
        closeAllMenus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [isMenuOpen, closeAllMenus]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  // ESC key closes everything
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeAllMenus();
        mobileMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, closeAllMenus]);

  const toggleSubBrands = () => setIsSubBrandsOpen((prev) => !prev);
  const toggleMobileMenu = () => setIsMenuOpen((prev) => !prev);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 lg:px-8 pt-4">
      <nav className="max-w-7xl mx-auto" ref={navContainerRef}>
        <div className="relative rounded-full bg-white/95 backdrop-blur-md border border-blue-100 shadow-[0_10px_35px_rgba(37,72,153,0.10)] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo – NO LONGER A LINK */}
            <div className="flex-shrink-0">
              <div className="flex items-center relative w-32 h-8 cursor-default">
                <img
                  src={currentLogo}
                  alt="Lovoh Create"
                  className={`absolute inset-0 h-8 w-auto object-contain transition-opacity duration-300 ${
                    isTransitioning ? "opacity-0" : "opacity-100"
                  }`}
                  onError={(e) => { e.target.src = "/logo.png"; }}
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <button
                onClick={() => handleNavigation("/")}
                className="text-gray-700 hover:text-blue-700 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 hover:bg-blue-50"
              >
                Welcome
              </button>
              <button
                onClick={() => handleNavigation("/about")}
                className="text-gray-700 hover:text-blue-700 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 hover:bg-blue-50"
              >
                About
              </button>
              <button
                onClick={() => handleNavigation("/work")}
                className="text-gray-700 hover:text-blue-700 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 hover:bg-blue-50"
              >
                Our Works
              </button>
              <button
                onClick={() => handleNavigation("/services")}
                className="text-gray-700 hover:text-blue-700 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 hover:bg-blue-50"
              >
                Services
              </button>

              {/* Sub‑brands grid button */}
              <div className="relative" ref={subBrandsRef}>
                <button
                  onClick={toggleSubBrands}
                  className="flex items-center justify-center text-gray-700 hover:text-blue-700 p-2 rounded-full transition-all duration-200 hover:bg-blue-50"
                  aria-label="Sub-brands"
                >
                  <GridIcon />
                </button>
                {isSubBrandsOpen && (
                  <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-3xl shadow-[0_20px_45px_rgba(0,0,0,0.10)] border border-blue-100 p-3 z-50">
                    {/* Added "Our Brands" label here */}
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold px-1 mb-3">
                      Our Brands
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {SUB_BRANDS.map((brand) => (
                        <button
                          key={brand.id}
                          onClick={() => handleNavigation(brand.path)}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-blue-50 transition-all duration-200"
                        >
                          <img
                            src={brand.icon}
                            alt={brand.name}
                            className="w-10 h-10 object-contain mb-1"
                            onError={(e) => { e.target.src = "/logo.png"; }}
                          />
                          <span className="text-xs font-medium text-gray-700">{brand.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNavigation("/contact")}
                className="ml-2 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
              >
                Contact
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                ref={mobileMenuButtonRef}
                onClick={toggleMobileMenu}
                className="relative z-50 inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 focus:outline-none transition-all duration-200"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {!isMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={closeAllMenus} />
              <div
                ref={mobileMenuRef}
                className="absolute top-full left-0 right-0 mt-2 md:hidden z-50 animate-in slide-in-from-top-2 duration-200"
              >
                <div className="bg-white rounded-2xl border border-blue-100 shadow-xl p-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-1">
                    <button
                      onClick={() => handleNavigation("/")}
                      className="w-full text-left text-gray-700 hover:text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200"
                    >
                      Welcome
                    </button>
                    <button
                      onClick={() => handleNavigation("/about")}
                      className="w-full text-left text-gray-700 hover:text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200"
                    >
                      About
                    </button>
                    <button
                      onClick={() => handleNavigation("/work")}
                      className="w-full text-left text-gray-700 hover:text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200"
                    >
                      Our Works
                    </button>
                    <button
                      onClick={() => handleNavigation("/services")}
                      className="w-full text-left text-gray-700 hover:text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200"
                    >
                      Services
                    </button>

                    {/* Mobile sub‑brands – shown as a grid inside the menu */}
                    <div className="pt-2 pb-1">
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold px-4 mb-2">
                        Our Brands
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {SUB_BRANDS.map((brand) => (
                          <button
                            key={brand.id}
                            onClick={() => handleNavigation(brand.path)}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-all duration-200"
                          >
                            <img
                              src={brand.icon}
                              alt={brand.name}
                              className="w-8 h-8 object-contain mb-1"
                              onError={(e) => { e.target.src = "/logo.png"; }}
                            />
                            <span className="text-xs font-medium text-gray-700">{brand.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavigation("/contact")}
                      className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-500 text-white px-4 py-3 rounded-xl text-base font-semibold text-center transition-all duration-200 mt-2 shadow-md hover:shadow-lg"
                    >
                      Contact
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;