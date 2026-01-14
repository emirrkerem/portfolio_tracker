import requests
import threading
import time
import random
import sys

# Uygulamanın çalıştığı adres
BASE_URL = "http://localhost:5000"

# Test edilecek uç noktalar (Endpoints)
ENDPOINTS = [
    "/api/top25",
    "/api/portfolio",
    "/api/wallet",
    "/api/transactions",
    "/api/market?symbols=AAPL,MSFT,NVDA,TSLA,AMZN", # Dış API (Ağır işlem)
    "/api/stock?symbol=AAPL&period=1mo&interval=1d", # Dış API (Orta işlem)
    "/api/targets"
]

def send_request(i):
    """Tek bir istek gönderir ve süresini ölçer."""
    endpoint = random.choice(ENDPOINTS)
    url = f"{BASE_URL}{endpoint}"
    try:
        start = time.time()
        # Timeout 10 saniye (Cevap gelmezse hata ver)
        res = requests.get(url, timeout=10)
        duration = time.time() - start
        
        status_icon = "✅" if res.status_code == 200 else "❌"
        print(f"[{i}] {status_icon} Status: {res.status_code} | Süre: {duration:.2f}s | {endpoint}")
    except Exception as e:
        print(f"[{i}] ⚠️ HATA: {e}")

def run_stress_test(request_count=50, concurrency=5):
    """
    request_count: Toplam gönderilecek istek sayısı
    concurrency: Aynı anda kaç istek gönderileceği (Eşzamanlılık)
    """
    print(f"\n==========================================")
    print(f"🚀 STRES TESTİ BAŞLIYOR")
    print(f"==========================================")
    print(f"Hedef Adres   : {BASE_URL}")
    print(f"Toplam İstek  : {request_count}")
    print(f"Eşzamanlılık  : {concurrency}")
    print(f"------------------------------------------")

    threads = []
    for i in range(request_count):
        t = threading.Thread(target=send_request, args=(i+1,))
        threads.append(t)
        t.start()
        
        # Eşzamanlılık sınırını korumak için biraz bekle
        # (Örneğin 5 thread başlattıktan sonra biraz durakla)
        if (i + 1) % concurrency == 0:
            time.sleep(0.5)

    # Tüm işlemlerin bitmesini bekle
    for t in threads:
        t.join()
    
    print(f"------------------------------------------")
    print(f"🏁 Test Tamamlandı.")
    print(f"==========================================\n")

if __name__ == "__main__":
    # Önce uygulamanın açık olup olmadığını kontrol et
    try:
        print("Uygulama kontrol ediliyor...")
        requests.post(f"{BASE_URL}/api/heartbeat", timeout=2)
        print("Uygulama çalışıyor. Test başlıyor...")
        
        # Testi Başlat (50 istek gönder, aynı anda 5'erli gruplar halinde)
        run_stress_test(request_count=50, concurrency=5)
        
    except requests.exceptions.ConnectionError:
        print("\n[HATA] Uygulama çalışmıyor!")
        print("Lütfen önce BorsaApp uygulamasını çalıştırın, sonra bu testi başlatın.")
        print("İpucu: 'BorsaApp.exe'yi açın ve giriş ekranının gelmesini bekleyin.")
    except Exception as e:
        print(f"\n[HATA] Beklenmedik bir sorun oluştu: {e}")
    
    input("Çıkmak için Enter'a basın...")

