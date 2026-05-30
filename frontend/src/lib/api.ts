const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// HTTP Request Helper
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // 로컬 스토리지에서 토큰 가져와 헤더에 자동 주입
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "요청을 처리하는 도중 오류가 발생했습니다.");
  }

  return data as T;
}

// === AUTH API ===
export interface AuthResponse {
  status: string;
  message?: string;
  access_token?: string;
  token_type?: string;
  user_id?: string;
  nickname?: string;
  user?: {
    id: string;
    email: string;
    nickname: string | null;
  };
}

export const authApi = {
  signup: (email: string, password: string, nickname: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// === PORTFOLIO & STOCKS API ===
export interface StockHolding {
  id: string;
  user_id: string;
  ticker_symbol: string;
  avg_price: number;
  quantity: number;
  stocks?: {
    current_price: number;
    name: string;
  } | null;
}

export interface PortfolioSummaryResponse {
  user_id?: string;
  message?: string;
  summary?: {
    total_purchase: number;
    total_value: number;
    total_profit: number;
    total_yield_percent: number;
  };
  holdings?: StockHolding[];
}

export interface SearchStockItem {
  id: string;
  ticker_symbol: string;
  name: string;
  current_price: number | null;
}

export const portfolioApi = {
  getSummary: (userId: string) =>
    request<PortfolioSummaryResponse>(`/portfolio/summary/${userId}`),

  searchStocks: (query: string) =>
    request<SearchStockItem[]>(`/portfolio/search?query=${encodeURIComponent(query)}`),

  addStock: (userId: string, tickerSymbol: string, avgPrice: number, quantity: number) =>
    request<{ status: string; message: string; current_price: number; data: any }>(
      "/portfolio/add",
      {
        method: "POST",
        body: JSON.stringify({ user_id: userId, ticker_symbol: tickerSymbol, avg_price: avgPrice, quantity }),
      }
    ),

  removeStock: (itemId: string) =>
    request<{ status: string; message: string }>(`/portfolio/remove/${itemId}`, {
      method: "DELETE",
    }),

  updateStock: (itemId: string, avgPrice: number, quantity: number) =>
    request<{ status: string; message: string; data: any }>(`/portfolio/update/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ avg_price: avgPrice, quantity }),
    }),
};


// === GROUPS API ===
export interface GroupMember {
  user_id: string;
  profiles: {
    nickname: string | null;
  } | null;
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  ticker_symbol: string;
  stock_name?: string;
  target_price: number;
  entry_price: number;
  prediction_type: "RISE" | "FALL";
  target_date: string;
  status: "pending" | "success" | "failed";
  created_at: string;
  description?: string;
  profiles?: {
    nickname: string | null;
  } | null;
}

export interface GroupRankingItem {
  user_id: string;
  nickname: string;
  yield: number;
  total_value: number;
}

export interface GroupRankingResponse {
  group_id: string;
  ranking: GroupRankingItem[];
}

export const groupsApi = {
  getUserGroups: (userId: string) =>
    request<{ status: string; data: any[] }>(`/groups/user/${userId}`),

  createGroup: (userId: string, groupName: string) =>
    request<{ status: string; group_id: string; invite_code: string }>("/groups/create", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, group_name: groupName }),
    }),

  joinGroup: (userId: string, inviteCode: string) =>
    request<{ status: string; message: string }>(
      `/groups/join?user_id=${encodeURIComponent(userId)}&invite_code=${encodeURIComponent(inviteCode)}`,
      {
        method: "POST",
      }
    ),

  updateProfile: (userId: string, nickname: string) =>
    request<{ status: string; nickname: string }>("/groups/profile/update", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, nickname }),
    }),

  addHedgePost: (
    groupId: string,
    userId: string,
    tickerSymbol: string,
    targetPrice: number,
    predictionType: "RISE" | "FALL",
    targetDate: string,
    description?: string
  ) =>
    request<{ status: string; message: string; data: GroupPost }>(`/groups/${groupId}/posts`, {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        ticker_symbol: tickerSymbol,
        target_price: targetPrice,
        prediction_type: predictionType,
        target_date: targetDate,
        description: description,
      }),
    }),

  listGroupPosts: (groupId: string) =>
    request<{ status: string; data: GroupPost[] }>(`/groups/${groupId}/posts`),

  getPostDetail: (groupId: string, postId: string) =>
    request<{ status: string; data: GroupPost }>(`/groups/${groupId}/posts/${postId}`),

  getGroupRanking: (groupId: string) =>
    request<GroupRankingResponse>(`/groups/${groupId}/ranking`),
};
