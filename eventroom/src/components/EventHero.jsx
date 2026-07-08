// components/EventHero.jsx – Conditional create/login button
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetEventsQuery } from '../slices/eventApiSlice';
import { FaPlus, FaArrowRight, FaTicketAlt, FaUserFriends, FaStar, FaGlobe, FaUsers, FaCalendarAlt } from 'react-icons/fa';

// ==================== FEATURED CARD SKELETON ====================
const FeaturedCardSkeleton = () => (
  <div className="relative bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl max-w-md mx-auto lg:mx-0 animate-pulse">
    <div className="relative h-48 xs:h-56 sm:h-64 overflow-hidden bg-gray-700">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
        <div className="bg-white/20 w-20 h-6 rounded-full" />
      </div>
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex flex-col gap-1.5 items-end">
        <div className="bg-white/20 w-16 h-5 rounded-full" />
        <div className="bg-white/20 w-14 h-5 rounded-full" />
      </div>
    </div>
    <div className="p-4 sm:p-5 space-y-3">
      <div className="h-6 w-3/4 bg-white/10 rounded" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/10 rounded" />
        <div className="h-4 w-2/3 bg-white/10 rounded" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="h-6 w-16 bg-white/10 rounded" />
        <div className="h-8 w-24 bg-white/10 rounded-lg" />
      </div>
    </div>
  </div>
);

