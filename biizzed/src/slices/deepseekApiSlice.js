// slices/deepseekApiSlice.js
import { apiSlice } from './apiSlice';

export const deepseekApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchDeepseek: builder.mutation({
      query: (params) => ({ // <-- accept an object, not a single value
        url: '/deepseek/search',
        method: 'POST',
        body: params, // <-- send params directly (they already contain query and mode)
      }),
      transformResponse: (response) => response.results || [],
      transformErrorResponse: (response) => {
        return response.data?.error || 'Search failed';
      },
    }),
  }),
});

export const { useSearchDeepseekMutation } = deepseekApiSlice;