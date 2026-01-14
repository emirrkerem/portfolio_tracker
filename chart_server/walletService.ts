export const getWalletBalance = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/wallet');
    return await res.json();
  } catch (error) {
    console.error("Wallet fetch error:", error);
    return { balance: 0, transactions: [] };
  }
};

export const addWalletTransaction = async (type: 'DEPOSIT' | 'WITHDRAW', amount: number) => {
  try {
    await fetch('http://localhost:5000/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount })
    });
    window.dispatchEvent(new Event('wallet-updated'));
  } catch (error) {
    console.error("Wallet transaction error:", error);
  }
};

<!-- initial -->
