// slices/apiSlice.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from './authslice.js';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || ''}/api`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState();
    const adminToken = state.auth?.adminInfo?.token;
    const userToken = state.auth?.userInfo?.token;
    
    headers.delete('authorization');
    
    const token = adminToken || userToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    let url = '';
    if (typeof args === 'string') {
      url = args;
    } else if (args?.url) {
      url = args.url;
    }

    const isUserEndpoint =
      url.startsWith('/users') ||
      url.startsWith('/shop') ||
      url.startsWith('/orders');

    if (isUserEndpoint) {
      api.dispatch(logout());
      window.location.href = '/uduua/shop/login';
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    // Existing
    'Product', 'Order', 'User', 'Admin', 'Story',
    'Event', 'MagazineStats', 'Subscriber', 'EventRegistration', 'EventFilters',
    'Magazine',
    // Articles & Social
    'Article', 'ArticleCategories', 'BookmarkedArticle',
    // Videos
    'Video', 'VideoFeed', 'UserVideo',
    // Users/Profile
    'UserProfile', 'UserSuggestions', 'UserFollowers', 'UserFollowing',
    // Events
    'MyRegistration', 'MyEvent', 'Wallet',
    // Custom Forms
    'Form', 'PublicForm', 'FormSubmission', 'FormAnalytics', 'FormExport',
    'Submission', 'AdminForms',
  ],
  endpoints: () => ({}),
});