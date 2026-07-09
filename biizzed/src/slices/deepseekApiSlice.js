// slices/deepseekApiSlice.js
import { apiSlice } from './apiSlice';

export const deepseekApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchDeepseek: builder.mutation({
      query: (params) => ({
        url: '/deepseek/search',
        method: 'POST',
        body: params,
      }),
      transformResponse: (response) => {
        // Ensure we always return an array
        const results = response?.results;
        if (Array.isArray(results)) return results;
        if (results && typeof results === 'object') return [results];
        return [];
      },
      transformErrorResponse: (response) => {
        return response.data?.error || 'Search failed';
      },
    }),
  }),
});

export const { useSearchDeepseekMutation } = deepseekApiSlice;