// controllers/aiController.js
//
// AI poster generation for the events app.
// - Public: anyone can upload a design + their photo + their name.
// - Registered: attendee generates the poster for an event they registered for.
// - Template: event creators upload a design, AI detects placeholders once and
//   stores them on the event so attendees can generate posters later.
//
// eventController.js is NOT touched — its existing poster flow keeps working.
//
// Note on stored placeholders:
//   event.posterTemplate only has schema fields for photo {x,y,w,h,borderRadius}
//   and name {x,y,fontSize,color,fontFamily}. The richer detection we produce
//   (name width/height/align, photo shape) may or may not survive Mongoose
//   strict mode. So when generating an event poster we:
//     1. Use the stored template if it has the richer fields.
//     2. Otherwise re-detect on the template image on the fly.
//   This guarantees centered/aligned names whether or not the schema keeps them.

import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Event from '../models/eventModel.js';
import EventRegistration from '../models/eventRegistrationModel.js';
import { detectPosterPlaceholders } from '../services/groqService.js';
import { generatePoster } from '../utils/generatePoster.js';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const clamp = (n, min, max, fallback) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
};

const clamp01 = (n, fallback = 0) => clamp(n, 0, 1, fallback);

const pickFiles = (req) => {
  if (!req.files) return [];
  return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
};

const uploadToCloudinary = async (filePath, folder, prefix) => {
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: `${prefix}_${Date.now()}`,
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  });
};

const destroyCloudinary = async (url, folder) => {
  if (!url || !url.includes('cloudinary')) return;
  try {
    const publicId = url.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`${folder}/${publicId}`);
  } catch (err) {
    console.error('Cloudinary cleanup failed:', err.message);
  }
};

// Normalize whatever the LLM returned into a predictable shape.
const normalizeDetection = (raw) => {
  const p = raw?.photoPlaceholder || {};
  const n = raw?.namePlaceholder || {};

  const shape = ['circle', 'square', 'rounded'].includes(p.shape)
    ? p.shape
    : 'square';

  return {
    photoPlaceholder: {
      xNorm: clamp01(p.x, 0.3),
      yNorm: clamp01(p.y, 0.3),
      wNorm: clamp01(p.width, 0.4),
      hNorm: clamp01(p.height, 0.4),
      shape,
      borderRadiusRatio:
        shape === 'circle'
          ? 0.5
          : shape === 'rounded'
          ? clamp01(p.borderRadiusRatio, 0.15)
          : clamp01(p.borderRadiusRatio, 0),
    },
    namePlaceholder: {
      xNorm: clamp01(n.x, 0.2),
      yNorm: clamp01(n.y, 0.7),
      wNorm: clamp01(n.width, 0.6),
      hNorm: clamp01(n.height, 0.1),
      fontSizeRatio: clamp(n.fontSizeRatio, 0.02, 0.2, 0.05),
      color: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(n.color || '')
        ? n.color
        : '#FFFFFF',
      fontFamily: n.fontFamily || 'Arial',
      align: ['left', 'center', 'right'].includes(n.align)
        ? n.align
        : 'center',
    },
    confidence: ['high', 'medium', 'low'].includes(raw?.confidence)
      ? raw.confidence
      : 'medium',
    notes: typeof raw?.notes === 'string' ? raw.notes : '',
  };
};

// Convert normalized detection → pixel coords for generatePoster().
// Includes the extra fields (name width/height/align, photo shape) that the
// new generatePoster uses for correct centering.
const toPixelPlaceholders = (norm, imgW, imgH) => {
  const p = norm.photoPlaceholder;
  const n = norm.namePlaceholder;

  const photoW = Math.max(1, Math.round(p.wNorm * imgW));
  const photoH = Math.max(1, Math.round(p.hNorm * imgH));

  return {
    photo: {
      x: Math.round(p.xNorm * imgW),
      y: Math.round(p.yNorm * imgH),
      width: photoW,
      height: photoH,
      borderRadius: Math.round(
        p.borderRadiusRatio * Math.min(photoW, photoH)
      ),
      shape: p.shape,
    },
    name: {
      x: Math.round(n.xNorm * imgW),
      y: Math.round(n.yNorm * imgH),
      width: Math.max(1, Math.round(n.wNorm * imgW)),
      height: Math.max(1, Math.round(n.hNorm * imgH)),
      fontSize: Math.max(10, Math.round(n.fontSizeRatio * imgH)),
      color: n.color,
      fontFamily: n.fontFamily,
      align: n.align,
    },
  };
};

