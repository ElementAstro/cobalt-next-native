import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'paused' | 'completed';

export interface ScanResult {
  id: string;
  host: string;
  port: number;
  status: 'open' | 'closed' | 'filtered' | 'error';
  service?: string;
  version?: string;
  latency?: number;
  details?: string;
  timestamp: number;
}

export interface ScanSession {
  id: string;
  target: string;
  ports: number[];
  startTime: number;
  endTime?: number;
  status: ScanStatus;
  results: ScanResult[];
  totalPorts: number;
  scannedPorts: number;
  openPorts: number;
  closedPorts: number;
  filteredPorts: number;
  errorPorts: number;
}

export interface ScanSettings {
  timeout: number;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  enableServiceDetection: boolean;
  enableVersionDetection: boolean;
  enableOSDetection: boolean;
  customUserAgent: string;
  scanDelay: number;
  randomizeOrder: boolean;
}

export interface AdvancedScanSettings {
  tcpConnectScan: boolean;
  tcpSynScan: boolean;
  udpScan: boolean;
  stealthMode: boolean;
  fragmentPackets: boolean;
  spoofSourceIP: string;
  sourcePort: number;
  decoyHosts: string[];
  timing: 'paranoid' | 'sneaky' | 'polite' | 'normal' | 'aggressive' | 'insane';
  hostDiscovery: boolean;
  skipHostDiscovery: boolean;
  dnsResolution: boolean;
  reverseDnsLookup: boolean;
}

export interface ScannerState {
  // Current scan state
  currentSession: ScanSession | null;
  isScanning: boolean;
  scanProgress: number;

  // Scan history
  sessions: ScanSession[];

  // Settings
  settings: ScanSettings;
  advancedSettings: AdvancedScanSettings;

  // UI State
  scanSpeed: string;
  timeout: number;
  showClosedPorts: boolean;
  scanMethod: string;
  autoReconnect: boolean;
  notificationsEnabled: boolean;

  // Actions
  startScan: (target: string, ports: number[]) => Promise<void>;
  stopScan: () => void;
  pauseScan: () => void;
  resumeScan: () => void;
  addResult: (result: ScanResult) => void;
  updateProgress: (progress: number) => void;
  updateSettings: (settings: Partial<ScanSettings>) => void;
  updateAdvancedSettings: (settings: Partial<AdvancedScanSettings>) => void;
  clearHistory: () => void;
  deleteSession: (sessionId: string) => void;
  exportResults: (sessionId: string) => Promise<string>;

