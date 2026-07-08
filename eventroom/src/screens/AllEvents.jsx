// screens/AllEvents.jsx – Full updated version (no subdomain)
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGetEventsQuery } from '../slices/eventApiSlice';
import {
  FaCalendarAlt, FaMapMarkerAlt, FaClock, FaTicketAlt,
  FaSpinner, FaArrowRight, FaSearch, FaTimes,
  FaSlidersH, FaWifi, FaExclamationTriangle, FaPhone,
  FaEnvelope, FaDoorOpen, FaFire,
} from 'react-icons/fa';
import AllEventsNavbar from '../components/AllEventsNavbar';
import EventUpcomingGrid from '../components/EventUpcomingGrid';
import Footer from '../components/Footer';

// ==================== HELPER: Check if event is happening today ====================
const isEventToday = (event) => {
  if (!event.date) return false;
  const today = new Date();
  const eventDate = new Date(event.date);
  return today.toDateString() === eventDate.toDateString();
};

// ==================== HELPER: Check if event is still upcoming (not passed) ====================
const isEventUpcoming = (event) => {
  if (!event.date) return false;
  
  const now = new Date();
  const eventDate = new Date(event.date);
  
  if (event.time) {
    const [hours, minutes] = event.time.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);
  } else {
    eventDate.setHours(0, 0, 0, 0);
  }
  
  return now < eventDate;
};

// ==================== HELPER: Get events happening today (that haven't passed yet) ====================
const getTodaysEvents = (events) => {
  return events.filter(event => isEventToday(event) && isEventUpcoming(event));
};

// ==================== SKELETON COMPONENTS ====================
const DesktopCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-pulse">
    <div className="aspect-[16/10] bg-gray-200" />
    <div className="p-4 flex-1 flex flex-col space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-12 bg-gray-200 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-gray-200 rounded" />
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-2/3 bg-gray-200 rounded" />
      <div className="space-y-1 pt-2">
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-16 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

const MobileCardSkeleton = () => (
  <div className="flex gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3 animate-pulse">
    <div className="w-28 h-24 flex-shrink-0 rounded-lg bg-gray-200" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-12 bg-gray-200 rounded" />
        <div className="h-2.5 w-8 bg-gray-200 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
      <div className="h-3 w-1/2 bg-gray-200 rounded" />
      <div className="h-3 w-2/3 bg-gray-200 rounded" />
      <div className="flex items-center justify-between pt-1.5">
        <div className="h-2.5 w-16 bg-gray-200 rounded" />
        <div className="h-2.5 w-12 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

const TodayCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-pulse">
    <div className="aspect-[4/3] bg-gray-200" />
    <div className="p-3 space-y-2">
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
      <div className="h-3 w-1/2 bg-gray-200 rounded" />
      <div className="h-3 w-2/3 bg-gray-200 rounded" />
    </div>
  </div>
);

const FeaturedSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-md animate-pulse">
        <div className="aspect-[3/4] bg-gray-200" />
      </div>
    ))}
  </div>
);
// =========================================================

