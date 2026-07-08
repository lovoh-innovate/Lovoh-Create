import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Admin from '../models/adminModel.js';

// Extract token from request (cookie or header)
const extractToken = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.cookies && req.cookies.jwt_user) {
    return req.cookies.jwt_user;
  }
  if (req.cookies && req.cookies.jwt) {
    return req.cookies.jwt;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// Set secure HTTP-only cookie
export const setSecureCookie = (res, name, value, maxAge = 7 * 24 * 60 * 60 * 1000) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAge,
    path: '/',
  });
};

// Clear cookie
export const clearCookie = (res, name) => {
  res.cookie(name, '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

// @desc    Protect routes - Verify JWT token (user only)
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id;

    if (!userId) {
      res.status(401);
      throw new Error('Not authorized, invalid token payload');
    }

    req.user = await User.findById(userId).select('-password -otp -otpExpiry -resetPasswordOtp -resetPasswordExpiry -loginAttempts -lockUntil');

    if (!req.user) {
      res.status(401);
      throw new Error('User not found');
    }

    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, invalid token');
  }
});

// @desc    Protect routes - Verify JWT token (handles both admin & user tokens)
const protectBoth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userId || decoded.id) {
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select('-password -otp -otpExpiry -resetPasswordOtp -resetPasswordExpiry -loginAttempts -lockUntil');
      if (user) {
        req.user = user;
        req.user.role = 'user';
        return next();
      }
    }

    if (decoded.adminId) {
      const admin = await Admin.findById(decoded.adminId).select('-password');
      if (admin) {
        req.user = admin;
        req.user.role = 'admin';
        return next();
      }
    }

    res.status(401);
    throw new Error('Not authorized, invalid token');
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, invalid token');
  }
});

export { protect, protectBoth };