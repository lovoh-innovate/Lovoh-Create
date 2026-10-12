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

// Simple baseQuery without any redirect logic
export const apiSlice = createApi({
  baseQuery: baseQuery,
  tagTypes: [
    'Product', 'Order', 'User', 'Admin', 'Story',
    'Event', 'MagazineStats', 'Subscriber', 'EventRegistration', 'EventFilters',
    'Magazine',
    'Article', 'ArticleCategories', 'BookmarkedArticle',
    'Video', 'VideoFeed', 'UserVideo',
    'UserProfile', 'UserSuggestions', 'UserFollowers', 'UserFollowing',
    'MyRegistration', 'MyEvent', 'Wallet',
    'Form', 'PublicForm', 'FormSubmission', 'FormAnalytics', 'FormExport',
    'Submission', 'AdminForms',  'Payouts',
  'SellerPayouts',
  ],
  endpoints: () => ({}),
});