import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import Admin from '../models/adminModel.js';

// Extract token from request (cookie or header)
const extractAdminToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.jwt) {
    return req.cookies.jwt;
  }
  if (req.cookies && req.cookies.admin_token) {
    return req.cookies.admin_token;
  }
  return null;
};

// Set secure HTTP-only cookie for admin
export const setAdminSecureCookie = (res, name, value, maxAge = 24 * 60 * 60 * 1000) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAge,
    path: '/',
  });
};

// Clear admin cookie
export const clearAdminCookie = (res, name) => {
  res.cookie(name, '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

// @desc    Protect admin routes - Verify admin JWT token
// @access  Private/Admin
const protectAdmin = asyncHandler(async (req, res, next) => {
  const token = extractAdminToken(req);

  if (!token) {
    res.status(401);
    throw new Error('Not Authorized, no token found');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.adminId).select('-password');

    if (!admin) {
      res.status(401);
      throw new Error('Not Authorized, admin not found');
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not Authorized, invalid token');
  }
});

export { protectAdmin };