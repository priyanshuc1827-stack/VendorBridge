import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'officer' | 'vendor' | 'manager';
  vendor_id: number | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  role: 'admin' | 'officer' | 'vendor' | 'manager' | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      login: (user, token) => {
        // Set Zustand state
        set({ user, token, role: user.role });

        // Set Cookies for Next.js Middleware route guard
        if (typeof window !== 'undefined') {
          const maxAge = 8 * 60 * 60; // 8 hours matching token expiry
          document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = `role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = `vendor_id=${user.vendor_id || ''}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
      },
      logout: () => {
        set({ user: null, token: null, role: null });

        // Clear Cookies
        if (typeof window !== 'undefined') {
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'vendor_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      },
    }),
    {
      name: 'vendorbridge-auth',
    }
  )
);
