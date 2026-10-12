// screens/IWillAttend.jsx
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FaSpinner, FaImage, FaUserCircle, FaPaintBrush,
  FaDownload, FaTimes, FaArrowLeft, FaCheckCircle, FaMagic,
  FaUpload, FaRedo, FaShareAlt,
} from 'react-icons/fa';
import { useGeneratePublicPosterMutation } from '../slices/aiApiSlice';
import { toast } from 'react-toastify';
import AllEventsNavbar from '../components/AllEventsNavbar';
import Footer from '../components/Footer';

const IWillAttend = () => {
  const designInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const [generatePublicPoster, { isLoading: isGenerating }] =
    useGeneratePublicPosterMutation();

  // Step 1 — design
  const [designFile, setDesignFile] = useState(null);
  const [designPreview, setDesignPreview] = useState('');

  // Step 2 — user details
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [name, setName] = useState('');

  // Result
  const [posterUrl, setPosterUrl] = useState(null);
  const [confidence, setConfidence] = useState(null);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleDesignSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Design must be an image (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Design must be under 8MB.');
      return;
    }
    setDesignFile(file);
    setPosterUrl(null);
    const reader = new FileReader();
    reader.onloadend = () => setDesignPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeDesign = () => {
    setDesignFile(null);
    setDesignPreview('');
    if (designInputRef.current) designInputRef.current.value = '';
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image for your photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!designFile) {
      toast.error('Please upload a poster design first.');
      return;
    }
    if (!photoFile) {
      toast.error('Please upload your photo.');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter the name to display.');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('design', designFile);
      fd.append('photo', photoFile);
      fd.append('name', name.trim());

      const res = await generatePublicPoster(fd).unwrap();
      setPosterUrl(res.posterImage);
      setConfidence(res.confidence || null);
      toast.success('Your poster is ready! 🎉');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to generate poster.');
    }
  };

  const resetAll = () => {
    removeDesign();
    removePhoto();
    setName('');
    setPosterUrl(null);
    setConfidence(null);
  };

  const downloadPoster = async () => {
    if (!posterUrl) return;
    try {
      const response = await fetch(posterUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `im-attending_${name.trim().replace(/\s+/g, '_') || 'poster'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open(posterUrl, '_blank');
    }
  };

  const sharePoster = async () => {
    if (!posterUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "I'm Attending!",
          text: `${name.trim()} is attending.`,
          url: posterUrl,
        });
      } else {
        await navigator.clipboard.writeText(posterUrl);
        toast.success('Poster link copied to clipboard!');
      }
    } catch {
      /* user cancelled */
    }
  };

  const canGenerate = !!designFile && !!photoFile && !!name.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <AllEventsNavbar />

      <div className="max-w-3xl mx-auto px-4 py-8 pt-24">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1B3766] transition-colors text-sm mb-4"
        >
          <FaArrowLeft className="text-xs" /> Browse Events
        </Link>

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#1B3766] to-[#142952] rounded-2xl p-6 md:p-8 mb-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <FaMagic className="text-yellow-300" />
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-200">
                AI Poster Generator
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Create Your "I Will Be Attending" Poster
            </h1>
            <p className="text-sm text-blue-100 max-w-lg">
              Upload the poster design, add your photo and name, and let AI craft
              a personalised poster you can share anywhere — no design skills
              required.
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -right-2 -top-6 w-24 h-24 bg-white/5 rounded-full" />
        </div>

        {/* ───────────── RESULT VIEW ───────────── */}
        {posterUrl ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Your Poster is Ready! 🎨
              </h2>
              <p className="text-gray-600 text-sm">
                {confidence === 'low'
                  ? 'Looks good — you can regenerate if the layout feels off.'
                  : 'Share it on social media and let everyone know.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 flex justify-center">
              <img
                src={posterUrl}
                alt="Your personalised poster"
                className="max-w-full max-h-[520px] rounded-lg shadow-md object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={downloadPoster}
                className="flex-1 py-3 bg-[#1B3766] text-white rounded-xl font-semibold hover:bg-[#142952] transition-all flex items-center justify-center gap-2"
              >
                <FaDownload /> Download Poster
              </button>
              <button
                onClick={sharePoster}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <FaShareAlt /> Share
              </button>
              <button
                onClick={resetAll}
                className="py-3 px-5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <FaRedo /> Start Over
              </button>
            </div>
          </div>
        ) : (
          /* ───────────── FORM VIEW ───────────── */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
            {/* Step 1: Design */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-[#1B3766] text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-semibold text-gray-900">
                  Upload the Poster Design
                </h3>
              </div>

              {designPreview ? (
                <div className="relative bg-gray-50 rounded-xl p-3 flex justify-center">
                  <img
                    src={designPreview}
                    alt="Design preview"
                    className="max-h-[280px] rounded-lg shadow-sm object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeDesign}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                    title="Remove design"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-gray-300 hover:border-[#1B3766] rounded-xl p-8 text-center transition-colors bg-gray-50/50 hover:bg-blue-50/40">
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaUpload className="text-[#1B3766] text-xl" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Click to upload design
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG or WEBP — the design should have a blank circle/box
                      for your photo and a blank space for your name.
                    </p>
                  </div>
                  <input
                    ref={designInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDesignSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Step 2: Photo + Name */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-[#1B3766] text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-semibold text-gray-900">
                  Add Your Photo &amp; Name
                </h3>
              </div>

              <div className="space-y-4">
                {/* Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Photo
                  </label>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <div className="relative group">
                        <img
                          src={photoPreview}
                          alt="Your preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-[#1B3766]"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                        >
                          <FaTimes className="text-[10px]" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <FaUserCircle className="text-4xl text-gray-400" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                        <FaImage className="text-xs" />{' '}
                        {photoPreview ? 'Change' : 'Upload Photo'}
                      </div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG (max 5MB). A clear, front-facing photo works best.
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name on Poster
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ada Okafor"
                    maxLength={80}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3766]"
                  />
                </div>
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
              className="w-full py-3 bg-[#1B3766] text-white rounded-xl font-semibold hover:bg-[#142952] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <FaSpinner className="animate-spin" /> Designing your poster…
                </>
              ) : (
                <>
                  <FaPaintBrush /> Generate My Poster
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              AI will place your photo and name in the design automatically.
              Generation can take a few seconds.
            </p>
          </div>
        )}

        {/* Help footnote */}
        {!posterUrl && (
          <p className="text-xs text-gray-500 text-center mt-6 max-w-md mx-auto">
            Planning an event and want attendees to make their own posters?{' '}
            <Link to="/" className="text-[#1B3766] font-medium hover:underline">
              Create an event
            </Link>{' '}
            — your attendees can generate theirs from the registration page.
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default IWillAttend;