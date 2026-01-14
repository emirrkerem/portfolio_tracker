import time
from playwright.sync_api import sync_playwright

def run_test():
    print("🎭 Playwright UI Testi Başlatılıyor...")
    print("NOT: Uygulamanın (BorsaApp.exe veya localhost:5000) açık olduğundan emin olun.")
    
    with sync_playwright() as p:
        # Tarayıcıyı başlat (headless=False: Tarayıcıyı ekranda görürsünüz, slow_mo: işlemleri yavaşlatır)
        browser = p.chromium.launch(headless=False, slow_mo=1000)
        # Ekran boyutunu ayarla
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        try:
            # 1. Uygulamayı Aç
            print("1. Uygulamaya bağlanılıyor (http://localhost:5000)...")
            page.goto("http://localhost:5000")
            
            # Sayfanın tamamen yüklenmesini bekle
            page.wait_for_load_state("networkidle")
            
            # Başlık kontrolü (Piyasalar sayfası varsayılan açılıyor)
            # Sidebar'daki "Piyasalar" butonunun aktif olup olmadığına bakabiliriz veya sayfadaki bir elemente
            print("✅ Ana sayfa yüklendi.")
            
            # 2. Arama Testi (AAPL arat)
            print("2. Hisse arama testi yapılıyor (AAPL)...")
            
            # Arama kutusunu bul (aria-label="search" ile tanımlamıştık)
            search_input = page.locator('input[aria-label="search"]')
            search_input.click()
            search_input.fill("AAPL")
            
            # Sonuçların gelmesini bekle (Apple Inc. yazısını arar)
            page.wait_for_selector("text=Apple Inc.", timeout=5000)
            print("✅ Arama sonuçları geldi.")
            
            # İlk sonuca tıkla
            page.click("text=Apple Inc.")
            
            # 3. Detay Sayfası Kontrolü
            print("3. Hisse detay sayfasına gidildi.")
            # Fiyatın yüklenmesini bekle ($ işareti içeren bir metin)
            page.wait_for_selector("text=$", timeout=10000)
            
            # Grafik elementinin varlığını kontrol et (Recharts class'ı)
            if page.locator(".recharts-surface").count() > 0:
                print("✅ Grafik başarıyla çizildi.")
            else:
                print("⚠️ Grafik bulunamadı.")

            # 4. Sidebar Gezinme Testi (Portföy)
            print("4. Portföy sayfasına geçiliyor...")
            
            # Sidebar'daki 3. butona tıkla (Piyasalar[0], İzleme[1], Portföy[2])
            # Not: Sidebar yapısına göre index değişebilir, ikon sırasına göre 3. sırada.
            page.locator(".MuiDrawer-root button").nth(2).click()
            
            # Portföy başlığını bekle
            page.wait_for_selector("text=Portföyüm", timeout=5000)
            print("✅ Portföy sayfası açıldı.")
            
            # 5. Ekran Görüntüsü Al
            page.screenshot(path="test_basarili.png")
            print("📸 Ekran görüntüsü kaydedildi: test_basarili.png")
            
            print("\n🎉 TÜM TESTLER BAŞARIYLA TAMAMLANDI!")
            
        except Exception as e:
            print(f"\n❌ TEST HATASI: {e}")
            page.screenshot(path="test_hatasi.png")
        
        finally:
            browser.close()

if __name__ == "__main__":
    run_test()