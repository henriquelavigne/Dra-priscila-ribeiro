import axios, { AxiosRequestConfig } from "axios";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "unknown";
    const status = error.response?.status || "network error";
    logger.error({ url, status }, `[API] Erro na requisição: ${url} → ${status}`);
    return Promise.reject(error);
  }
);

export const apiClient = {
  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const { data } = await api.get(endpoint, { params });
    return data;
  },
  async post<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    const { data } = await api.post(endpoint, body);
    return data;
  },
  async put<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    const { data } = await api.put(endpoint, body);
    return data;
  },
  async patch<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    const { data } = await api.patch(endpoint, body);
    return data;
  },
};
