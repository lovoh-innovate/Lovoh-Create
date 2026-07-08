import express from "express";
import mongoose from "mongoose";
import userMessage from "../models/userMessageModel.js";
import User from "../models/userModel.js";
import UduuaSettings from "../models/uduuaSettingsModel.js";
import asyncHandler from "express-async-handler";
import generateUserToken from "../utils/generateUserToken.js";
import { OAuth2Client } from "google-auth-library";
import { notifyFollowerEvent } from "./notificationController.js";
import bcrypt from "bcryptjs";
import { sendOTPEmail, sendPasswordResetEmail } from "../utils/sendOTPEmail.js";
import cloudinary from "cloudinary";
import Article from "../models/articleModel.js";
import Magazine from "../models/magazineModel.js";
import Video from "../models/videoModel.js";
import EventRegistration from "../models/eventRegistrationModel.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ===== SECURITY HELPERS =====

// Secure cookie settings helper
const setSecureCookie = (res, name, value, maxAge = 7 * 24 * 60 * 60 * 1000) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAge,
    path: '/',
  });
};

// Clear cookie helper
const clearCookie = (res, name) => {
  res.cookie(name, '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

// Sanitize user object — NEVER expose password or sensitive fields
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  phone: user.phone,
  profile: user.profile,
  bio: user.bio,
  authMethod: user.authMethod,
  followersCount: user.followersCount,
  followingCount: user.followingCount,
  isVerified: user.isVerified,
  role: user.role,
  createdAt: user.createdAt,
});

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const getUserInfoFromAccessToken = async (accessToken) => {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch user info from Google");
  }

  return response.json();
};

