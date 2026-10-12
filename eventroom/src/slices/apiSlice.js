// slices/apiSlice.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from './authslice.js';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || ''}/api`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.userInfo?.token || getState().auth?.adminInfo?.token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const url = typeof args === 'string' ? args : args?.url || '';
    
    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      api.dispatch(logout());
      window.location.href = '/login';
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Admin', 'Event', 'EventRegistration', 'MyEvent', 'Article', 'Video', 'Form', 'Submission'],
  endpoints: () => ({}),
});