import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  companyName: string;
  isPremium: boolean;
  avatarUrl?: string;
  sector: string;
  openRouterKey?: string;
  website?: string;
  tagline?: string;
  location?: string;
  employeeCount?: string;
  foundationYear?: string;
  description?: string;
  sectors?: string[];
  capacities?: { id: string, label: string, checked: boolean }[];
  searchQuery?: string;
  allianceType?: string;
  objectives?: { id: string, title: string, description: string, budget: number }[];
  certificates?: { id: string, name: string, type: string, fileData?: string }[];
  services?: { 
    id: string, 
    name: string, 
    price: number, 
    unit?: string, 
    description?: string,
    type: 'Servicio' | 'Producto' | 'Sistema' | 'Aplicación',
    quantity?: number,
    totalPrice?: number,
    specialPrice?: number
  }[];
  budget?: number;
  blockedUsers?: string[];
  aiMatchingEnabled?: boolean;
  autoDeleteMessages?: boolean;
  bio?: string;
  visibility?: 'public' | 'connections' | 'private';
  logoUrl?: string;
  isVerified?: boolean;
  themeColor?: string;
  notificationsEnabled?: boolean;
  emailAlertsEnabled?: boolean;
  recoveryEmail?: string;
}

interface Notification {
  id: string; // Changed to string for Firestore IDs
  title: string;
  desc: string;
  time: string;
  read: boolean;
  createdAt: any;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (data: Partial<User>) => void;
  togglePremium: () => void;
  matches: string[]; 
  addMatch: (id: string) => void;
  blockUser: (id: string) => void;
  unblockUser: (id: string) => void;
  notifications: Notification[];
  setNotifications: (notifs: Notification[]) => void; // Added setNotifications
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  isHydrated: boolean;
  setHydrated: (val: boolean) => void;
  isLoading: boolean;
  setLoading: (val: boolean) => void;
  legalModal: 'terms' | 'privacy' | 'contact' | null;
  setLegalModal: (val: 'terms' | 'privacy' | 'contact' | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isHydrated: false,
  isLoading: true,
  legalModal: null,
  setLegalModal: (val) => set({ legalModal: val }),
  setHydrated: (val) => set({ isHydrated: val }),
  setLoading: (val) => set({ isLoading: val }),
  setUser: (user) => set({ user }),
  updateUser: (data) => set((state) => ({
    user: state.user ? { ...state.user, ...data } : null
  })),
  togglePremium: () => set((state) => ({
    user: state.user ? { ...state.user, isPremium: !state.user.isPremium } : null
  })),
  matches: [],
  addMatch: (id) => set((state) => ({
    matches: [...state.matches, id]
  })),
  blockUser: (id) => set((state) => ({
    user: state.user ? { ...state.user, blockedUsers: [...(state.user.blockedUsers || []), id] } : null
  })),
  unblockUser: (id) => set((state) => ({
    user: state.user ? { 
      ...state.user, 
      blockedUsers: (state.user.blockedUsers || []).filter(uid => uid !== id) 
    } : null
  })),
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
}));
