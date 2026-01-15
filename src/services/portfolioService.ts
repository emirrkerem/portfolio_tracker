import { API_URL } from '../config';

export const tradeStock = async (symbol: string, quantity: number, price: number, type: 'BUY' | 'SELL', date: string, commission: number) => {
  if (!symbol || quantity <= 0 || price <= 0) return;

  const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
  const headers = { 
      'Content-Type': 'application/json',
      'X-User-ID': String(user.id || '1') 
  };

  const stockValue = quantity * price;
  // Cüzdan hareketi: BUY ise (Hisse Değeri + Komisyon) düşer, SELL ise (Hisse Değeri - Komisyon) eklenir.
  const walletAmount = type === 'BUY' 
    ? stockValue + commission 
    : Math.max(0, stockValue - commission);

  // Sadece işlem detayını sunucuya gönder
  // Sunucu bunu transactions.csv dosyasına ekleyecek
  try {
    // 1. İşlemi Kaydet (Hisse Ekle)
    await fetch(`${API_URL}/api/portfolio`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        symbol,
        quantity,
        price,
        type,
        date,
        commission
      })
    });
    
    // 2. Cüzdan Bakiyesini Güncelle (Özel Tiplerle)
    await fetch(`${API_URL}/api/wallet`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        type: type === 'BUY' ? 'STOCK_BUY' : 'STOCK_SELL',
        amount: walletAmount,
        date
      })
    });

    // StockChart bileşenini güncellemek için event fırlat
    window.dispatchEvent(new Event('portfolio-updated'));
  } catch (error) {
    console.error("Portföy kaydedilemedi:", error);
  }
};

export const deleteTransaction = async (id: number) => {
  const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
  const headers = { 'X-User-ID': String(user.id || '1') };
  try {
    await fetch(`${API_URL}/api/transactions?id=${id}`, {
      method: 'DELETE',
      headers: headers
    });
  } catch (error) {
    console.error("Delete error:", error);
  }
};

export const updateTransaction = async (transaction: any) => {
  const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
  const headers = { 'Content-Type': 'application/json', 'X-User-ID': String(user.id || '1') };
  try {
    await fetch(`${API_URL}/api/transactions`, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(transaction)
    });
  } catch (error) {
    console.error("Update error:", error);
  }
};
