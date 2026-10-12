// slices/aiApiSlice.js
import { apiSlice } from './apiSlice';

const AI_URL = '/ai';

export const aiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ==================== POSTER ====================

    // Detect the photo + name placeholders on a poster design.
    // Sends: { design: File }  → returns { placeholders, normalized, confidence }
    detectDesignPlaceholders: builder.mutation({
      query: (formData) => ({
        url: `${AI_URL}/poster/detect`,
        method: 'POST',
        body: formData,
        // RTK Query / fetch will set multipart/form-data automatically
        // when body is a FormData instance — do NOT set Content-Type.
        formData: true,
      }),
    }),

    // PUBLIC — anyone can generate a personalised poster.
    // Sends: { design: File, photo: File, name: string }
    // Returns: { posterImage, name, confidence, placeholders }
    generatePublicPoster: builder.mutation({
      query: (formData) => ({
        url: `${AI_URL}/poster/public`,
        method: 'POST',
        body: formData,
        formData: true,
      }),
    }),

    // Event creator / admin — uploads a design for an event, AI detects
    // placeholders once and stores them on event.posterTemplate.
    // Sends: { design: File }
    createEventPosterTemplate: builder.mutation({
      query: ({ eventId, formData }) => ({
        url: `${AI_URL}/poster/event/${eventId}/template`,
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Event', id: eventId },
      ],
    }),

    // Registered attendee — generates their personalised poster.
    // Sends: { photo?: File, name?: string }  (photo optional if saved on registration)
    generateEventPoster: builder.mutation({
      query: ({ eventId, registrationId, formData }) => ({
        url: `${AI_URL}/poster/event/${eventId}/registration/${registrationId}`,
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: (result, error, { registrationId }) => [
        { type: 'EventRegistration', id: registrationId },
      ],
    }),
  }),
});

export const {
  // Poster
  useDetectDesignPlaceholdersMutation,
  useGeneratePublicPosterMutation,
  useCreateEventPosterTemplateMutation,
  useGenerateEventPosterMutation,
} = aiApiSlice;