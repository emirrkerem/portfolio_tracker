import { API_URL } from '../config';

export const getWalletBalance = async () => {
  try {
    const user = JSON.parse(sessionStorage.getItem('borsa_user') || '{}');
    const headers = { 'X-User-ID': String(user.id || '1') };
    const res = await fetch(`${API_URL}/api/wallet`, { headers });
    return await res.json();
  } catch (error) {
    console.error("Wallet fetch error:", error);
    return { balance: 0, transactions: [] };
  }
};

export const addWalletTransaction = async (type: 'DEPOSIT' | 'WITHDRAW', amount: number) => {
  try {
    const user = JSON.parse(sessionStorage.getItem('borsa_user') || '{}');
    const headers = { 'Content-Type': 'application/json', 'X-User-ID': String(user.id || '1') };

    await fetch(`${API_URL}/api/wallet`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ type, amount })
    });
    window.dispatchEvent(new Event('wallet-updated'));
  } catch (error) {
    console.error("Wallet transaction error:", error);
  }
};