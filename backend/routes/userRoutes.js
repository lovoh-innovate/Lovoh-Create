import express from 'express';
import { 
  postMessage, 
  googleAuth, 
  updateProfile, 
  logout, 
  deleteAccount,
  getProfileInfo,
  getProfileById,
  getProfileByUsername,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserSuggestions,
  getUserPosts,
  // Auth routes
  registerUser,
  verifyEmail,
  resendOTP,
  loginUser,
  forgotPassword,
  resetPassword,
  // Settings routes
  changePassword,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter, apiLimiter } from '../middleware/securityMiddleware.js';

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "The_Brave_ProfilePicture",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "avif"],
  },
});

const upload = multer({ storage });

cloudinary.api
  .ping()
  .then(() => console.log("✅ Cloudinary connected successfully"))
  .catch((err) => console.error("❌ Cloudinary not connected:", err.message));

// ==================== PUBLIC AUTH ROUTES (Strict Rate Limiting) ====================

// Auth routes — max 5 attempts per 15 minutes
router.post('/auth/google', authLimiter, googleAuth);
router.post('/register', authLimiter, registerUser);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-otp', authLimiter, resendOTP);
router.post('/login', authLimiter, loginUser);

// Password reset routes — max 5 attempts per 15 minutes
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// ==================== PUBLIC NON-AUTH ROUTES ====================

// Contact route
router.post('/contact', postMessage);

// Public profile routes
router.get('/profile/:id', getProfileById);
router.get('/profile/username/:username', getProfileByUsername);
router.get('/profile/:id/posts', getUserPosts);

// Followers/Following routes (public view)
router.get('/followers/:id', getFollowers);
router.get('/following/:id', getFollowing);

// ==================== PROTECTED ROUTES ====================

// Profile routes
router.get('/profile', protect, getProfileInfo);
router.put('/profile', protect, upload.single('profile'), updateProfile);
router.delete('/profile', protect, deleteAccount);

// Password change route
router.put('/change-password', protect, changePassword);

// Follow/Unfollow routes
router.post('/follow/:id', protect, followUser);
router.post('/unfollow/:id', protect, unfollowUser);
router.get('/suggestions', protect, getUserSuggestions);

// Logout route
router.post('/logout', logout);

export default router;