// Detect placeholders on a design already uploaded to Cloudinary.
const detectOnUploadedDesign = async ({ designUrl, designW, designH }) => {
  const raw = await detectPosterPlaceholders({ designImageUrl: designUrl });
  const normalized = normalizeDetection(raw);
  const pixel = toPixelPlaceholders(normalized, designW, designH);
  return {
    pixel,
    normalized,
    confidence: normalized.confidence,
    notes: normalized.notes,
    width: designW,
    height: designH,
  };
};

// Does a stored event.posterTemplate carry the richer detection we need for
// centred names + correctly shaped photos?
const hasRichPlaceholders = (tpl) => {
  if (!tpl) return false;
  return (
    Number(tpl?.namePlaceholder?.width) > 0 &&
    Number(tpl?.namePlaceholder?.height) > 0
  );
};

// Convert a stored event.posterTemplate (whatever survives Mongoose) into the
// pixel placeholder shape generatePoster expects. Missing fields are omitted
// so generatePoster falls back to legacy behaviour for them.
const storedTemplateToPixel = (tpl) => {
  const p = tpl?.photoPlaceholder || {};
  const n = tpl?.namePlaceholder || {};
  return {
    photo: {
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
      width: Number(p.width) || 200,
      height: Number(p.height) || 200,
      borderRadius: Number(p.borderRadius) || 0,
      ...(p.shape ? { shape: p.shape } : {}),
    },
    name: {
      x: Number(n.x) || 100,
      y: Number(n.y) || 400,
      fontSize: Number(n.fontSize) || 48,
      color: n.color || '#FFFFFF',
      fontFamily: n.fontFamily || 'Arial',
      ...(Number(n.width) > 0 ? { width: Number(n.width) } : {}),
      ...(Number(n.height) > 0 ? { height: Number(n.height) } : {}),
      ...(n.align ? { align: n.align } : {}),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/ai/poster/detect
// Body: multipart — field "design" (image file)
// Auth: required (any logged-in user)
// Returns the detected placeholders so clients can preview/adjust them.
// ─────────────────────────────────────────────────────────────────────
export const detectDesignPlaceholders = async (req, res) => {
  let uploaded = null;
  try {
    const files = pickFiles(req);
    const designFile = files.find((f) => f.fieldname === 'design');
    if (!designFile) {
      return res
        .status(400)
        .json({ success: false, message: 'design file is required (field "design").' });
    }

    uploaded = await uploadToCloudinary(
      designFile.path,
      'poster_designs',
      'design'
    );

    const result = await detectOnUploadedDesign({
      designUrl: uploaded.secure_url,
      designW: uploaded.width,
      designH: uploaded.height,
    });

    return res.status(200).json({
      success: true,
      designImage: uploaded.secure_url,
      designWidth: uploaded.width,
      designHeight: uploaded.height,
      placeholders: result.pixel,
      normalized: result.normalized,
      confidence: result.confidence,
      notes: result.notes,
    });
  } catch (err) {
    console.error('❌ AI poster detect error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to detect poster placeholders.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/ai/poster/public
// Body: multipart — fields "design", "photo", and text "name"
// Auth: PUBLIC
// Flow: upload design + photo → detect placeholders → compose → return URL
// The design is discarded from Cloudinary after generation (temp asset).
// ─────────────────────────────────────────────────────────────────────
export const generatePublicPosterAI = async (req, res) => {
  let designUpload = null;
  let photoUpload = null;

  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required.' });
    }
    if (name.length > 80) {
      return res
        .status(400)
        .json({ success: false, message: 'name is too long (max 80 chars).' });
    }

    const files = pickFiles(req);
    const designFile = files.find((f) => f.fieldname === 'design');
    const photoFile = files.find((f) => f.fieldname === 'photo');

    if (!designFile) {
      return res
        .status(400)
        .json({ success: false, message: 'design file is required (field "design").' });
    }
    if (!photoFile) {
      return res
        .status(400)
        .json({ success: false, message: 'photo file is required (field "photo").' });
    }

    designUpload = await uploadToCloudinary(
      designFile.path,
      'poster_public/designs',
      'design'
    );
    photoUpload = await uploadToCloudinary(
      photoFile.path,
      'poster_public/photos',
      'photo'
    );

    const detection = await detectOnUploadedDesign({
      designUrl: designUpload.secure_url,
      designW: designUpload.width,
      designH: designUpload.height,
    });

    const posterUrl = await generatePoster(
      designUpload.secure_url,
      photoUpload.secure_url,
      name,
      detection.pixel
    );

    // Best-effort cleanup of the temp public design.
    destroyCloudinary(designUpload.secure_url, 'poster_public/designs').catch(
      () => {}
    );

    return res.status(200).json({
      success: true,
      message: 'Poster generated.',
      posterImage: posterUrl,
      name,
      confidence: detection.confidence,
      placeholders: detection.pixel,
    });
  } catch (err) {
    console.error('❌ AI public poster error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate public poster.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/ai/poster/event/:eventId/template
// Body: multipart — field "design" (image file)
// Auth: event creator or admin
// Used by creators: uploads the design, AI detects placeholders once, and
// stores them on event.posterTemplate so attendees can generate posters
// later. Extra fields (name width/height/align, photo shape) are written too
// — if the schema keeps them, event generation uses boxed/centered mode.
// ─────────────────────────────────────────────────────────────────────
export const createEventPosterTemplateAI = async (req, res) => {
  let designUpload = null;
  try {
    const { eventId } = req.params;
    if (!isObjectId(eventId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid eventId.' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const isOwner = event.createdBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const files = pickFiles(req);
    const designFile = files.find((f) => f.fieldname === 'design');
    if (!designFile) {
      return res
        .status(400)
        .json({ success: false, message: 'design file is required (field "design").' });
    }

    // Replace old design if present.
    if (event.posterTemplate?.image) {
      destroyCloudinary(event.posterTemplate.image, 'eventroom/posters').catch(
        () => {}
      );
    }

    designUpload = await uploadToCloudinary(
      designFile.path,
      'eventroom/posters',
      'poster'
    );

    const detection = await detectOnUploadedDesign({
      designUrl: designUpload.secure_url,
      designW: designUpload.width,
      designH: designUpload.height,
    });

    // Store everything. If Mongoose strips the extras, we re-detect on the
    // fly during generation and still get the centered result.
    event.posterTemplate = {
      image: designUpload.secure_url,
      photoPlaceholder: {
        x: detection.pixel.photo.x,
        y: detection.pixel.photo.y,
        width: detection.pixel.photo.width,
        height: detection.pixel.photo.height,
        borderRadius: detection.pixel.photo.borderRadius,
        // Rich fields (may be dropped by schema — harmless if so):
        shape: detection.pixel.photo.shape,
      },
      namePlaceholder: {
        x: detection.pixel.name.x,
        y: detection.pixel.name.y,
        fontSize: detection.pixel.name.fontSize,
        color: detection.pixel.name.color,
        fontFamily: detection.pixel.name.fontFamily,
        // Rich fields (may be dropped by schema — harmless if so):
        width: detection.pixel.name.width,
        height: detection.pixel.name.height,
        align: detection.pixel.name.align,
      },
    };
    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Poster template saved.',
      posterTemplate: event.posterTemplate,
      confidence: detection.confidence,
      notes: detection.notes,
    });
  } catch (err) {
    console.error('❌ AI event template error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create event poster template.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/ai/poster/event/:eventId/registration/:registrationId
// Body: multipart — optional "photo" (else uses saved registration.userPhoto)
//       text "name" (optional override; defaults to registration.name)
// Auth: registrant, event creator, or admin
// Uses the event's stored posterTemplate. If the stored placeholders lack the
// richer fields (schema stripped them), re-detects from the template image so
// the name is correctly centered.
// ─────────────────────────────────────────────────────────────────────
export const generateEventPosterAI = async (req, res) => {
  let photoUpload = null;
  try {
    const { eventId, registrationId } = req.params;
    if (!isObjectId(eventId) || !isObjectId(registrationId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid eventId or registrationId.' });
    }

    const event = await Event.findById(eventId);
    if (!event || event.isDisabled) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const registration = await EventRegistration.findById(registrationId);
    if (!registration || registration.event.toString() !== event._id.toString()) {
      return res
        .status(404)
        .json({ success: false, message: 'Registration not found for this event.' });
    }

    // Authorization
    const authUser = req.user; // route should call `protect`
    const isRegistrant =
      authUser?.email &&
      registration.email.toLowerCase() === authUser.email.toLowerCase();
    const isCreator = event.createdBy?.toString() === authUser?._id?.toString();
    const isAdmin = authUser?.role === 'admin';
    if (!isRegistrant && !isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const tpl = event.posterTemplate;
    if (!tpl || !tpl.image) {
      return res.status(400).json({
        success: false,
        message: 'This event does not have a poster template yet.',
      });
    }

    // ── Resolve placeholders ─────────────────────────────────────────
    // Prefer the rich stored version. If the schema stripped the extras
    // (name width/height/align, photo shape), re-detect from the template
    // image so generatePoster can properly center the name.
    let placeholders;
    if (hasRichPlaceholders(tpl)) {
      placeholders = storedTemplateToPixel(tpl);
    } else {
      try {
        const designRes = await cloudinary.api.resource(
          tpl.image.split('/').slice(-2).join('/').split('.')[0],
          { resource_type: 'image' }
        );
        const detection = await detectOnUploadedDesign({
          designUrl: tpl.image,
          designW: designRes.width,
          designH: designRes.height,
        });
        placeholders = detection.pixel;
      } catch (detectErr) {
        // If detection fails, fall back to stored (legacy) placeholders so
        // we still produce a poster.
        console.error(
          '⚠️ Fresh detection failed, using stored template:',
          detectErr.message
        );
        placeholders = storedTemplateToPixel(tpl);
      }
    }

    // ── Photo ────────────────────────────────────────────────────────
    const files = pickFiles(req);
    const photoFile = files.find((f) => f.fieldname === 'photo');

    let photoUrl = registration.userPhoto || '';
    if (photoFile) {
      photoUpload = await uploadToCloudinary(
        photoFile.path,
        'poster_photos',
        `photo_${registrationId}`
      );
      photoUrl = photoUpload.secure_url;
    }

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'A photo is required (field "photo") for this registration.',
      });
    }

    // ── Name ─────────────────────────────────────────────────────────
    const posterName = (req.body.name || registration.name || '').trim();
    if (!posterName) {
      return res
        .status(400)
        .json({ success: false, message: 'name is required.' });
    }

    // ── Compose ──────────────────────────────────────────────────────
    const posterUrl = await generatePoster(
      tpl.image,
      photoUrl,
      posterName,
      placeholders
    );

    registration.posterImage = posterUrl;
    registration.posterGenerated = true;
    registration.posterName = posterName;
    if (photoUpload) registration.userPhoto = photoUpload.secure_url;
    await registration.save();

    return res.status(200).json({
      success: true,
      message: 'Poster generated.',
      posterImage: posterUrl,
      registration,
    });
  } catch (err) {
    console.error('❌ AI event poster error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate event poster.',
    });
  }
};