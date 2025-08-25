/**
 * Network Factory
 * Creates test data for network-related operations
 */

import type { NetworkState } from '~/types/common';

export interface NetworkRequestData {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body?: any;
  timeout: number;
  retries: number;
  timestamp: string;
}

export interface NetworkResponseData {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
  timestamp: string;
  error?: string;
}

export const createNetworkState = (overrides: Partial<NetworkState> = {}): NetworkState => ({
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  ...overrides,
});

export const createNetworkRequest = (overrides: Partial<NetworkRequestData> = {}): NetworkRequestData => ({
  id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'CobaltApp/1.0.0',
  },
  timeout: 30000,
  retries: 3,
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createNetworkResponse = (overrides: Partial<NetworkResponseData> = {}): NetworkResponseData => ({
  id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  status: 200,
  statusText: 'OK',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': '1024',
  },
  data: { success: true, message: 'Test response' },
  responseTime: 250,
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createOfflineNetworkState = (): NetworkState => 
  createNetworkState({
    isConnected: false,
    isInternetReachable: false,
    type: null,
  });

export const createCellularNetworkState = (): NetworkState => 
  createNetworkState({
    type: 'cellular',
  });

export const createEthernetNetworkState = (): NetworkState => 
  createNetworkState({
    type: 'ethernet',
  });

export const createSlowNetworkState = (): NetworkState => 
  createNetworkState({
    type: 'cellular',
    isConnected: true,
    isInternetReachable: true,
  });

export const createPostRequest = (data: any = {}): NetworkRequestData => 
  createNetworkRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    body: data,
  });

export const createErrorResponse = (status: number = 500): NetworkResponseData => 
  createNetworkResponse({
    status,
    statusText: status === 404 ? 'Not Found' : status === 500 ? 'Internal Server Error' : 'Error',
    data: { error: true, message: 'Request failed' },
    error: 'Network request failed',
  });

export const createTimeoutResponse = (): NetworkResponseData => 
  createNetworkResponse({
    status: 0,
    statusText: 'Timeout',
    data: null,
    responseTime: 30000,
    error: 'Request timeout',
  });

export const createSuccessResponse = (data: any = {}): NetworkResponseData => 
  createNetworkResponse({
    status: 200,
    statusText: 'OK',
    data: { success: true, ...data },
    responseTime: Math.floor(Math.random() * 500) + 100,
  });

export const createLargeResponse = (): NetworkResponseData => 
  createNetworkResponse({
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '10485760', // 10MB
    },
    data: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item-${i}` })),
    responseTime: 2500,
  });

export const createAuthenticatedRequest = (token: string = 'test-token'): NetworkRequestData => 
  createNetworkRequest({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

export const createUnauthorizedResponse = (): NetworkResponseData => 
  createNetworkResponse({
    status: 401,
    statusText: 'Unauthorized',
    data: { error: true, message: 'Authentication required' },
    error: 'Unauthorized access',
  });

export const createRateLimitedResponse = (): NetworkResponseData => 
  createNetworkResponse({
    status: 429,
    statusText: 'Too Many Requests',
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '60',
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
    },
    data: { error: true, message: 'Rate limit exceeded' },
    error: 'Rate limit exceeded',
  });
