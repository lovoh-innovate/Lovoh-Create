// utils/generatePoster.js
import sharp from 'sharp';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

// Escape text so a name like `Ada & Co <3` doesn't break the SVG.
const escapeXml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Rough character-width heuristic for a bold sans font. Good enough to
// decide when to shrink text so it fits inside a fixed-width box.
const estimateTextWidth = (text, fontSize) => text.length * fontSize * 0.58;

// Shrink the font until the estimated width fits the box, floor at minSize.
const fitFontSizeToBox = (text, maxWidth, startSize, minSize = 12) => {
  let size = Math.round(startSize);
  if (!text || maxWidth <= 0) return size;
  while (size > minSize && estimateTextWidth(text, size) > maxWidth) {
    size -= 2;
  }
  return size;
};

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────
export const generatePoster = async (
  templateUrl,
  userPhotoUrl,
  userName,
  placeholders
) => {
  try {
    console.log('🔍 generatePoster called with:', {
      templateUrl,
      userPhotoUrl,
      userName,
      placeholders,
    });

    const templateRes = await axios.get(templateUrl, {
      responseType: 'arraybuffer',
    });
    const templateBuffer = Buffer.from(templateRes.data);

    const metadata = await sharp(templateBuffer).metadata();
    const { width: templateWidth, height: templateHeight } = metadata;
    console.log('📐 Template dimensions:', templateWidth, 'x', templateHeight);

    const compositeLayers = [];

    // ───────────── PHOTO ─────────────
    if (userPhotoUrl) {
      console.log('📷 Downloading user photo from:', userPhotoUrl);
      try {
        const photoRes = await axios.get(userPhotoUrl, {
          responseType: 'arraybuffer',
        });
        const photoBuffer = Buffer.from(photoRes.data);

        const photoP = placeholders?.photo || {};
        let {
          x = 0,
          y = 0,
          width = 200,
          height = 200,
          borderRadius,
          shape,
        } = photoP;

        x = Math.round(x);
        y = Math.round(y);
        width = Math.round(width);
        height = Math.round(height);

        // Clamp so the photo doesn't spill outside the template.
        x = Math.max(0, Math.min(x, templateWidth - 1));
        y = Math.max(0, Math.min(y, templateHeight - 1));
        width = Math.max(1, Math.min(width, templateWidth - x));
        height = Math.max(1, Math.min(height, templateHeight - y));

        // Derive a sensible corner radius:
        // - circle  → perfect circle
        // - rounded → use provided radius, else a soft default
        // - square  → 0
        let finalRadius = 0;
        if (shape === 'circle') {
          finalRadius = Math.round(Math.min(width, height) / 2);
        } else if (shape === 'rounded') {
          finalRadius = Math.round(
            typeof borderRadius === 'number' && borderRadius > 0
              ? borderRadius
              : Math.min(width, height) * 0.15
          );
        } else {
          finalRadius = Math.round(borderRadius || 0);
        }
        finalRadius = Math.max(0, Math.min(finalRadius, Math.min(width, height) / 2));

        console.log('📐 Photo placeholder (final):', {
          x,
          y,
          width,
          height,
          borderRadius: finalRadius,
          shape: shape || 'square',
        });

        let resizedPhoto = await sharp(photoBuffer)
          .resize(width, height, { fit: 'cover', position: 'top' })
          .png()
          .toBuffer();

        if (finalRadius > 0) {
          const maskSvg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="${width}" height="${height}" rx="${finalRadius}" ry="${finalRadius}" fill="white" />
            </svg>
          `;
          const maskBuffer = await sharp(Buffer.from(maskSvg)).png().toBuffer();

          resizedPhoto = await sharp(resizedPhoto)
            .composite([{ input: maskBuffer, blend: 'dest-in' }])
            .png()
            .toBuffer();
        }

        compositeLayers.push({
          input: resizedPhoto,
          left: x,
          top: y,
          blend: 'over',
        });
      } catch (photoErr) {
        console.error('❌ Error processing photo:', photoErr.message);
      }
    }

    // ───────────── NAME ─────────────
    // The placeholder may come in two shapes:
    //   1. New detection: { x, y, width, height, fontSize, color, fontFamily, align }
    //      → we center the text in the box.
    //   2. Legacy: { x, y, fontSize, color, fontFamily } (from eventController)
    //      → we fall back to top-left + hanging baseline (old behaviour).
    const nameP = placeholders?.name || {};
    const {
      x: rawX = 100,
      y: rawY = 400,
      width: rawW,
      height: rawH,
      fontSize: rawFontSize = 48,
      color = '#FFFFFF',
      fontFamily = 'Arial',
      align = 'center',
    } = nameP;

    const boxX = Math.max(0, Math.round(rawX));
    const boxY = Math.max(0, Math.round(rawY));
    const boxW = rawW != null ? Math.max(1, Math.round(rawW)) : null;
    const boxH = rawH != null ? Math.max(1, Math.round(rawH)) : null;

    const safeName = escapeXml(userName || '');
    const safeFamily = `${fontFamily}, Arial, Helvetica, sans-serif`;

    let svg;

    if (boxW != null && boxH != null) {
      // ── Boxed mode: center the text inside the box, honour `align` ──
      const fittedFontSize = fitFontSizeToBox(
        userName || '',
        boxW,
        rawFontSize,
        10
      );

      // Choose anchor + x based on alignment.
      let anchor = 'middle';
      let textX = boxX + boxW / 2;
      if (align === 'left') {
        anchor = 'start';
        textX = boxX + Math.max(6, Math.round(fittedFontSize * 0.1));
      } else if (align === 'right') {
        anchor = 'end';
        textX = boxX + boxW - Math.max(6, Math.round(fittedFontSize * 0.1));
      }

      // Vertically centre using `dominant-baseline="middle"`.
      const textY = boxY + boxH / 2;

      console.log('✏️ Name (boxed):', {
        boxX,
        boxY,
        boxW,
        boxH,
        fontSize: fittedFontSize,
        anchor,
        align,
      });

      svg = `
        <svg width="${templateWidth}" height="${templateHeight}" xmlns="http://www.w3.org/2000/svg">
          <text
            x="${textX}"
            y="${textY}"
            font-family="${safeFamily}"
            font-size="${fittedFontSize}"
            font-weight="bold"
            fill="${color}"
            text-anchor="${anchor}"
            dominant-baseline="middle"
          >${safeName}</text>
        </svg>
      `;
    } else {
      // ── Legacy mode: keep old behaviour (top-left, hanging) ──
      const textX = Math.min(boxX, templateWidth);
      const textY = Math.min(boxY, templateHeight);
      const fontSize = Math.round(rawFontSize);

      console.log('✏️ Name (legacy):', { textX, textY, fontSize });

      svg = `
        <svg width="${templateWidth}" height="${templateHeight}" xmlns="http://www.w3.org/2000/svg">
          <text
            x="${textX}"
            y="${textY}"
            font-family="${safeFamily}"
            font-size="${fontSize}"
            font-weight="bold"
            fill="${color}"
            dominant-baseline="hanging"
            text-anchor="start"
          >${safeName}</text>
        </svg>
      `;
    }

    const svgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    compositeLayers.push({
      input: svgBuffer,
      left: 0,
      top: 0,
      blend: 'over',
    });

    // ───────────── COMPOSITE ─────────────
    let image = sharp(templateBuffer);
    if (compositeLayers.length > 0) {
      image = image.composite(compositeLayers);
    }

    const finalBuffer = await image.png().toBuffer();

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'event_posters', public_id: `poster_${Date.now()}` },
          (err, result) => (err ? reject(err) : resolve(result))
        )
        .end(finalBuffer);
    });

    console.log('✅ Poster uploaded to Cloudinary:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('❌ Poster generation error:', error);
    throw new Error('Could not generate poster');
  }
};