const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const TOKEN_KEY = "access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
  }

  return response;
}

async function parseJson(response) {
  if (response.status === 401 || response.status === 403) {
    throw new Error("Invalid email or password");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || data.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

export const authApi = {
  login(email, password) {
    return api("/api/v1/auth/authenticate", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then(parseJson);
  },

  register({ firstname, lastname, email, password }) {
    return api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ firstname, lastname, email, password }),
    }).then(parseJson);
  },

  validateSession() {
    return api("/api/v1/demo-controller").then((response) => response.ok);
  },
};

export const subscriptionApi = {
  getStatus() {
    return api("/api/v1/payments/status").then(parseJson);
  },

  createCheckoutSession() {
    return api("/api/v1/payments/create-checkout-session", {
      method: "POST",
    }).then(parseJson);
  },

  createPortalSession() {
    return api("/api/v1/payments/create-portal-session", {
      method: "POST",
    }).then(parseJson);
  },

  getSessionStatus(sessionId) {
    return api(
      `/api/v1/payments/session-status?session_id=${encodeURIComponent(sessionId)}`
    ).then(parseJson);
  },
};
