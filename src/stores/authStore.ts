import { create } from 'zustand';
import type { UserInfo } from '../api/auth';
import { getStoredUser, isAuthenticated, updateProfile } from '../api/auth';
import type { LocalAccount } from '@types/index';

interface AuthState {
  user: UserInfo | null;
  isLoggedIn: boolean;
  initialized: boolean;

  account: LocalAccount | null;
  ensureAccount: () => void;
  updateAccount: (data: { name: string; avatar?: string; bio?: string }) => void;
  importAccount: (data: any) => boolean;

  setUser: (user: UserInfo | null) => void;
  login: (user: UserInfo) => void;
  logout: () => void;
  initialize: () => void;
}

function userToAccount(user: UserInfo | null): LocalAccount | null {
  if (!user) return null;
  return {
    name: user.nickname || user.username,
    avatar: user.avatar || '🦊',
    bio: user.bio || '',
    createdAt: user.created_at || Date.now(),
    lastActiveAt: user.last_active_at || Date.now(),
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  initialized: false,

  get account() {
    return userToAccount(get().user);
  },
  ensureAccount: () => {
    const state = get();
    if (!state.user && !state.isLoggedIn && !state.initialized) {
      state.initialize();
    }
  },
  updateAccount: async (data) => {
    try {
      const res = await updateProfile({
        nickname: data.name,
        avatar: data.avatar,
        bio: data.bio,
      });
      set({ user: res.user });
    } catch (err) {
      console.error('[AuthStore] 更新账号失败:', err);
    }
  },
  importAccount: () => {
    window.alert('服务端模式下请使用登录功能，无需导入本地账号');
    return false;
  },

  setUser: (user) => set({ user, isLoggedIn: !!user }),

  login: (user) => {
    set({ user, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, isLoggedIn: false });
  },

  initialize: () => {
    const stored = getStoredUser();
    const authed = isAuthenticated();
    set({
      user: stored,
      isLoggedIn: authed && !!stored,
      initialized: true,
    });
  },
}));

/** 导出账号数据包类型 */
export interface AccountExportBundle {
  version: string;
  exportedAt: number;
  account: {
    name: string;
    avatar?: string;
    bio?: string;
    createdAt: number;
    lastActiveAt: number;
  };
}

/** 导出当前账号为 JSON 文件并触发下载 */
export function exportAccountToFile(): void {
  const user = useAuthStore.getState().user;
  if (!user) return;

  const bundle: AccountExportBundle = {
    version: '1.0',
    exportedAt: Date.now(),
    account: {
      name: user.nickname || user.username,
      avatar: user.avatar || '🦊',
      bio: user.bio || '',
      createdAt: user.created_at || Date.now(),
      lastActiveAt: user.last_active_at || Date.now(),
    },
  };

  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const fileName = `ChillPass-Account-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
