/// <reference types="vite/client" />

// src/config.ts
// Geliştirme ortamında localhost, canlıda ise Vercel'den gelen ortam değişkenini kullanır.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