  // UI Actions
  setScanSpeed: (speed: string) => void;
  setTimeout: (timeout: number) => void;
  setShowClosedPorts: (show: boolean) => void;
  setScanMethod: (method: string) => void;
  setAutoReconnect: (auto: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

const DEFAULT_SETTINGS: ScanSettings = {
  timeout: 5000,
  concurrency: 50,
  retryAttempts: 2,
  retryDelay: 1000,
  enableServiceDetection: true,
  enableVersionDetection: false,
  enableOSDetection: false,
  customUserAgent: 'CobaltScanner/1.0',
  scanDelay: 0,
  randomizeOrder: false,
};

const DEFAULT_ADVANCED_SETTINGS: AdvancedScanSettings = {
  tcpConnectScan: true,
  tcpSynScan: false,
  udpScan: false,
  stealthMode: false,
  fragmentPackets: false,
  spoofSourceIP: '',
  sourcePort: 0,
  decoyHosts: [],
  timing: 'normal',
  hostDiscovery: true,
  skipHostDiscovery: false,
  dnsResolution: true,
  reverseDnsLookup: false,
};

const useScannerStore = create<ScannerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      isScanning: false,
      scanProgress: 0,
      sessions: [],
      settings: DEFAULT_SETTINGS,
      advancedSettings: DEFAULT_ADVANCED_SETTINGS,

      // UI State
      scanSpeed: 'normal',
      timeout: 5000,
      showClosedPorts: false,
      scanMethod: 'tcp',
      autoReconnect: true,
      notificationsEnabled: true,

      // Actions
      startScan: async (target: string, ports: number[]) => {
        const sessionId = Date.now().toString();
        const newSession: ScanSession = {
          id: sessionId,
          target,
          ports,
          startTime: Date.now(),
          status: 'scanning',
          results: [],
          totalPorts: ports.length,
          scannedPorts: 0,
          openPorts: 0,
          closedPorts: 0,
          filteredPorts: 0,
          errorPorts: 0,
        };

        set({
          currentSession: newSession,
          isScanning: true,
          scanProgress: 0,
        });

        // Add to sessions history
        set((state) => ({
          sessions: [newSession, ...state.sessions],
        }));
      },

      stopScan: () => {
        const { currentSession } = get();
        if (currentSession) {
          const updatedSession: ScanSession = {
            ...currentSession,
            endTime: Date.now(),
            status: 'idle',
          };

          set({
            currentSession: null,
            isScanning: false,
            scanProgress: 0,
          });

          // Update session in history
          set((state) => ({
            sessions: state.sessions.map(session =>
              session.id === updatedSession.id ? updatedSession : session
            ),
          }));
        }
      },

      pauseScan: () => {
        set({ isScanning: false });
      },

      resumeScan: () => {
        set({ isScanning: true });
      },

      addResult: (result: ScanResult) => {
        const { currentSession } = get();
        if (!currentSession) return;

        const updatedSession: ScanSession = {
          ...currentSession,
          results: [...currentSession.results, result],
          scannedPorts: currentSession.scannedPorts + 1,
          openPorts: result.status === 'open' ? currentSession.openPorts + 1 : currentSession.openPorts,
          closedPorts: result.status === 'closed' ? currentSession.closedPorts + 1 : currentSession.closedPorts,
          filteredPorts: result.status === 'filtered' ? currentSession.filteredPorts + 1 : currentSession.filteredPorts,
          errorPorts: result.status === 'error' ? currentSession.errorPorts + 1 : currentSession.errorPorts,
        };

        // Check if scan is complete
        if (updatedSession.scannedPorts >= updatedSession.totalPorts) {
          updatedSession.endTime = Date.now();
          updatedSession.status = 'success';
          set({ isScanning: false });
        }

        set({ currentSession: updatedSession });

        // Update session in history
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === updatedSession.id ? updatedSession : session
          ),
        }));
      },

      updateProgress: (progress: number) => {
        set({ scanProgress: progress });
      },

      updateSettings: (newSettings: Partial<ScanSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      updateAdvancedSettings: (newSettings: Partial<AdvancedScanSettings>) => {
        set((state) => ({
          advancedSettings: { ...state.advancedSettings, ...newSettings },
        }));
      },

      clearHistory: () => {
        set({ sessions: [] });
      },

      deleteSession: (sessionId: string) => {
        set((state) => ({
          sessions: state.sessions.filter(session => session.id !== sessionId),
        }));
      },

      exportResults: async (sessionId: string) => {
        const { sessions } = get();
        const session = sessions.find(s => s.id === sessionId);
        if (!session) throw new Error('Session not found');

        return JSON.stringify(session, null, 2);
      },

      // UI Actions
      setScanSpeed: (speed: string) => {
        set({ scanSpeed: speed });
      },

      setTimeout: (timeout: number) => {
        set({ timeout });
      },

      setShowClosedPorts: (show: boolean) => {
        set({ showClosedPorts: show });
      },

      setScanMethod: (method: string) => {
        set({ scanMethod: method });
      },

      setAutoReconnect: (auto: boolean) => {
        set({ autoReconnect: auto });
      },

      setNotificationsEnabled: (enabled: boolean) => {
        set({ notificationsEnabled: enabled });
      },
    }),
    {
      name: 'scanner-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        settings: state.settings,
        advancedSettings: state.advancedSettings,
      }),
    }
  )
);

export default useScannerStore;