const googleAuth = asyncHandler(async (req, res) => {
  const { token: googleToken, phone, mode } = req.body;

  if (!googleToken) {
    res.status(400);
    throw new Error("Google token is required");
  }

  if (!mode || !["signup", "login"].includes(mode)) {
    res.status(400);
    throw new Error("Valid mode is required");
  }

  let googleId = "";
  let email = "";
  let name = "";
  let picture = "";

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    googleId = payload?.sub || "";
    email = payload?.email || "";
    name = payload?.name || "";
    picture = payload?.picture || "";
  } catch (error) {
    const userInfo = await getUserInfoFromAccessToken(googleToken);
    googleId = userInfo?.sub || `google-${userInfo?.email || Date.now()}`;
    email = userInfo?.email || "";
    name = userInfo?.name || "";
    picture = userInfo?.picture || "";
  }

  if (!email) {
    res.status(400);
    throw new Error("Google account email is required");
  }

  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  if (mode === "signup") {
    const cleanedPhone = String(phone || "").trim();

    if (!cleanedPhone) {
      res.status(400);
      throw new Error("Phone number is required");
    }

    if (user) {
      res.status(400);
      throw new Error("Account already exists. Please login instead.");
    }

    const baseUsername =
      (email?.split("@")[0] || name || "user")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_]/g, "") || "user";

    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter++}`;
    }

    user = await User.create({
      googleId,
      name: sanitizeInput(name) || "",
      username,
      email: email.toLowerCase().trim(),
      phone: cleanedPhone,
      profile: picture || "",
      password: `google-auth-${googleId}`,
      isVerified: true,
      authMethod: "google",
    });
  }

  if (mode === "login") {
    if (!user) {
      res.status(404);
      throw new Error(
        "No account found with this email. Please sign up first.",
      );
    }

    // Check if account is locked
    if (user.isLocked && user.isLocked()) {
      const minutesLeft = user.getLockTimeRemaining();
      res.status(403);
      throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    if (!user.googleId) {
      user.googleId = googleId;
    }

    if (!user.profile && picture) {
      user.profile = picture;
    }

    if (!user.name && name) {
      user.name = sanitizeInput(name);
    }

    user.isVerified = true;
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();
  }

  const token = generateUserToken(res, user._id);
  
  // Set secure HTTP-only cookie
  setSecureCookie(res, 'token', token);

  res.status(200).json({
    ...sanitizeUser(user),
    token,
  });
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register new user with email & password (OTP sent)
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, username, email, password, phone } = req.body;

  if (!name || !username || !email || !password) {
    res.status(400);
    throw new Error("Name, username, email, and password are required");
  }

  // Input sanitization
  const cleanName = sanitizeInput(name);
  const cleanUsername = sanitizeInput(username).toLowerCase();
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanPhone = phone ? sanitizeInput(phone) : "";

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  // Validate username format (alphanumeric, underscores, 3-30 chars)
  const usernameRegex = /^[a-z0-9_]{3,30}$/;
  if (!usernameRegex.test(cleanUsername)) {
    res.status(400);
    throw new Error("Username must be 3-30 characters, lowercase letters, numbers, and underscores only");
  }

  // Validate password strength
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  // Get security settings
  const settings = await UduuaSettings.findOne();
  const REQUIRE_EMAIL_VERIFICATION = settings?.security?.requireEmailVerification ?? true;
  const OTP_EXPIRY_MINUTES = settings?.security?.otpExpiryMinutes || 10;

  const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });

  if (existingUser) {
    if (existingUser.isVerified) {
      res.status(400);
      throw new Error(
        "User with that email or username already exists. Please login instead.",
      );
    }

    existingUser.name = cleanName;
    existingUser.username = cleanUsername;
    existingUser.password = password;
    existingUser.phone = cleanPhone;
    existingUser.otp = generateOTP();
    existingUser.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await existingUser.save();

    if (REQUIRE_EMAIL_VERIFICATION) {
      sendOTPEmail(existingUser.email, existingUser.otp).catch((err) =>
        console.error("OTP email error:", err),
      );
    }

    return res.status(200).json({
      message: REQUIRE_EMAIL_VERIFICATION
        ? "An unverified account already exists. A new OTP has been sent to your email."
        : "Account updated successfully. You can now log in.",
      email: existingUser.email,
    });
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const user = await User.create({
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    password,
    phone: cleanPhone,
    isVerified: !REQUIRE_EMAIL_VERIFICATION,
    authMethod: "email",
    otp: REQUIRE_EMAIL_VERIFICATION ? otp : undefined,
    otpExpiry: REQUIRE_EMAIL_VERIFICATION ? otpExpiry : undefined,
  });

  if (REQUIRE_EMAIL_VERIFICATION) {
    sendOTPEmail(user.email, otp).catch((err) =>
      console.error("OTP email error:", err),
    );
  }

  res.status(201).json({
    message: REQUIRE_EMAIL_VERIFICATION
      ? "Registration successful. Please check your email for the OTP."
      : "Registration successful. You can now log in.",
    email: user.email,
  });
});

// @desc    Verify email using OTP
// @route   POST /api/users/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const cleanEmail = sanitizeInput(email).toLowerCase();

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("Email already verified");
  }

  if (!user.otp || !user.otpExpiry) {
    res.status(400);
    throw new Error("No OTP found. Please request a new one.");
  }

  if (user.otp !== otp) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  if (user.otpExpiry < new Date()) {
    res.status(400);
    throw new Error("OTP has expired. Please request a new one.");
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  const token = generateUserToken(res, user._id);
  
  // Set secure HTTP-only cookie
  setSecureCookie(res, 'token', token);

  res.status(200).json({
    ...sanitizeUser(user),
    token,
  });
});

// @desc    Resend OTP to unverified user
// @route   POST /api/users/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const cleanEmail = sanitizeInput(email).toLowerCase();

  const settings = await UduuaSettings.findOne();
  const OTP_EXPIRY_MINUTES = settings?.security?.otpExpiryMinutes || 10;

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("Email is already verified");
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await user.save();

  sendOTPEmail(user.email, otp).catch((err) =>
    console.error("OTP email error:", err),
  );

  res.status(200).json({
    message: "New OTP sent to your email",
    email: user.email,
  });
});

// @desc    Login with email & password
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const cleanEmail = sanitizeInput(email).toLowerCase();

  // Get security settings
  const settings = await UduuaSettings.findOne();
  const MAX_LOGIN_ATTEMPTS = settings?.security?.maxLoginAttempts || 5;
  const LOCKOUT_MINUTES = settings?.security?.lockoutMinutes || 30;

  const user = await User.findOne({ email: cleanEmail });
  
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockUntil - new Date()) / 60000);
    res.status(403);
    throw new Error(`Account locked. Too many failed attempts. Try again in ${minutesLeft} minutes.`);
  }

  // Check if user is Google auth user
  if (!user.password || user.password.startsWith("google-auth-")) {
    res.status(401);
    throw new Error(
      "This account uses Google Sign-In. Please log in with Google.",
    );
  }

  if (!user.isVerified) {
    res.status(403);
    throw new Error("Email not verified. Please verify first.");
  }

  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    // Increment login attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    // Check if max attempts reached
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await user.save();
      res.status(403);
      throw new Error(`Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`);
    }
    
    const remainingAttempts = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
    await user.save();
    res.status(401);
    throw new Error(`Invalid email or password. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`);
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateUserToken(res, user._id);
  
  // Set secure HTTP-only cookie
  setSecureCookie(res, 'token', token);

  res.status(200).json({
    ...sanitizeUser(user),
    token,
  });
});

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }

  // Get security settings
  const settings = await UduuaSettings.findOne();
  const MIN_PASSWORD_LENGTH = settings?.security?.minPasswordLength || 6;

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400);
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if user is Google auth user (no password set)
  if (!user.password || user.password.startsWith("google-auth-")) {
    res.status(400);
    throw new Error(
      "This account uses Google Sign-In. Password cannot be changed.",
    );
  }

  // Verify current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  // Update password (pre-save hook will hash it)
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  // Clear all sessions by clearing the cookie
  clearCookie(res, 'token');

  res.status(200).json({
    message: "Password changed successfully. Please log in again.",
  });
});

// @desc    Update user profile (name, username, phone, bio, profile picture)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, username, phone, bio } = req.body;

  // Update name
  if (name !== undefined && name.trim() !== "") {
    user.name = sanitizeInput(name);
  }

  // Update username (with uniqueness check)
  if (username !== undefined && username.trim() !== "") {
    const trimmedUsername = sanitizeInput(username).toLowerCase();
    
    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      res.status(400);
      throw new Error("Username must be 3-30 characters, lowercase letters, numbers, and underscores only");
    }

    const existingUser = await User.findOne({
      username: trimmedUsername,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      res.status(400);
      throw new Error("Username already taken");
    }

    user.username = trimmedUsername;
  }

  // Update phone number (with uniqueness check)
  if (phone !== undefined && phone.trim() !== "") {
    const trimmedPhone = sanitizeInput(phone);

    const existingUser = await User.findOne({
      phone: trimmedPhone,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      res.status(400);
      throw new Error("Phone number already registered to another account");
    }

    user.phone = trimmedPhone;
  }

  // Update bio
  if (bio !== undefined) {
    user.bio = sanitizeInput(bio) || "";
  }

  // Update profile picture if file uploaded
  if (req.file) {
    // Delete old image from Cloudinary if it exists and not a Google photo
    if (user.profile && !user.profile.includes("googleusercontent")) {
      try {
        const publicId = user.profile.split("/").pop().split(".")[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`The_Brave_ProfilePicture/${publicId}`);
        }
      } catch (err) {
        console.error("Error deleting old profile image:", err);
      }
    }
    user.profile = req.file.path;
  }

  const updatedUser = await user.save();

  res.status(200).json({
    ...sanitizeUser(updatedUser),
    message: "Profile updated successfully",
  });
});

// @desc    Get current user's profile info
// @route   GET /api/users/profile
// @access  Private
const getProfileInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password -otp -otpExpiry -resetPasswordOtp -resetPasswordExpiry -loginAttempts -lockUntil")
    .populate("followers", "name username profile")
    .populate("following", "name username profile")
    .populate(
      "likedArticles",
      "title slug featuredImage images category readTime",
    )
    .populate("likedMagazines", "title slug coverImage category")
    .populate("bookmarkedArticles", "title slug featuredImage images category")
    .populate("bookmarkedMagazines", "title slug coverImage category");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.followersCount = user.followers.length;
  user.followingCount = user.following.length;

  res.json(user);
});

// @desc    Get user profile by ID (public)
// @route   GET /api/users/profile/:id
// @access  Public
const getProfileById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-password -email -phone -otp -otpExpiry -resetPasswordOtp -resetPasswordExpiry -loginAttempts -lockUntil")
    .populate("followers", "name username profile")
    .populate("following", "name username profile");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json(user);
});

// @desc    Follow a user
// @route   POST /api/users/follow/:id
// @access  Private
const followUser = asyncHandler(async (req, res) => {
  const userToFollowId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userToFollowId)) {
    res.status(400);
    throw new Error("Invalid user ID format");
  }

  const userToFollow = await User.findById(userToFollowId);
  if (!userToFollow) {
    res.status(404);
    throw new Error("User not found");
  }

  const currentUser = await User.findById(req.user._id);

  const isAlreadyFollowing = currentUser.following.includes(userToFollowId);
  if (isAlreadyFollowing) {
    res.status(400);
    throw new Error("Already following this user");
  }

  if (req.user._id.toString() === userToFollowId) {
    res.status(400);
    throw new Error("Cannot follow yourself");
  }

  currentUser.following.push(userToFollowId);
  userToFollow.followers.push(req.user._id);

  await currentUser.save();
  await userToFollow.save();

  await notifyFollowerEvent({
    targetUserId: userToFollowId,
    followerName: currentUser.name || currentUser.username,
    type: "follow",
  });

  res.json({ message: "Followed successfully" });
});

// @desc    Unfollow a user
// @route   POST /api/users/unfollow/:id
// @access  Private
const unfollowUser = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id) {
    res.status(400);
    throw new Error("You cannot unfollow yourself");
  }

  const userToUnfollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user._id);

  if (!userToUnfollow) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!currentUser.following.includes(req.params.id)) {
    res.status(400);
    throw new Error("You are not following this user");
  }

  currentUser.following.pull(req.params.id);
  currentUser.followingCount = currentUser.following.length;
  await currentUser.save();

  userToUnfollow.followers.pull(req.user._id);
  userToUnfollow.followersCount = userToUnfollow.followers.length;
  await userToUnfollow.save();

  await notifyFollowerEvent({
    targetUserId: req.params.id,
    followerName: currentUser.name || currentUser.username,
    type: "unfollow",
  });

  res.json({
    message: `You have unfollowed ${userToUnfollow.name}`,
    following: false,
    followersCount: userToUnfollow.followersCount,
    followingCount: currentUser.followingCount,
  });
});

// @desc    Get user's followers
// @route   GET /api/users/followers/:id
// @access  Public
const getFollowers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(req.params.id).populate({
    path: "followers",
    select: "name username profile bio",
    options: {
      limit: limit * 1,
      skip: (page - 1) * limit,
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const total = user.followers.length;

  res.json({
    followers: user.followers,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total,
  });
});

// @desc    Get user's following
// @route   GET /api/users/following/:id
// @access  Public
const getFollowing = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(req.params.id).populate({
    path: "following",
    select: "name username profile bio",
    options: {
      limit: limit * 1,
      skip: (page - 1) * limit,
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const total = user.following.length;

  res.json({
    following: user.following,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total,
  });
});

// @desc    Get users to follow (suggestions)
// @route   GET /api/users/suggestions
// @access  Private
const getUserSuggestions = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id);

  const excludeIds = [...currentUser.following, req.user._id];

  const suggestions = await User.find({
    _id: { $nin: excludeIds },
    isVerified: true,
  })
    .select("name username profile bio followersCount")
    .sort({ followersCount: -1 })
    .limit(10);

  res.json(suggestions);
});

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  clearCookie(res, 'token');
  clearCookie(res, 'jwt');

  res.status(200).json({ message: "Logged out successfully" });
});

// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Remove user from other users' followers/following lists
  await User.updateMany(
    { followers: req.user._id },
    { $pull: { followers: req.user._id }, $inc: { followersCount: -1 } },
  );

  await User.updateMany(
    { following: req.user._id },
    { $pull: { following: req.user._id }, $inc: { followingCount: -1 } },
  );

  // Delete user's content
  await Article.deleteMany({ createdBy: req.user._id });
  await Magazine.deleteMany({ createdBy: req.user._id });
  await Video.deleteMany({ user: req.user._id });
  
  // Delete user's event registrations
  await EventRegistration.deleteMany({ email: user.email });

  // Delete profile picture from Cloudinary if not a Google photo
  if (user.profile && !user.profile.includes("googleusercontent")) {
    try {
      const publicId = user.profile.split("/").pop().split(".")[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`The_Brave_ProfilePicture/${publicId}`);
      }
    } catch (error) {
      console.error("Error deleting profile image from Cloudinary:", error);
    }
  }

  // Delete the user
  await User.deleteOne({ _id: req.user._id });

  // Clear all cookies
  clearCookie(res, 'token');
  clearCookie(res, 'jwt');

  res.status(200).json({ message: "Account deleted successfully" });
});

const postMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error("Input all Fields");
  }

  // Sanitize inputs
  const cleanName = sanitizeInput(name);
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanSubject = sanitizeInput(subject);
  const cleanMessage = sanitizeInput(message);

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  const messages = await userMessage.create({
    name: cleanName,
    email: cleanEmail,
    subject: cleanSubject,
    message: cleanMessage,
  });

  res.status(201).json(messages);
});

// @desc    Send OTP for password reset
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const cleanEmail = sanitizeInput(email).toLowerCase();

  // Get security settings
  const settings = await UduuaSettings.findOne();
  const RESET_TOKEN_EXPIRY = settings?.security?.resetTokenExpiry || 10; // minutes

  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    return res
      .status(200)
      .json({ message: "If that email exists, we have sent a reset code." });
  }

  if (!user.password || user.password.startsWith("google-auth-")) {
    return res
      .status(400)
      .json({
        message: "This account uses Google Sign-In. Please log in with Google.",
      });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOtp = otp;
  user.resetPasswordExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY * 60 * 1000);
  await user.save();

  sendPasswordResetEmail(user.email, otp).catch((err) =>
    console.error("Password reset email error:", err),
  );

  res.status(200).json({ message: "Password reset code sent to your email." });
});

// @desc    Reset password using OTP
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.status(400);
    throw new Error("Email, OTP, and new password are required");
  }

  const cleanEmail = sanitizeInput(email).toLowerCase();

  // Get security settings
  const settings = await UduuaSettings.findOne();
  const MIN_PASSWORD_LENGTH = settings?.security?.minPasswordLength || 6;

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400);
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  if (user.resetPasswordExpiry < new Date()) {
    res.status(400);
    throw new Error("OTP has expired. Please request a new one.");
  }

  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpiry = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  // Clear any existing sessions
  clearCookie(res, 'token');
  clearCookie(res, 'jwt');

  res
    .status(200)
    .json({
      message:
        "Password reset successful. Please log in with your new password.",
    });
});

// @desc    Get user profile with all their posts
// @route   GET /api/users/profile/:id/posts
// @access  Public
const getUserPosts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, type } = req.query;

  const user = await User.findById(id).select(
    "name username profile bio followersCount followingCount",
  );
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const result = { user: { ...user.toObject(), _id: user._id.toString() } };
  const posts = {};

  if (!type || type === "articles") {
    const articlesQuery = {
      createdBy: id,
      status: { $in: ["published", "coming_soon"] },
    };

    const articles = await Article.find(articlesQuery)
      .select(
        "title slug featuredImage images category excerpt status comingSoon likes views createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const articlesCount = await Article.countDocuments(articlesQuery);

    posts.articles = {
      items: articles.map((article) => ({
        ...article,
        _id: article._id.toString(),
        likesCount: article.likes?.length || 0,
      })),
      total: articlesCount,
      page: Number(page),
      pages: Math.ceil(articlesCount / limit),
    };
  }

  if (!type || type === "magazines") {
    const magazinesQuery = {
      createdBy: id,
      status: { $in: ["published", "coming_soon"] },
    };

    const magazines = await Magazine.find(magazinesQuery)
      .select(
        "title slug coverImage category summary status comingSoon likes views createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const magazinesCount = await Magazine.countDocuments(magazinesQuery);

    posts.magazines = {
      items: magazines.map((mag) => ({
        ...mag,
        _id: mag._id.toString(),
        likesCount: mag.likes?.length || 0,
      })),
      total: magazinesCount,
      page: Number(page),
      pages: Math.ceil(magazinesCount / limit),
    };
  }

  if (!type || type === "videos") {
    const videosQuery = {
      user: id,
      status: "published",
    };

    const videos = await Video.find(videosQuery)
      .select(
        "title thumbnail videoUrl category description likes views duration createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const videosCount = await Video.countDocuments(videosQuery);

    posts.videos = {
      items: videos.map((video) => ({
        ...video,
        _id: video._id.toString(),
        likesCount: video.likes?.length || 0,
      })),
      total: videosCount,
      page: Number(page),
      pages: Math.ceil(videosCount / limit),
    };
  }

  res.json({
    user: result.user,
    posts,
  });
});

// @desc    Get single user profile by username (for public viewing)
// @route   GET /api/users/profile/username/:username
// @access  Public
const getProfileByUsername = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .select("-password -email -phone -otp -otpExpiry -resetPasswordOtp -resetPasswordExpiry -loginAttempts -lockUntil")
    .populate("followers", "name username profile")
    .populate("following", "name username profile");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const articlesCount = await Article.countDocuments({
    createdBy: user._id,
    status: { $in: ["published", "coming_soon"] },
  });
  const magazinesCount = await Magazine.countDocuments({
    createdBy: user._id,
    status: { $in: ["published", "coming_soon"] },
  });
  const videosCount = await Video.countDocuments({
    user: user._id,
    status: "published",
  });

  res.json({
    ...user.toObject(),
    postsCount: {
      articles: articlesCount,
      magazines: magazinesCount,
      videos: videosCount,
      total: articlesCount + magazinesCount + videosCount,
    },
  });
});

export {
  postMessage,
  googleAuth,
  registerUser,
  verifyEmail,
  resendOTP,
  loginUser,
  updateProfile,
  changePassword,
  logout,
  deleteAccount,
  getProfileInfo,
  getProfileById,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserSuggestions,
  forgotPassword,
  resetPassword,
  getUserPosts,
  getProfileByUsername,
};