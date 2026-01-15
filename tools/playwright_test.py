import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5000"

def run_manual_test():
    print("\n==================================================")
    print("🎭 Playwright MANUEL TEST MODU")
    print("==================================================")
    print("Tarayıcı Playwright tarafından açılacak.")
    print("Artık 'Kaos Testi'ni (hızlı tıklama, yenileme vb.) kendiniz yapabilirsiniz.")
    print("--------------------------------------------------")
    print("Çıkmak için bu terminal penceresinde ENTER tuşuna basın.")
    
    with sync_playwright() as p:
        # headless=False: Tarayıcıyı gör
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        try:
            print("1. Uygulamaya bağlanılıyor...")
            page.goto(BASE_URL)
            print("✅ Uygulama hazır. Kontrol sizde!")
            
            # Kullanıcı Enter'a basana kadar bekle
            input()
                
        except KeyboardInterrupt:
            print("\n🛑 Kapatılıyor...")
        except Exception as e:
            print(f"\n❌ HATA: {e}")
        finally:
            browser.close()
            print("Tarayıcı kapatıldı.")

if __name__ == "__main__":
    run_manual_test()