import { addWalletTransaction } from './walletService';

export const tradeStock = async (symbol: string, quantity: number, price: number, type: 'BUY' | 'SELL', date: string, commission: number) => {
  if (!symbol || quantity <= 0 || price <= 0) return;

  const stockValue = quantity * price;
  // Cüzdan hareketi: BUY ise (Hisse Değeri + Komisyon) düşer, SELL ise (Hisse Değeri - Komisyon) eklenir.
  const walletAmount = type === 'BUY' 
    ? stockValue + commission 
    : Math.max(0, stockValue - commission);

  // Sadece işlem detayını sunucuya gönder
  // Sunucu bunu transactions.csv dosyasına ekleyecek
  try {
    // 1. İşlemi Kaydet (Hisse Ekle)
    await fetch('http://localhost:5000/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        quantity,
        price,
        type,
        date,
        commission
      })
    });
    
    // 2. Cüzdan Bakiyesini Güncelle (BUY -> WITHDRAW, SELL -> DEPOSIT)
    await addWalletTransaction(type === 'BUY' ? 'WITHDRAW' : 'DEPOSIT', walletAmount, date);

    // StockChart bileşenini güncellemek için event fırlat
    window.dispatchEvent(new Event('portfolio-updated'));
  } catch (error) {
    console.error("Portföy kaydedilemedi:", error);
  }
};

export const deleteTransaction = async (id: number) => {
  try {
    await fetch(`http://localhost:5000/api/transactions?id=${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error("Delete error:", error);
  }
};

export const updateTransaction = async (transaction: any) => {
  try {
    await fetch('http://localhost:5000/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
  } catch (error) {
    console.error("Update error:", error);
  }
};
