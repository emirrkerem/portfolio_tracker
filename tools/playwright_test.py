import time
import random
from playwright.sync_api import sync_playwright

def run_chaos_test():
    print("🎭 Playwright KAOS Testi Başlatılıyor...")
    print("NOT: Uygulamanın (BorsaApp.exe veya localhost:5000) açık olduğundan emin olun.")
    
    with sync_playwright() as p:
        # headless=False: Tarayıcıyı görerek test edelim
        # slow_mo=100: İşlemler arası çok kısa bekleme (insan gözüyle takip edilebilsin ama hızlı olsun)
        browser = p.chromium.launch(headless=False, slow_mo=100)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        base_url = "http://localhost:5000"
        
        try:
            print(f"1. Uygulamaya bağlanılıyor ({base_url})...")
            page.goto(base_url)
            page.wait_for_load_state("networkidle")
            print("✅ Ana sayfa yüklendi.")

            # --- SENARYO 1: Hızlı Menü Geçişleri (Sidebar Spam) ---
            print("\n--- SENARYO 1: Hızlı Menü Geçişleri (Sidebar Spam) ---")
            # Sidebar butonları: 0:Piyasalar, 1:İzleme, 2:Portföy, 3:İçgörüler, 4:Hedefler, 5:Ayarlar
            for i in range(15):
                idx = random.randint(0, 5)
                print(f"   [{i+1}/15] Sidebar butonuna tıklanıyor: {idx}")
                page.locator(".MuiDrawer-root button").nth(idx).click()
                # Sayfanın tam yüklenmesini beklemeden diğerine geç (Stres testi)
                time.sleep(random.uniform(0.1, 0.4))
            
            print("✅ Hızlı menü geçişleri tamamlandı.")

            # --- SENARYO 2: Hisse Detayına Girip Sürekli Yenileme ---
            print("\n--- SENARYO 2: Hisse Detay ve Yenileme Spam'i ---")
            target_symbol = "AAPL"
            
            print(f"   {target_symbol} aranıyor...")
            search_input = page.locator('input[aria-label="search"]')
            search_input.click()
            search_input.fill(target_symbol)
            # Sonucun gelmesini bekle
            page.wait_for_selector(f"text=Apple Inc.", timeout=5000)
            page.click(f"text=Apple Inc.")
            
            # Detay sayfasındayız, şimdi sayfayı 5 kez üst üste yenile
            print("   Sayfa 5 kez hızlıca yenileniyor (F5 Spam)...")
            for i in range(5):
                page.reload()
                print(f"   🔄 Reload {i+1}")
                # Rastgele bekleme süreleri (bazen hemen, bazen biraz bekleyip)
                time.sleep(random.uniform(0.2, 1.0))
            
            # Son yenilemeden sonra grafiğin yüklenmesini bekle
            try:
                page.wait_for_selector(".recharts-surface", timeout=10000)
                print("✅ Grafik başarıyla yüklendi.")
            except:
                print("⚠️ Grafik yüklenemedi (Zaman aşımı).")

            # --- SENARYO 3: Gir - Çık - Gir (Back/Forward Navigasyon) ---
            print("\n--- SENARYO 3: Gir - Çık - Gir (Back/Forward) ---")
            # Ana sayfaya dön
            page.goto(base_url)
            
            # Başka bir hisseye git
            search_input.click()
            search_input.fill("TSLA")
            page.wait_for_selector("text=Tesla", timeout=5000)
            page.click("text=Tesla")
            print("   TSLA sayfasına girildi.")
            
            print("   ⬅️ Geri gidiliyor (Back)...")
            page.go_back()
            time.sleep(0.5)
            
            print("   ➡️ İleri gidiliyor (Forward)...")
            page.go_forward()
            time.sleep(0.5)
            
            print("   🔄 Sayfa yenileniyor...")
            page.reload()
            
            print("   ⬅️ Tekrar Geri...")
            page.go_back()
            
            print("✅ Navigasyon testi tamamlandı.")

            # --- SENARYO 4: Kararsız Kullanıcı (Yarım Arama ve Sayfa Değiştirme) ---
            print("\n--- SENARYO 4: Kararsız Kullanıcı ---")
            search_input.click()
            search_input.fill("MSF") # Yarım yaz
            time.sleep(0.3)
            print("   Arama yarım bırakıldı, aniden Portföy sayfasına gidiliyor...")
            page.locator(".MuiDrawer-root button").nth(2).click() # Portföye tıkla
            
            # Hemen ardından Ayarlar'a tıkla
            time.sleep(0.2)
            print("   Vazgeçildi, Ayarlar sayfasına gidiliyor...")
            page.locator(".MuiDrawer-root button").nth(5).click() # Ayarlar
            
            # Tekrar aramaya dön ve başka bir hisseye git
            print("   Tekrar arama yapılıyor (NVDA)...")
            search_input.click()
            search_input.fill("NVDA")
            try:
                page.wait_for_selector("text=NVIDIA", timeout=5000)
                page.click("text=NVIDIA")
                print("   NVDA sayfasına girildi.")
            except:
                print("   Arama sonucu yakalanamadı.")

            # --- SENARYO 5: Sekme Değiştirme ve Geri Dönme ---
            print("\n--- SENARYO 5: Sekme Değiştirme Simülasyonu ---")
            # Yeni bir sekme açıp oraya gitme, sonra geri gelme simülasyonu
            page2 = context.new_page()
            page2.goto("http://google.com") # Dış bir siteye git (veya boş sayfa)
            print("   Yeni sekme açıldı (Kullanıcı başka işe daldı).")
            time.sleep(1)
            page2.close()
            print("   Sekme kapatıldı, uygulamaya geri dönüldü.")
            page.bring_to_front()
            page.reload()
            print("   Uygulama yenilendi.")

            print("\n🎉 KAOS TESTİ BAŞARIYLA TAMAMLANDI! (Uygulama çökmedi)")
            
        except Exception as e:
            print(f"\n❌ TEST HATASI (Uygulama çökmüş veya yanıt vermiyor olabilir): {e}")
            page.screenshot(path="kaos_hatasi.png")
        
        finally:
            browser.close()

if __name__ == "__main__":
    run_chaos_test()