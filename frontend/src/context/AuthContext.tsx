"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi, groupsApi } from "../lib/api";

export interface User {
  id: string;
  email: string;
  nickname: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  updateLocalNickname: (nickname: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 최초 로드 시 로컬 스토리지에서 세션 복원
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // 복원 실패 시 세션 날리기
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await authApi.login(email, password);
      
      if (res.access_token && res.user) {
        const loggedUser: User = {
          id: res.user.id,
          email: res.user.email,
          nickname: res.user.nickname,
        };

        localStorage.setItem("access_token", res.access_token);
        localStorage.setItem("user", JSON.stringify(loggedUser));
        
        setToken(res.access_token);
        setUser(loggedUser);

        router.push("/portfolio");
      } else {
        throw new Error("올바르지 않은 응답 데이터 형식입니다.");
      }
    } catch (error: any) {
      throw new Error(error.message || "로그인 도중 에러가 발생했습니다.");
    }
  };

  const signup = async (email: string, password: string, nickname: string) => {
    try {
      await authApi.signup(email, password, nickname);
      // 회원가입 완료 후 즉시 로그인 시도
      await login(email, password);
    } catch (error: any) {
      throw new Error(error.message || "회원가입 도중 에러가 발생했습니다.");
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    router.push("/");
  };

  const updateLocalNickname = (newNickname: string) => {
    if (user) {
      const updated = { ...user, nickname: newNickname };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        updateLocalNickname,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth는 반드시 AuthProvider 안에서 사용해야 합니다.");
  }
  return context;
}
