// routes/aiRoutes.js
import express from 'express';
import multer from 'multer';
import {
  detectDesignPlaceholders,
  generatePublicPosterAI,
  createEventPosterTemplateAI,
  generateEventPosterAI,
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js'; // ← adjust path

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Detect placeholders in a design (preview — for creators / clients)
router.post(
  '/poster/detect',
  protect,
  upload.any(),
  detectDesignPlaceholders
);

// PUBLIC — anyone can use it: design + photo + name → composed poster
router.post(
  '/poster/public',
  upload.any(),
  generatePublicPosterAI
);

// Creator saves a design for their event; AI detects & stores placeholders
router.post(
  '/poster/event/:eventId/template',
  protect,
  upload.any(),
  createEventPosterTemplateAI
);

// Registered attendee generates their personalised poster for an event
router.post(
  '/poster/event/:eventId/registration/:registrationId',
  protect,
  upload.any(),
  generateEventPosterAI
);

export default router;