const EventHero = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { data: eventsData, isLoading } = useGetEventsQuery({ upcoming: 'true' });

  const [featuredEvent, setFeaturedEvent] = useState(null);

  useEffect(() => {
    if (eventsData?.events && eventsData.events.length > 0) {
      const events = eventsData.events;
      const now = new Date();
      const upcoming = events.filter(event => new Date(event.date) >= now);

      const featured = upcoming.find(e => e.featured) || upcoming[0] || events[0];
      if (featured) {
        let priceDisplay = 'Free';
        if (featured.ticketTypes?.length > 0) {
          const prices = featured.ticketTypes.map(t => t.price).filter(p => p > 0);
          if (prices.length > 0) {
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            priceDisplay = min === max ? `₦${min.toLocaleString()}` : `₦${min.toLocaleString()}+`;
          }
        } else if (featured.isPaid && featured.price > 0) {
          priceDisplay = `₦${featured.price.toLocaleString()}`;
        }

        setFeaturedEvent({
          title: featured.title,
          date: new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          time: featured.time || '',
          location: featured.venue || featured.location,
          price: priceDisplay,
          image: featured.images?.[0] || '/campus2.jpg',
          slug: featured.slug,
          category: featured.category,
          eventType: featured.eventType,
          hasTicketTypes: featured.ticketTypes?.length > 0,
          ticketTypesCount: featured.ticketTypes?.length || 0,
          enableMultipleTickets: featured.enableMultipleTickets,
        });
      }
    }
  }, [eventsData]);

  const handleExploreEvents = () => {
    document.getElementById('events-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateEvent = () => {
    if (userInfo) {
      navigate('/dashboard');
    } else {
      navigate('/login?redirect=/dashboard');
    }
  };

  return (
    <section className="relative w-full min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 w-full h-full">
        <img src="/campus1.jpg" alt="Events Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-20 left-10 w-20 h-20 bg-[#79FFFF]/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[#79FFFF]/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-white/5 rounded-full blur-xl animate-bounce-slow"></div>
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-8 md:py-8 mt-13">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#79FFFF]/20 backdrop-blur-sm border border-[#79FFFF]/30 rounded-full px-3 sm:px-4 py-1.5 mb-4 sm:mb-6 mx-auto lg:mx-0 w-fit animate-fadeInUp">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#79FFFF] rounded-full animate-pulse"></div>
              <span className="text-[#79FFFF] font-semibold text-[10px] sm:text-xs uppercase tracking-wider">Discover Events Worldwide</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3 sm:mb-4 animate-fadeInUp animation-delay-100">
              Events That{' '}<span className="text-[#79FFFF]">Inspire & Connect</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-lg leading-relaxed mb-6 sm:mb-8 mx-auto lg:mx-0 animate-fadeInUp animation-delay-200">
              Discover events hosted by creators, businesses, and communities worldwide.
              From networking meetups to global conferences — or create your own.
            </p>

            {/* Value Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8 animate-fadeInUp animation-delay-300">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-2 sm:p-4 text-center hover:bg-white/10 transition-colors">
                <FaGlobe className="text-[#79FFFF] text-xl sm:text-2xl mx-auto mb-1 sm:mb-2" />
                <p className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">Worldwide</p>
                <p className="text-gray-400 text-[10px] sm:text-xs hidden xs:block">Events from anywhere</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-2 sm:p-4 text-center hover:bg-white/10 transition-colors">
                <FaUsers className="text-[#79FFFF] text-xl sm:text-2xl mx-auto mb-1 sm:mb-2" />
                <p className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">Real Hosts</p>
                <p className="text-gray-400 text-[10px] sm:text-xs hidden xs:block">Creators & communities</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-2 sm:p-4 text-center hover:bg-white/10 transition-colors">
                <FaStar className="text-[#79FFFF] text-xl sm:text-2xl mx-auto mb-1 sm:mb-2" />
                <p className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">Free or Paid</p>
                <p className="text-gray-400 text-[10px] sm:text-xs hidden xs:block">Choose your fit</p>
              </div>
            </div>

            {/* Buttons – conditional text based on auth */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fadeInUp animation-delay-400">
              <Link to="/all-events"
                className="bg-white hover:bg-gray-100 text-[#1B3766] px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 shadow-lg w-full sm:w-auto">
                Explore Events
              </Link>

              {userInfo ? (
                <button onClick={handleCreateEvent}
                  className="bg-[#79FFFF] hover:bg-[#5ee8e8] text-[#1B3766] px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 w-full sm:w-auto group">
                  <FaPlus className="text-xs sm:text-sm" /> Create Event <FaArrowRight className="text-xs sm:text-sm group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button onClick={handleCreateEvent}
                  className="bg-[#79FFFF] hover:bg-[#5ee8e8] text-[#1B3766] px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 w-full sm:w-auto group">
                  Login to Create Event <FaArrowRight className="text-xs sm:text-sm group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column – Featured Event Card */}
          <div className="animate-fadeInUp animation-delay-200 mt-8 lg:mt-0">
            {isLoading ? (
              <FeaturedCardSkeleton />
            ) : featuredEvent ? (
              <Link to={`/${featuredEvent.slug}`} className="block group">
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-500 hover:scale-[1.02] max-w-md mx-auto lg:mx-0">
                  <div className="relative h-48 xs:h-56 sm:h-64 overflow-hidden">
                    <img src={featuredEvent.image} alt={featuredEvent.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                      <span className="bg-white/90 backdrop-blur-sm text-[#1B3766] px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-lg flex items-center gap-1">
                        <FaStar className="text-[8px] sm:text-[10px] text-yellow-500" /> Featured
                      </span>
                    </div>

                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex flex-col gap-1 sm:gap-1.5 items-end">
                      {featuredEvent.category && (
                        <span className="bg-white/20 backdrop-blur-sm text-white px-2 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[10px]">{featuredEvent.category}</span>
                      )}
                      {featuredEvent.eventType && (
                        <span className="bg-white/20 backdrop-blur-sm text-white px-2 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[10px]">{featuredEvent.eventType}</span>
                      )}
                    </div>

                    {featuredEvent.hasTicketTypes && (
                      <div className="absolute bottom-12 sm:bottom-16 left-3 sm:left-4">
                        <span className="bg-purple-500/80 backdrop-blur-sm text-white text-[8px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1">
                          <FaTicketAlt className="text-[6px] sm:text-[8px]" />{featuredEvent.ticketTypesCount} ticket types
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-white/90 transition-colors line-clamp-2">
                      {featuredEvent.title}
                    </h3>

                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{featuredEvent.date}{featuredEvent.time ? ` at ${featuredEvent.time}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{featuredEvent.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg sm:text-xl font-bold text-white">{featuredEvent.price}</span>
                        {featuredEvent.enableMultipleTickets && (
                          <span className="text-[8px] sm:text-[10px] text-white/50 ml-1 sm:ml-2 flex items-center gap-0.5">
                            <FaUserFriends className="text-[7px] sm:text-[8px]" />Multi-buy
                          </span>
                        )}
                      </div>
                      <span className="text-white/80 text-xs sm:text-sm bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium group-hover:bg-white/20 transition-colors border border-white/20">
                        View Details →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="relative bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl max-w-md mx-auto lg:mx-0 p-8 text-center">
                <FaCalendarAlt className="text-4xl text-white/30 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Events Yet</h3>
                <p className="text-gray-300 text-sm mb-4">Be the first to create an event!</p>
                <button onClick={handleCreateEvent}
                  className="bg-[#79FFFF] hover:bg-[#5ee8e8] text-[#1B3766] px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">
                  {userInfo ? 'Create Event' : 'Login to Create'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes bounce-slow { 
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(-20px); } 
        }
        .animate-fadeInUp { 
          animation: fadeInUp 0.6s ease-out forwards; 
          opacity: 0; 
        }
        .animation-delay-100 { animation-delay: 0.1s; } 
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; } 
        .animation-delay-400 { animation-delay: 0.4s; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .delay-1000 { animation-delay: 1s; }
        
        @media (min-width: 480px) {
          .xs\\:block { display: block; }
        }
        @media (max-width: 479px) {
          .xs\\:block { display: none; }
        }
      `}</style>
    </section>
  );
};

export default EventHero;