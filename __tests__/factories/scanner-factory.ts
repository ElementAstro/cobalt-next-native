/**
 * Scanner Factory
 * Creates test data for network scanning operations
 */

export interface ScanResultData {
  id: string;
  host: string;
  port: number;
  status: 'open' | 'closed' | 'filtered' | 'timeout';
  service?: string;
  version?: string;
  responseTime: number;
  timestamp: string;
  banner?: string;
  ssl?: {
    enabled: boolean;
    version?: string;
    cipher?: string;
    certificate?: {
      subject: string;
      issuer: string;
      validFrom: string;
      validTo: string;
    };
  };
}

export interface ScanConfigData {
  target: string;
  portRange: {
    start: number;
    end: number;
  };
  timeout: number;
  maxConcurrent: number;
  scanType: 'tcp' | 'udp' | 'syn';
  detectService: boolean;
  detectVersion: boolean;
  skipPing: boolean;
}

export interface ScanSessionData {
  id: string;
  config: ScanConfigData;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: string;
  endTime?: string;
  results: ScanResultData[];
  statistics: {
    totalPorts: number;
    scannedPorts: number;
    openPorts: number;
    closedPorts: number;
    filteredPorts: number;
    timeoutPorts: number;
  };
  error?: string;
}

export const createScanResult = (overrides: Partial<ScanResultData> = {}): ScanResultData => ({
  id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  host: '192.168.1.1',
  port: 80,
  status: 'open',
  service: 'http',
  version: 'Apache/2.4.41',
  responseTime: 25,
  timestamp: new Date().toISOString(),
  banner: 'HTTP/1.1 200 OK\r\nServer: Apache/2.4.41',
  ...overrides,
});

export const createScanConfig = (overrides: Partial<ScanConfigData> = {}): ScanConfigData => ({
  target: '192.168.1.1',
  portRange: {
    start: 1,
    end: 1000,
  },
  timeout: 3000,
  maxConcurrent: 50,
  scanType: 'tcp',
  detectService: true,
  detectVersion: true,
  skipPing: false,
  ...overrides,
});

export const createScanSession = (overrides: Partial<ScanSessionData> = {}): ScanSessionData => ({
  id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  config: createScanConfig(),
  status: 'pending',
  progress: 0,
  startTime: new Date().toISOString(),
  results: [],
  statistics: {
    totalPorts: 1000,
    scannedPorts: 0,
    openPorts: 0,
    closedPorts: 0,
    filteredPorts: 0,
    timeoutPorts: 0,
  },
  ...overrides,
});

export const createOpenPortResult = (port: number = 80): ScanResultData => 
  createScanResult({
    port,
    status: 'open',
    service: port === 80 ? 'http' : port === 443 ? 'https' : port === 22 ? 'ssh' : 'unknown',
    responseTime: Math.floor(Math.random() * 100) + 10,
  });

export const createClosedPortResult = (port: number = 8080): ScanResultData => 
  createScanResult({
    port,
    status: 'closed',
    service: undefined,
    version: undefined,
    responseTime: Math.floor(Math.random() * 50) + 5,
    banner: undefined,
  });

export const createTimeoutPortResult = (port: number = 9999): ScanResultData => 
  createScanResult({
    port,
    status: 'timeout',
    service: undefined,
    version: undefined,
    responseTime: 3000,
    banner: undefined,
  });

export const createSSLPortResult = (port: number = 443): ScanResultData => 
  createScanResult({
    port,
    status: 'open',
    service: 'https',
    version: 'nginx/1.18.0',
    ssl: {
      enabled: true,
      version: 'TLSv1.3',
      cipher: 'TLS_AES_256_GCM_SHA384',
      certificate: {
        subject: 'CN=example.com',
        issuer: 'CN=Let\'s Encrypt Authority X3',
        validFrom: '2023-01-01T00:00:00Z',
        validTo: '2024-01-01T00:00:00Z',
      },
    },
  });

export const createRunningScanSession = (): ScanSessionData => 
  createScanSession({
    status: 'running',
    progress: 45,
    results: [
      createOpenPortResult(22),
      createOpenPortResult(80),
      createOpenPortResult(443),
      createClosedPortResult(8080),
    ],
    statistics: {
      totalPorts: 1000,
      scannedPorts: 450,
      openPorts: 3,
      closedPorts: 447,
      filteredPorts: 0,
      timeoutPorts: 0,
    },
  });

export const createCompletedScanSession = (): ScanSessionData => 
  createScanSession({
    status: 'completed',
    progress: 100,
    endTime: new Date().toISOString(),
    results: [
      createOpenPortResult(22),
      createOpenPortResult(80),
      createOpenPortResult(443),
      createSSLPortResult(8443),
      ...Array.from({ length: 996 }, (_, i) => createClosedPortResult(i + 1000)),
    ],
    statistics: {
      totalPorts: 1000,
      scannedPorts: 1000,
      openPorts: 4,
      closedPorts: 996,
      filteredPorts: 0,
      timeoutPorts: 0,
    },
  });

export const createFailedScanSession = (): ScanSessionData => 
  createScanSession({
    status: 'failed',
    progress: 15,
    endTime: new Date().toISOString(),
    error: 'Network unreachable',
    statistics: {
      totalPorts: 1000,
      scannedPorts: 150,
      openPorts: 0,
      closedPorts: 0,
      filteredPorts: 0,
      timeoutPorts: 150,
    },
  });

export const createSubnetScanConfig = (): ScanConfigData => 
  createScanConfig({
    target: '192.168.1.0/24',
    portRange: { start: 1, end: 65535 },
    maxConcurrent: 100,
  });

export const createQuickScanConfig = (): ScanConfigData => 
  createScanConfig({
    portRange: { start: 1, end: 100 },
    timeout: 1000,
    maxConcurrent: 20,
    detectService: false,
    detectVersion: false,
  });
