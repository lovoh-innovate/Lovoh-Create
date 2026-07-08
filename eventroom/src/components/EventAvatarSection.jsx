// components/EventAvatarSection.jsx – Avatar creation strip with brand colors
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FaUserAstronaut, 
  FaArrowRight, 
  FaImage,
  FaCamera,
  FaUsers,
  FaUpload,
  FaUserPlus,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

const EventAvatarSection = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Array of avatar images
  const avatarImages = [
    '/avatar.jpg',
    '/avatar1.jpg',
    '/avatar2.jpg',
    '/avatar3.jpg',
    '/avatar4.jpg',
    '/avatar5.jpg',
    '/avatar6.jpg'
  ];

  const getStartedLink = userInfo ? '/dashboard/events/new' : '/signup';
  const getStartedText = userInfo ? 'Create Your Badge' : 'Start Creating';

  // Auto-slide functionality
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % avatarImages.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(timer);
  }, [avatarImages.length]);

  const goToPrevious = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + avatarImages.length) % avatarImages.length);
  }, [avatarImages.length]);

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % avatarImages.length);
  }, [avatarImages.length]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  return (
    <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 flex items-center overflow-hidden bg-[#0a1f44]">
      
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f44]/95 via-[#0a1f44]/90 to-[#0a1f44]/95" />
      
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent animate-pulse-slow pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-500/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-r from-blue-500/5 to-transparent" />

      <div className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        {/* Left Column - Text Content */}
        <div className="text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-6">
            <FaUserAstronaut className="text-cyan-300 text-sm" />
            <span className="text-white text-sm font-medium">EventRoom Avatars</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight">
            Your{' '}
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Event Badge
            </span>
            <br />
            <span className="text-white/90">in Seconds</span>
          </h2>

          {/* Description */}
          <p className="max-w-lg mx-auto lg:mx-0 text-gray-300 text-base sm:text-lg mb-6 leading-relaxed">
            Upload your photo and name. We'll generate a professional event badge 
            that makes you stand out at any event.
          </p>

          {/* Feature tags - using brand colors */}
          <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-200 text-xs font-medium">
              <FaUpload className="text-xs" /> Photo Upload
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200 text-xs font-medium">
              <FaUserPlus className="text-xs" /> Add Name
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-200 text-xs font-medium">
              <FaCamera className="text-xs" /> Instant Share
            </span>
          </div>

          {/* CTA Button - Using brand cyan colors like in CTA section */}
          <Link
            to={getStartedLink}
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-[#0a1f44] px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-400/30"
          >
            {getStartedText}
            <FaArrowRight className="group-hover:translate-x-1 transition-transform text-sm" />
          </Link>

          {/* Trust indicator */}
          <p className="text-gray-400 text-xs mt-4 flex items-center justify-center lg:justify-start gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block" />
            Free to use • No credit card required
          </p>
        </div>

        {/* Right Column - Slider */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md">
            {/* Glow effect behind image */}
            <div className="absolute -inset-4 bg-cyan-500/20 rounded-2xl blur-3xl" />
            
            {/* Image container with slider */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0a1f44]">
              {/* Slides */}
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {avatarImages.map((image, index) => (
                  <div key={index} className="min-w-full">
                    <img
                      src={image}
                      alt={`Event avatar example ${index + 1}`}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = '/avatar.jpg'; // Fallback to default if image fails to load
                      }}
                    />
                  </div>
                ))}
              </div>
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f44]/60 via-transparent to-transparent pointer-events-none" />
              
              {/* Navigation Arrows */}
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all duration-200 border border-white/10 text-white hover:scale-110"
                aria-label="Previous slide"
              >
                <FaChevronLeft className="text-sm" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all duration-200 border border-white/10 text-white hover:scale-110"
                aria-label="Next slide"
              >
                <FaChevronRight className="text-sm" />
              </button>

              {/* Dots indicator */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {avatarImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      currentSlide === index 
                        ? 'bg-cyan-400 w-6' 
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              
              {/* Floating badge on image */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-lg rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 border-2 border-[#0a1f44]" />
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 border-2 border-[#0a1f44]" />
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 border-2 border-[#0a1f44]" />
                    </div>
                    <span className="text-white text-xs font-medium">1,234+ created</span>
                  </div>
                  <span className="px-3 py-1 bg-cyan-500/30 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-cyan-400/30">
                    <FaUsers className="inline mr-1 text-cyan-300 text-xs" />
                    Popular
                  </span>
                </div>
              </div>
            </div>

            {/* Top floating badge */}
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl px-4 py-2 shadow-xl border border-white/20">
              <div className="flex items-center gap-2">
                <FaCamera className="text-[#0a1f44] text-xs" />
                <span className="text-[#0a1f44] text-xs font-bold">Photo Upload</span>
              </div>
            </div>

            {/* Live indicator */}
            <div className="absolute -top-3 -left-3 bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white text-xs font-medium">Live</span>
              </div>
            </div>

            {/* Slide counter */}
            <div className="absolute bottom-24 right-3 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-white/10">
              <span className="text-white text-xs font-medium">
                {currentSlide + 1} / {avatarImages.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default EventAvatarSection;