// ==================== ERROR COMPONENT ====================
const ErrorState = ({ error, onRetry }) => {
  const isNetworkError = !error?.status || error?.status === 'FETCH_ERROR' || error?.error?.includes('fetch') || error?.error?.includes('network');

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-6">
          {isNetworkError ? (
            <FaWifi className="text-3xl text-red-400" />
          ) : (
            <FaExclamationTriangle className="text-3xl text-red-400" />
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isNetworkError ? 'Connection Issue' : 'Something Went Wrong'}
        </h2>

        <p className="text-gray-500 text-sm mb-2 leading-relaxed">
          {isNetworkError
            ? "We couldn't load the events. Please check your internet connection and try again."
            : "We encountered an error while loading events. Our team has been notified."}
        </p>

        {error?.data?.message && (
          <p className="text-red-500 text-xs mb-4 bg-red-50 px-3 py-2 rounded-lg inline-block">
            {error.data.message}
          </p>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={onRetry}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#1B3766] text-white rounded-xl font-semibold text-sm hover:bg-[#142952] transition-all shadow-md"
          >
            Try Again
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-3 font-medium">Need help? Contact support:</p>
          <div className="space-y-2">
            <a
              href="mailto:support@lovohcreate.com"
              className="flex items-center justify-center gap-2 text-sm text-[#1B3766] hover:underline"
            >
              <FaEnvelope className="text-xs" />
              support@lovohcreate.com
            </a>
            <a
              href="https://wa.me/2348058586759"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-green-600 hover:underline"
            >
              <FaPhone className="text-xs" />
              WhatsApp: 08058586759
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
// =========================================================

const AllEvents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const location = useLocation();
  const { data: eventsData, isLoading, error, refetch } = useGetEventsQuery({
    limit: 100, // Fetch more events to get today's events
  });

  // ==================== SCROLL TO TOP ON PAGE LOAD ====================
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // Use 'auto' for instant scroll, 'smooth' for animated
    });
  }, [location.pathname]); // Re-run when the pathname changes

  const events = eventsData?.events || [];
  
  // Get today's events (that haven't passed yet)
  const todaysEvents = useMemo(() => getTodaysEvents(events), [events]);
  
  const categories = [...new Set(events.map(e => e.category).filter(Boolean))];
  const eventTypes = [...new Set(events.map(e => e.eventType).filter(Boolean))];

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    const matchesType = typeFilter === 'all' || event.eventType === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
  
  const formatTimeForDisplay = (time) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes) || 0);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return time;
    }
  };

  const getEventPriceDisplay = (e) => {
    if (e.ticketTypes?.length > 0) {
      const prices = e.ticketTypes.map(t => t.price).filter(p => p > 0);
      if (prices.length === 0) return 'Free';
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? `₦${min.toLocaleString()}` : `₦${min.toLocaleString()}+`;
    }
    return e.isPaid && e.price > 0 ? `₦${e.price.toLocaleString()}` : 'Free';
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchTerm || categoryFilter !== 'all' || typeFilter !== 'all';

  // ==================== LOADING STATE ====================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AllEventsNavbar />
        <div className="pt-14 sm:pt-16">
          {/* Featured Skeleton */}
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-3 h-3 bg-green-200 rounded-full animate-pulse" />
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-8 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <FeaturedSkeleton />
            </div>
          </section>

          {/* Today's Events Skeleton */}
          <section className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-8 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => <TodayCardSkeleton key={i} />)}
              </div>
            </div>
          </section>

          {/* All Events Skeleton */}
          <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="h-9 w-48 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-9 w-32 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-9 w-28 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              </div>

              {/* Desktop Skeletons */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <DesktopCardSkeleton key={i} />
                ))}
              </div>

              {/* Mobile Skeletons */}
              <div className="sm:hidden space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <MobileCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </section>
        </div>
        <Footer />
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AllEventsNavbar />
        <div className="pt-14 sm:pt-16">
          <ErrorState error={error} onRetry={refetch} />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AllEventsNavbar />

      {/* Main Content - with top padding for fixed navbar */}
      <div className="pt-14 sm:pt-16">
        {/* Featured Events Section */}
        <EventUpcomingGrid />

        {/* EVENTS HAPPENING TODAY - New Section */}
        {todaysEvents.length > 0 && (
          <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-50/50 to-transparent">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <FaFire className="text-white text-sm" />
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Happening Today</h2>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold">
                  {todaysEvents.length}
                </span>
                <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-orange-200 to-transparent ml-4" />
              </div>
              
              {/* Desktop: 4 columns grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {todaysEvents.slice(0, 4).map(event => (
                  <Link
                    key={event._id}
                    to={`/${event.slug}`}
                    className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 border border-gray-100"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {event.images?.[0] ? (
                        <img 
                          src={event.images[0]} 
                          alt={event.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-yellow-100">
                          <FaCalendarAlt className="text-4xl text-orange-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      
                      {/* Live indicator */}
                      <div className="absolute top-3 left-3 flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-white text-[10px] font-bold bg-red-500/80 px-1.5 py-0.5 rounded-full">LIVE</span>
                      </div>
                      
                      {/* Time badge */}
                      {event.time && (
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                          <FaClock className="text-[10px]" />
                          {formatTimeForDisplay(event.time)}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1 group-hover:text-orange-600 transition-colors">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <FaMapMarkerAlt className="text-orange-500 text-[8px]" />
                          <span className="truncate">{event.venue || event.location || 'TBD'}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs font-bold text-orange-600">
                          {getEventPriceDisplay(event)}
                        </span>
                        <span className="text-orange-600 text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Register <FaArrowRight className="text-[8px]" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Mobile: Horizontal scroll for today's events */}
              <div className="sm:hidden overflow-x-auto -mx-4 px-4">
                <div className="flex gap-3">
                  {todaysEvents.slice(0, 6).map(event => (
                    <Link
                      key={event._id}
                      to={`/${event.slug}`}
                      className="flex-shrink-0 w-64 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                    >
                      <div className="relative h-32">
                        {event.images?.[0] ? (
                          <img src={event.images[0]} alt={event.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-yellow-100">
                            <FaCalendarAlt className="text-3xl text-orange-300" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                          </span>
                          <span className="text-white text-[8px] font-bold bg-red-500/80 px-1 py-0.5 rounded-full">LIVE</span>
                        </div>
                        {event.time && (
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <FaClock className="text-[7px]" />
                            {formatTimeForDisplay(event.time)}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-bold text-gray-900 text-xs line-clamp-2 mb-0.5">{event.title}</h3>
                        <p className="text-[9px] text-gray-500 truncate">{event.venue || event.location || 'TBD'}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] font-bold text-orange-600">{getEventPriceDisplay(event)}</span>
                          <span className="text-orange-600 text-[9px]">Register →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              
              {todaysEvents.length > 4 && (
                <div className="mt-4 text-center sm:hidden">
                  <Link to="/all-events" className="text-xs text-orange-600 font-medium">
                    View all {todaysEvents.length} events → 
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* All Events List Section */}
        <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">All Events</h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Desktop Filters */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input 
                    type="text" 
                    placeholder="Search events..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 lg:w-56 pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3766]" 
                  />
                  {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><FaTimes className="text-xs" /></button>}
                </div>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)} 
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3766]"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value)} 
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3766]"
                >
                  <option value="all">All Types</option>
                  {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Events Grid - Desktop Cards */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <FaCalendarAlt className="text-5xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
                  <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <Link key={event._id} to={`/${event.slug}`}
                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
                    <div className="aspect-[16/10] relative overflow-hidden bg-gray-100">
                      {event.images?.[0] ? (
                        <img src={event.images[0]} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1B3766]/10 to-blue-100"><FaCalendarAlt className="text-5xl text-[#1B3766]/30" /></div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-md ${event.isPaid || event.ticketTypes?.length > 0 ? 'bg-white text-[#1B3766]' : 'bg-green-500 text-white'}`}>{getEventPriceDisplay(event)}</span>
                      </div>
                      {event.featured && <div className="absolute top-3 left-3"><span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">⭐ Featured</span></div>}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{event.eventType}</span>
                        <span className="text-[10px] text-gray-400">{event.category}</span>
                        {event.ticketTypes?.length > 0 && <span className="text-[9px] text-purple-600 font-medium"><FaTicketAlt className="inline text-[7px] mr-0.5" />{event.ticketTypes.length}</span>}
                      </div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[#1B3766] transition-colors line-clamp-2 mb-2 flex-1">{event.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{stripHtml(event.description)?.substring(0, 100)}</p>
                      <div className="text-[10px] text-gray-500 space-y-1 mb-3">
                        <div className="flex items-center gap-1"><FaCalendarAlt className="text-[#1B3766] text-[10px]" />{formatDate(event.date)} • {event.time || 'TBD'}</div>
                        <div className="flex items-center gap-1"><FaMapMarkerAlt className="text-[#1B3766] text-[10px]" /><span className="truncate">{event.venue || event.location}</span></div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <FaDoorOpen className="text-[#1B3766] text-[10px]" /> EventRoom
                        </span>
                        <span className="text-[#1B3766] font-semibold text-xs group-hover:gap-1.5 transition-all flex items-center gap-1">View <FaArrowRight className="text-[10px]" /></span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Events List - Mobile */}
            <div className="sm:hidden space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <FaCalendarAlt className="text-5xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
                  <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <Link key={event._id} to={`/${event.slug}`}
                    className="group flex gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition-all duration-300">
                    <div className="w-28 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                      {event.images?.[0] ? (
                        <img src={event.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1B3766]/10 to-blue-100"><FaCalendarAlt className="text-2xl text-[#1B3766]/30" /></div>
                      )}
                      <div className="absolute top-1.5 right-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${event.isPaid || event.ticketTypes?.length > 0 ? 'bg-white text-[#1B3766]' : 'bg-green-500 text-white'}`}>{getEventPriceDisplay(event)}</span>
                      </div>
                      {event.featured && <div className="absolute top-1.5 left-1.5"><span className="bg-yellow-400 text-yellow-900 text-[7px] font-bold px-1 py-0.5 rounded-full">⭐</span></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-semibold text-blue-600 uppercase">{event.eventType}</span>
                        {event.ticketTypes?.length > 0 && <span className="text-[8px] text-purple-600"><FaTicketAlt className="inline text-[6px]" />{event.ticketTypes.length}</span>}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{event.title}</h3>
                      <div className="text-[10px] text-gray-500 space-y-0.5">
                        <div className="flex items-center gap-1"><FaCalendarAlt className="text-[#1B3766] text-[9px]" />{formatDate(event.date)} • {event.time || 'TBD'}</div>
                        <div className="flex items-center gap-1"><FaMapMarkerAlt className="text-[#1B3766] text-[9px]" /><span className="truncate">{event.venue || event.location}</span></div>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-50">
                        <span className="text-[9px] text-gray-500 flex items-center gap-1">
                          <FaDoorOpen className="text-[#1B3766] text-[8px]" /> EventRoom
                        </span>
                        <span className="text-[#1B3766] font-semibold text-[10px] flex items-center gap-0.5">View <FaArrowRight className="text-[8px]" /></span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Floating Filter Button */}
      <div className="sm:hidden fixed bottom-6 right-4 z-30 flex flex-col items-end gap-3">
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-72 animate-fadeInUp">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-red-500 font-medium">Clear</button>}
                <button onClick={() => setShowFilters(false)} className="p-1 text-gray-400 hover:text-gray-600"><FaTimes className="text-xs" /></button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input 
                  type="text" 
                  placeholder="Search events..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766]" 
                />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><FaTimes className="text-xs" /></button>}
              </div>
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)} 
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766]"
              >
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)} 
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766]"
              >
                <option value="all">All Types</option>
                {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        )}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            showFilters ? 'bg-gray-800 text-white rotate-90' : 'bg-[#1B3766] text-white'
          } ${hasActiveFilters && !showFilters ? 'ring-4 ring-[#1B3766]/30' : ''}`}>
          <FaSlidersH className="text-lg" />
        </button>
        {hasActiveFilters && !showFilters && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.3s ease-out; }
      `}</style>

      <Footer />
    </div>
  );
};

export default AllEvents;