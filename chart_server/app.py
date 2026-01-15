import sys
import os
import traceback
import datetime

# --- KRITIK HATA YAKALAYICI (EN USTTE OLMALI) ---
# Uygulama acilirken (import asamasinda bile) cokerse rapor olusturur.
def global_exception_handler(exc_type, exc_value, exc_traceback):
    try:
        # Masaustu yolunu bul (Windows/Mac/Linux uyumlu)
        desktop = os.path.join(os.path.expanduser("~"), 'Desktop')
        error_path = os.path.join(desktop, 'BORSA_HATA_RAPORU.txt')
        
        with open(error_path, 'w', encoding='utf-8') as f:
            f.write(f"ZAMAN: {datetime.datetime.now()}\n")
            f.write("--------------------------------------------------\n")
            f.write(f"HATA: {exc_value}\n")
            f.write("--------------------------------------------------\n")
            traceback.print_exception(exc_type, exc_value, exc_traceback, file=f)
    except:
        pass

sys.excepthook = global_exception_handler

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import yfinance as yf
import pandas as pd
import json
import webbrowser
import threading
import time
from threading import Timer
import logging
from logging.handlers import RotatingFileHandler

# --- AYARLAR VE YOL TANIMLAMALARI ---
if getattr(sys, 'frozen', False):
    # Uygulama .exe olarak çalışıyorsa (PyInstaller ile paketlenmiş)
    # React dosyaları geçici klasörde (sys._MEIPASS) bulunur
    static_folder = os.path.join(sys._MEIPASS, 'dist')
    
    # BASE_DIR tanimlamasi (Asagida kullanildigi icin gerekli)
    BASE_DIR = os.path.dirname(sys.executable)

    # Veritabanı (storage) kullanıcı klasöründe oluşsun (Program Files yazma izni sorunu için)
    # %APPDATA%/BorsaApp/storage
    app_data_dir = os.path.join(os.getenv('APPDATA'), 'BorsaApp')
    STORAGE_DIR = os.path.join(app_data_dir, 'storage')
else:
    # Normal geliştirme modu (python app.py)
    static_folder = '../dist'
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STORAGE_DIR = os.path.join(BASE_DIR, '..', 'storage')

# Flask Uygulaması
app = Flask(__name__, static_folder=static_folder, static_url_path='')
CORS(app)

# --- LOGLAMA (HATA KAYIT) AYARLARI ---
# Storage klasörünün varlığından emin ol
os.makedirs(STORAGE_DIR, exist_ok=True)

# Log dosyası yolu: storage/app_errors.log
log_file_path = os.path.join(STORAGE_DIR, 'app_errors.log')

# Logger yapılandırması: Hem dosyaya hem konsola yazar. Dosya 1MB olunca yedekler.
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        RotatingFileHandler(log_file_path, maxBytes=1_000_000, backupCount=5, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

# Flask ve Werkzeug loglarını da yakala
logging.getLogger('werkzeug').setLevel(logging.INFO)
app.logger.setLevel(logging.INFO)

# --- ÖNBELLEKLEME (CACHING) ---
# API yanıtlarını hafızada tutarak tekrar tekrar indirmeyi önler.
API_CACHE = {}
CACHE_DURATION = 300  # 5 Dakika (Saniye cinsinden)

def get_from_cache(key):
    if key in API_CACHE:
        data, timestamp = API_CACHE[key]
        if (datetime.datetime.now() - timestamp).total_seconds() < CACHE_DURATION:
            return data
        else:
            del API_CACHE[key] # Süresi dolmuşsa sil
    return None

def save_to_cache(key, data):
    API_CACHE[key] = (data, datetime.datetime.now())

def clear_user_cache():
    """Kullanıcı verisi değiştiğinde (işlem ekleme vb.) ilgili cache'leri temizler."""
    keys_to_delete = [k for k in API_CACHE.keys() if k.startswith('user_')]
    for k in keys_to_delete:
        if k in API_CACHE:
            del API_CACHE[k]
    print(f"[CACHE] Kullanıcı önbelleği temizlendi. ({len(keys_to_delete)} anahtar silindi)")

# --- HEARTBEAT (OTOMATIK KAPATMA) ---
# Frontend kapandiginda backend'in de kapanmasi icin
last_heartbeat = time.time() + 30  # Baslangicta 30 saniye mühlet (Yavas PC'ler icin artirildi)

@app.route('/api/heartbeat', methods=['POST'])
def heartbeat():
    global last_heartbeat
    last_heartbeat = time.time()
    return jsonify({"status": "alive"})

def monitor_heartbeat():
    global last_heartbeat
    while True:
        time.sleep(1)
        # Eger son sinyalden 5 saniye gectiyse ve program exe modundaysa kapat
        if time.time() - last_heartbeat > 5:
            os._exit(0)

# --- LOGO YÖNETİMİ ---
# Logoları kalıcı depolama alanına (storage/logos) kaydedeceğiz.
LOGOS_DIR = os.path.join(STORAGE_DIR, 'logos')
os.makedirs(LOGOS_DIR, exist_ok=True)

# Geliştirme ortamı için public klasörü kontrolü
PUBLIC_LOGOS_DIR = os.path.join(BASE_DIR, '..', 'public', 'logos')
HAS_PUBLIC = os.path.exists(os.path.join(BASE_DIR, '..', 'public'))
if HAS_PUBLIC:
    os.makedirs(PUBLIC_LOGOS_DIR, exist_ok=True)

# Logoları sunmak için route (Exe modunda veya Flask serve modunda çalışır)
@app.route('/logos/<path:filename>')
def serve_logo(filename):
    # 1. Once indirilenler klasorune bak (storage/logos)
    if os.path.exists(os.path.join(LOGOS_DIR, filename)):
        return send_from_directory(LOGOS_DIR, filename)
    
    # 2. Yoksa uygulamanin icindeki statik klasore bak (dist/logos)
    return send_from_directory(os.path.join(app.static_folder, 'logos'), filename)

@app.route('/api/logo/fetch', methods=['POST'])
def fetch_logo():
    try:
        data = request.json
        symbol = data.get('symbol')
        if not symbol:
            return jsonify({'error': 'Symbol required'}), 400
        
        symbol = symbol.upper()
        filename = f"{symbol}.png"
        save_path = os.path.join(LOGOS_DIR, filename)
        
        # 1. Kontrol: Logo zaten var mı ve boyutu 0'dan büyük mü? (Bozuk dosyaları tekrar indirsin)
        if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
            print(f"[LOGO] {symbol} zaten mevcut: {save_path}")
            # Dev ortamı için senkronize et
            if HAS_PUBLIC and not os.path.exists(os.path.join(PUBLIC_LOGOS_DIR, filename)):
                import shutil
                shutil.copy2(save_path, os.path.join(PUBLIC_LOGOS_DIR, filename))
            return jsonify({'status': 'exists', 'url': f'/logos/{filename}'})

        print(f"[LOGO] {symbol} için aranıyor...")
        logo_url = None

        # 2. Finnhub API (Öncelikli)
        try:
            finnhub_token = "d5ijfv1r01qo1lb2f000d5ijfv1r01qo1lb2f00g"
            r = requests.get(f"https://finnhub.io/api/v1/stock/profile2?symbol={symbol}&token={finnhub_token}", timeout=5)
            if r.status_code == 200:
                profile = r.json()
                logo_url = profile.get('logo')
                if logo_url: print(f"[LOGO] Finnhub'da bulundu: {logo_url}")
        except Exception as e:
            print(f"[LOGO] Finnhub hatası: {e}")

        # 3. Yahoo Finance / Clearbit (Yedek)
        if not logo_url:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                logo_url = info.get('logo_url')
                
                if not logo_url:
                    # Fallback: Clearbit API
                    website = info.get('website')
                    if website:
                        from urllib.parse import urlparse
                        domain = urlparse(website).netloc.replace('www.', '')
                        logo_url = f"https://logo.clearbit.com/{domain}"
                        print(f"[LOGO] Clearbit denenecek: {logo_url}")
            except Exception as e:
                print(f"[LOGO] YFinance hatası: {e}")

        # 4. İndirme ve Kaydetme
        if logo_url:
            try:
                headers = {'User-Agent': 'Mozilla/5.0'}
                r = requests.get(logo_url, headers=headers, stream=True, timeout=10)
                if r.status_code == 200:
                    with open(save_path, 'wb') as f:
                        for chunk in r.iter_content(1024):
                            f.write(chunk)
                    print(f"[LOGO] Kaydedildi: {save_path}")

                    # Dev ortamı için public'e de kopyala
                    if HAS_PUBLIC:
                        import shutil
                        shutil.copy2(save_path, os.path.join(PUBLIC_LOGOS_DIR, filename))
                    
                    return jsonify({'status': 'downloaded', 'url': f'/logos/{filename}'})
            except Exception as e:
                print(f"[LOGO] İndirme hatası: {e}")
        
        print(f"[LOGO] {symbol} için logo bulunamadı.")
        return jsonify({'status': 'not_found'}), 404
    except Exception as e:
        print(f"[LOGO] Genel hata: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock', methods=['GET'])
def get_stock_data():
    symbol = request.args.get('symbol', 'AAPL')
    period = request.args.get('period', '1y')
    interval = request.args.get('interval', '1d')
    start = request.args.get('start', None)
    end = request.args.get('end', None)

    # 1. Cache Kontrolü (Veri hafızada var mı?)
    cache_key = f"stock_{symbol}_{period}_{interval}_{start}_{end}"
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return jsonify(cached_data)

    # 1. Önce Yahoo Finance dene
    try:
        # Veriyi çek
        if start:
            df = yf.download(tickers=symbol, start=start, end=end, interval=interval, progress=False)
        else:
            df = yf.download(tickers=symbol, period=period, interval=interval, progress=False)

        if not df.empty:
            # MultiIndex düzeltmesi
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            # Timezone Ayarı
            if df.index.tzinfo is None:
                df.index = df.index.tz_localize('UTC')
            df.index = df.index.tz_convert('Europe/Istanbul')

            # JSON formatına çevir
            data = []
            # Saatlik veri içerip içermediğini kontrol et (Kısa vadeli grafikler için)
            is_intraday = interval in ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h']

            for date, row in df.iterrows():
                # NaN kontrolü
                if pd.isna(row['Close']):
                    continue
                
                date_str = date.strftime('%Y-%m-%d %H:%M') if is_intraday else date.strftime('%Y-%m-%d')
                data.append({
                    'date': date_str,
                    'price': float(row['Close'])
                })
            
            if data:
                save_to_cache(cache_key, data) # Veriyi hafızaya kaydet
                return jsonify(data)

    except Exception as e:
        print(f"YFinance Hata ({symbol}): {e}")
        # Hata olsa bile aşağıda TEFAS dene

    return jsonify([]), 200

# Piyasalar Sayfası için Çoklu Hisse Verisi
@app.route('/api/market', methods=['GET'])
def get_market_data():
    symbols_arg = request.args.get('symbols')
    if symbols_arg:
        symbols = symbols_arg.split(',')
    else:
        # Varsayılan popüler hisseler (Eğer parametre gelmezse)
        symbols = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AMD', 'NFLX', 'INTC']

    # Cache Kontrolü
    cache_key = f"market_{','.join(sorted(symbols))}"
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return jsonify(cached_data)

    try:
        data = []

        # 1. Market Cap Verilerini Çek (Quote API - Hızlı)
        market_caps = {}
        quote_types = {}
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
            quote_url = f"https://query2.finance.yahoo.com/v7/finance/quote?symbols={','.join(symbols)}"
            r = requests.get(quote_url, headers=headers)
            if r.status_code == 200:
                q_data = r.json()
                if 'quoteResponse' in q_data and 'result' in q_data['quoteResponse']:
                    for item in q_data['quoteResponse']['result']:
                        market_caps[item['symbol']] = item.get('marketCap')
                        quote_types[item['symbol']] = item.get('quoteType')
        except Exception as e:
            print(f"Quote API Error: {e}")

        # Helper fonksiyon: DataFrame içinden son kapanışı bul
        def extract_data(t_df, sym):
            # Öncelik Close, yoksa Adj Close kullan
            col_name = 'Close'
            if 'Close' not in t_df.columns:
                if 'Adj Close' in t_df.columns:
                    col_name = 'Adj Close'
                else:
                    return None
            
            # NaN değerleri temizle (Gelecek tarihli boş satırlar olabilir)
            closes = t_df[col_name].dropna()
            
            if closes.empty:
                return None
            
            current = closes.iloc[-1]
            prev = closes.iloc[-2] if len(closes) > 1 else current

            # YTD Hesaplama (Yılbaşından bugüne) - Frontend ile aynı mantık
            ytd_val = "N/A"
            try:
                current_year = datetime.datetime.now().year
                # Bu yılın verilerini filtrele
                current_year_mask = t_df.index.year == current_year
                current_year_closes = t_df.loc[current_year_mask, col_name].dropna()

                if not current_year_closes.empty:
                    # Bu yılın ilk işlem günündeki fiyat
                    start_price = current_year_closes.iloc[0]
                    # Son fiyat zaten 'current' değişkeninde var
                    if start_price != 0:
                        ytd_pct = ((current - start_price) / start_price) * 100
                        ytd_val = f"%{ytd_pct:.2f}"
            except Exception as e:
                print(f"YTD Calc Error {sym}: {e}")

            # Market Cap Formatlama
            cap_val = "N/A"
            raw_cap = market_caps.get(sym)
            q_type = quote_types.get(sym)
            
            # Fallback: Eğer toplu çekim başarısız olduysa yfinance ile tekil dene (Çift katmanlı)
            if raw_cap is None or q_type is None:
                try:
                    ticker = yf.Ticker(sym)
                    # 1. Deneme: fast_info (Hızlı)
                    if raw_cap is None:
                        try: raw_cap = ticker.fast_info.market_cap
                        except: pass
                    
                    if q_type is None:
                        try: q_type = ticker.fast_info.quote_type
                        except: pass

                    # 2. Deneme: info (Yavaş ama detaylı)
                    if raw_cap is None or q_type is None:
                        info = ticker.info
                        if raw_cap is None:
                            raw_cap = info.get('marketCap')
                        if q_type is None:
                            q_type = info.get('quoteType')
                except Exception as e:
                    print(f"Metadata fetch error for {sym}: {e}")

            if raw_cap:
                try:
                    raw_cap = float(raw_cap)
                    if raw_cap >= 1e12: cap_val = f"${raw_cap/1e12:.2f} T"
                    elif raw_cap >= 1e9: cap_val = f"${raw_cap/1e9:.2f} B"
                    elif raw_cap >= 1e6: cap_val = f"${raw_cap/1e6:.2f} M"
                    else: cap_val = f"${raw_cap:.2f}"
                except:
                    pass
            
            if q_type is None:
                q_type = 'EQUITY'

            return {
                'symbol': sym,
                'price': float(current),
                'change': float(current - prev),
                'pctChange': float((current - prev) / prev * 100) if prev != 0 else 0,
                'cap': cap_val,
                'ytd': ytd_val,
                'quoteType': q_type
            }

        # Tek hisse isteği mi çoklu mu?
        if len(symbols) == 1:
            # Tek hisse için basit indirme (Daha güvenilir)
            symbol = symbols[0]
            # YTD için 1 yıllık veri çekiyoruz
            df = yf.download(tickers=symbol, period="1y", interval="1d", progress=False)
            if not df.empty:
                # MultiIndex düzeltmesi (Tek hisse için kritik)
                if isinstance(df.columns, pd.MultiIndex):
                    try:
                        df.columns = df.columns.get_level_values(0)
                    except:
                        pass

                res = extract_data(df, symbol)
                if res:
                    data.append(res)
        else:
            # Çoklu hisse için toplu indirme
            # YTD için 1 yıllık veri çekiyoruz
            df = yf.download(tickers=symbols, period="1y", interval="1d", group_by='ticker', progress=False, threads=False)
            
            if not df.empty:
                # MultiIndex kontrolü
                if isinstance(df.columns, pd.MultiIndex):
                    for symbol in symbols:
                        try:
                            if symbol in df.columns.levels[0]:
                                ticker_df = df[symbol]
                                res = extract_data(ticker_df, symbol)
                                if res:
                                    data.append(res)
                        except Exception as e:
                            print(f"Error processing {symbol}: {e}")
                            continue
                else:
                    # Nadiren tekil dönebilir
                    if len(symbols) == 1:
                        res = extract_data(df, symbols[0])
                        if res:
                            data.append(res)
                    
        save_to_cache(cache_key, data) # Veriyi hafızaya kaydet
        return jsonify(data)

    except Exception as e:
        print(f"Market Data Error: {e}")
        return jsonify({'error': str(e)}), 500

# En Değerli 25 Amerikan Şirketi (Top 25 Market Cap)
@app.route('/api/top25', methods=['GET'])
def get_top25_list():
    # Bu liste piyasa değerine göre (Market Cap) yaklaşık sıralıdır.
    top25 = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corporation"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation"},
        {"symbol": "GOOGL", "name": "Alphabet Inc."},
        {"symbol": "AMZN", "name": "Amazon.com Inc."},
        {"symbol": "META", "name": "Meta Platforms Inc."},
        {"symbol": "LLY", "name": "Eli Lilly and Company"},
        {"symbol": "TSLA", "name": "Tesla Inc."},
        {"symbol": "AVGO", "name": "Broadcom Inc."},
        {"symbol": "WMT", "name": "Walmart Inc."},
        {"symbol": "V", "name": "Visa Inc."},
        {"symbol": "ABBV", "name": "AbbVie Inc."},
        {"symbol": "NFLX", "name": "Netflix Inc."},
        {"symbol": "ORCL", "name": "Oracle Corporation"},
        {"symbol": "AMD", "name": "Advanced Micro Devices, Inc."},
        {"symbol": "PLTR", "name": "Palantir Technologies Inc."},
        {"symbol": "HOOD", "name": "Robinhood Markets, Inc."},
        {"symbol": "HIMS", "name": "Hims & Hers Health, Inc."},
        {"symbol": "SNOW", "name": "Snowflake Inc."},
        {"symbol": "TSM", "name": "Taiwan Semiconductor Manufacturing"},
        {"symbol": "PANW", "name": "Palo Alto Networks, Inc."},
        {"symbol": "ADBE", "name": "Adobe Inc."},
        {"symbol": "CRM", "name": "Salesforce, Inc."},
        {"symbol": "SBUX", "name": "Starbucks Corporation"},
        {"symbol": "MRVL", "name": "Marvell Technology, Inc."},
        {"symbol": "MU", "name": "Micron Technology, Inc."},
        {"symbol": "KO", "name": "The Coca-Cola Company"},
        {"symbol": "IBM", "name": "International Business Machines"},
        {"symbol": "MCD", "name": "McDonald's Corporation"},
        {"symbol": "INTC", "name": "Intel Corporation"},
        {"symbol": "PEP", "name": "PepsiCo, Inc."},
        {"symbol": "QCOM", "name": "Qualcomm Incorporated"},
        {"symbol": "UBER", "name": "Uber Technologies, Inc."},
        {"symbol": "NOW", "name": "ServiceNow, Inc."},
        {"symbol": "CRWD", "name": "CrowdStrike Holdings, Inc."},
        {"symbol": "NKE", "name": "NIKE, Inc."},
        {"symbol": "UPS", "name": "United Parcel Service, Inc."},
        {"symbol": "COIN", "name": "Coinbase Global, Inc."},
        {"symbol": "MSTR", "name": "MicroStrategy Incorporated"},
        {"symbol": "RKLB", "name": "Rocket Lab USA, Inc."},
        {"symbol": "SOFI", "name": "SoFi Technologies, Inc."},
        {"symbol": "SCHW", "name": "The Charles Schwab Corporation"},
        {"symbol": "AGM", "name": "Federal Agricultural Mortgage Corporation"},
        {"symbol": "MS", "name": "Morgan Stanley"},
        {"symbol": "XOM", "name": "Exxon Mobil Corporation"}
    ]
    return jsonify(top25)

# Portföy Yönetimi (Transaction Bazlı - CSV)
TRANSACTIONS_FILE = os.path.join(STORAGE_DIR, 'transactions.csv')
WALLET_FILE = os.path.join(STORAGE_DIR, 'wallet.csv')
TARGETS_FILE = os.path.join(STORAGE_DIR, 'targets.json')

@app.route('/api/portfolio', methods=['GET', 'POST'])
def handle_portfolio():
    # GET: İşlemleri oku ve portföy özetini hesapla
    if request.method == 'GET':
        # Cache Kontrolü
        cached = get_from_cache('user_portfolio_summary')
        if cached: return jsonify(cached)

        if os.path.exists(TRANSACTIONS_FILE):
            try:
                df = pd.read_csv(TRANSACTIONS_FILE)
                if df.empty:
                    return jsonify([])
                
                # Header kontrolü: 'symbol' sütunu yoksa ve 7 sütun varsa (Headerless okuma)
                if 'symbol' not in df.columns and len(df.columns) == 7:
                    df = pd.read_csv(TRANSACTIONS_FILE, header=None, names=['symbol', 'quantity', 'price', 'totalCost', 'totalCommission', 'date', 'type'])

                # İşlem tipine göre miktar hesapla (BUY: +, SELL: -)
                df['signed_quantity'] = df.apply(lambda x: x['quantity'] if x['type'] == 'BUY' else -x['quantity'], axis=1)

                # İşlemleri hisse bazında grupla ve özetle
                # quantity ve totalCost'u topla
                portfolio = df.groupby('symbol').agg({
                    'signed_quantity': 'sum',
                    'totalCost': 'sum',
                    'totalCommission': 'sum'
                }).reset_index()
                
                # signed_quantity ismini quantity olarak düzelt
                portfolio.rename(columns={'signed_quantity': 'quantity'}, inplace=True)
                
                # Ortalama maliyeti hesapla (totalCost / quantity)
                portfolio['averageCost'] = portfolio.apply(
                    lambda x: x['totalCost'] / x['quantity'] if x['quantity'] > 0 else 0, axis=1
                )
                
                # Sadece elinde hisse kalanları (quantity > 0) döndür
                portfolio = portfolio[portfolio['quantity'] > 0]
                
                result = portfolio.to_dict(orient='records')
                save_to_cache('user_portfolio_summary', result)
                return jsonify(result)
            except Exception as e:
                print(f"CSV Okuma Hatası: {e}")
                return jsonify([])
        return jsonify([])
    
    # POST: Yeni işlem ekle (Append)
    if request.method == 'POST':
        try:
            data = request.json
            qty = float(data.get('quantity', 0))
            price = float(data.get('price', 0))
            # Tek bir işlem satırı oluştur
            new_transaction = {
                'symbol': data.get('symbol'),
                'quantity': qty,
                'price': price,
                'totalCost': qty * price,
                'totalCommission': float(data.get('commission', (qty * price) * 0.001)), # Kullanıcıdan gelen veya varsayılan
                'date': data.get('date', datetime.datetime.now().isoformat()), # Kullanıcıdan gelen veya şu an
                'type': data.get('type', 'BUY')
            }
            
            df = pd.DataFrame([new_transaction])
            
            # Dosya yoksa başlıkları yaz, varsa sadece veriyi ekle (mode='a')
            header = not os.path.exists(TRANSACTIONS_FILE)
            
            # Dosya varsa ve son karakter yeni satır değilse ekle (Bozulmayı önlemek için)
            if os.path.exists(TRANSACTIONS_FILE) and os.path.getsize(TRANSACTIONS_FILE) > 0:
                with open(TRANSACTIONS_FILE, 'rb+') as f:
                    f.seek(-1, 2)
                    if f.read(1) != b'\n':
                        f.write(b'\n')

            df.to_csv(TRANSACTIONS_FILE, mode='a', header=header, index=False)
            
            clear_user_cache() # Veri değişti, cache'i temizle
            return jsonify({"status": "success", "data": data})
        except Exception as e:
            app.logger.error(f"CSV Kayıt Hatası: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

# İşlem Geçmişi (Ham Veri)
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    # Cache Kontrolü
    cached = get_from_cache('user_transactions')
    if cached: return jsonify(cached)

    if os.path.exists(TRANSACTIONS_FILE):
        try:
            df = pd.read_csv(TRANSACTIONS_FILE)
            
            # Header kontrolü
            if not df.empty and 'symbol' not in df.columns and len(df.columns) == 7:
                df = pd.read_csv(TRANSACTIONS_FILE, header=None, names=['symbol', 'quantity', 'price', 'totalCost', 'totalCommission', 'date', 'type'])
            
            # Satır numarasını ID olarak ekle (Silme işlemi için)
            df['id'] = df.index

            if df.empty:
                return jsonify([])

            # Tarihe göre sırala (En yeni en üstte)
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df = df.sort_values(by='date', ascending=False)
                # Tarihi ISO formatında string'e çevir (Frontend'de düzenlemek için gerekli)
                df['date'] = df['date'].dt.strftime('%Y-%m-%dT%H:%M')
            
            result = df.to_dict(orient='records')
            save_to_cache('user_transactions', result)
            return jsonify(result)
        except Exception as e:
            print(f"Transaction Read Error: {e}")
            return jsonify([])
    return jsonify([])

# İşlem Silme
@app.route('/api/transactions', methods=['DELETE'])
def delete_transaction():
    try:
        tx_id = int(request.args.get('id'))
        if os.path.exists(TRANSACTIONS_FILE):
            df = pd.read_csv(TRANSACTIONS_FILE)
            
            # Header kontrolü (Okuma mantığı get_transactions ile aynı olmalı)
            if not df.empty and 'symbol' not in df.columns and len(df.columns) == 7:
                df = pd.read_csv(TRANSACTIONS_FILE, header=None, names=['symbol', 'quantity', 'price', 'totalCost', 'totalCommission', 'date', 'type'])
            
            if tx_id in df.index:
                # Silinmeden önce yedeğini al (Wallet sync için)
                deleted_tx = df.loc[tx_id].to_dict()

                df = df.drop(tx_id)
                # Kaydederken header durumunu koru
                has_header = 'symbol' in df.columns
                df.to_csv(TRANSACTIONS_FILE, index=False, header=has_header)
                
                # --- CÜZDAN SENKRONİZASYONU (Wallet Sync) ---
                # Transaction silindiğinde, ilgili cüzdan kaydını da bul ve sil
                if os.path.exists(WALLET_FILE):
                    try:
                        df_wallet = pd.read_csv(WALLET_FILE)
                        if 'amount' not in df_wallet.columns:
                            df_wallet = pd.read_csv(WALLET_FILE, header=None, names=['date', 'type', 'amount'])
                        
                        # Silinen işlemden beklenen cüzdan etkisini hesapla
                        cost = float(deleted_tx['totalCost'])
                        comm = float(deleted_tx['totalCommission'])
                        target_amount = 0
                        target_types = []

                        if deleted_tx['type'] == 'BUY':
                            target_amount = cost + comm
                            target_types = ['STOCK_BUY', 'WITHDRAW'] # Yeni ve eski tip desteği
                        else:
                            target_amount = max(0, cost - comm)
                            target_types = ['STOCK_SELL', 'DEPOSIT'] # Yeni ve eski tip desteği
                        
                        # Eşleşen kaydı bul: Tarih, Tip ve Tutar aynı olmalı
                        # Not: Tarih string olduğu için tam eşleşme arıyoruz.
                        # Float karşılaştırması için küçük bir tolerans (0.01) kullanıyoruz.
                        tolerance = 0.01
                        
                        matches = df_wallet[
                            (df_wallet['date'] == deleted_tx['date']) & 
                            (df_wallet['type'].isin(target_types)) &
                            (abs(df_wallet['amount'] - target_amount) < tolerance)
                        ]
                        
                        if not matches.empty:
                            # İlk eşleşeni sil
                            wallet_idx_to_drop = matches.index[0]
                            df_wallet = df_wallet.drop(wallet_idx_to_drop)
                            df_wallet.to_csv(WALLET_FILE, index=False)
                            print(f"Transaction {tx_id} silindiği için Wallet kaydı {wallet_idx_to_drop} da silindi.")
                            
                    except Exception as w_e:
                        print(f"Wallet sync error during delete: {w_e}")

                clear_user_cache() # Veri değişti
                return jsonify({"status": "success"})
            else:
                return jsonify({"error": "Transaction not found"}), 404
    except Exception as e:
        app.logger.error(f"Transaction Delete Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# İşlem Güncelleme
@app.route('/api/transactions', methods=['PUT'])
def update_transaction():
    try:
        data = request.json
        tx_id = int(data.get('id'))
        if os.path.exists(TRANSACTIONS_FILE):
            df = pd.read_csv(TRANSACTIONS_FILE)
            
            # Header check
            if not df.empty and 'symbol' not in df.columns and len(df.columns) == 7:
                df = pd.read_csv(TRANSACTIONS_FILE, header=None, names=['symbol', 'quantity', 'price', 'totalCost', 'totalCommission', 'date', 'type'])
            
            if tx_id in df.index:
                # Alanları güncelle
                qty = float(data.get('quantity', df.at[tx_id, 'quantity']))
                price = float(data.get('price', df.at[tx_id, 'price']))
                
                df.at[tx_id, 'quantity'] = qty
                df.at[tx_id, 'price'] = price
                df.at[tx_id, 'totalCost'] = qty * price
                df.at[tx_id, 'totalCommission'] = float(data.get('commission', df.at[tx_id, 'totalCommission']))
                df.at[tx_id, 'date'] = data.get('date', df.at[tx_id, 'date'])
                
                has_header = 'symbol' in df.columns
                df.to_csv(TRANSACTIONS_FILE, index=False, header=has_header)
                clear_user_cache() # Veri değişti
                return jsonify({"status": "success"})
            else:
                return jsonify({"error": "Transaction not found"}), 404
    except Exception as e:
        app.logger.error(f"Transaction Update Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Cüzdan Yönetimi (Nakit Giriş/Çıkış)
@app.route('/api/wallet', methods=['GET', 'POST', 'DELETE', 'PUT'])
def handle_wallet():
    # GET: Bakiyeyi Hesapla
    if request.method == 'GET':
        # Cache Kontrolü
        cached = get_from_cache('user_wallet')
        if cached: return jsonify(cached)

        if os.path.exists(WALLET_FILE):
            try:
                if os.path.getsize(WALLET_FILE) == 0:
                    return jsonify({'balance': 0.0, 'transactions': []})

                df = pd.read_csv(WALLET_FILE)
                # Eğer başlıklar yoksa (manuel oluşturulduysa), sütun isimlerini elle ata
                if 'amount' not in df.columns:
                    df = pd.read_csv(WALLET_FILE, header=None, names=['date', 'type', 'amount'])

                if df.empty:
                    return jsonify({'balance': 0.0, 'transactions': []})
                
                # ID ekle (Silme işlemi için)
                df['id'] = df.index
                
                # Bakiye Hesaplama (DEPOSIT - WITHDRAW)
                balance = 0.0
                transactions = df.to_dict(orient='records')
                
                for t in transactions:
                    amt = float(t.get('amount', 0))
                    if t.get('type') in ['DEPOSIT', 'STOCK_SELL']:
                        balance += amt
                    elif t.get('type') in ['WITHDRAW', 'STOCK_BUY']:
                        balance -= amt
                
                # Tarihe göre tersten sırala (En yeni en üstte)
                if 'date' in df.columns:
                    transactions.sort(key=lambda x: x['date'], reverse=True)
                        
                result = {'balance': balance, 'transactions': transactions}
                save_to_cache('user_wallet', result)
                return jsonify(result)
            except Exception as e:
                print(f"Wallet Read Error: {e}")
                return jsonify({'balance': 0.0, 'transactions': []})
        return jsonify({'balance': 0.0, 'transactions': []})

    # POST: Yeni İşlem Ekle
    if request.method == 'POST':
        try:
            data = request.json
            new_tx = {
                'date': data.get('date', datetime.datetime.now().isoformat()),
                'type': data.get('type', 'DEPOSIT'), # DEPOSIT veya WITHDRAW
                'amount': float(data.get('amount', 0))
            }
            df = pd.DataFrame([new_tx])
            
            # Dosya yoksa VEYA dosya var ama içi boşsa başlık ekle
            header = not os.path.exists(WALLET_FILE) or os.path.getsize(WALLET_FILE) == 0
            
            # Dosya varsa ve son karakter yeni satır değilse ekle
            if os.path.exists(WALLET_FILE) and os.path.getsize(WALLET_FILE) > 0:
                with open(WALLET_FILE, 'rb+') as f:
                    f.seek(-1, 2)
                    if f.read(1) != b'\n':
                        f.write(b'\n')

            df.to_csv(WALLET_FILE, mode='a', header=header, index=False)
            clear_user_cache() # Veri değişti
            return jsonify({"status": "success", "data": new_tx})
        except Exception as e:
            app.logger.error(f"Wallet Post Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

    # PUT: İşlem Güncelle
    if request.method == 'PUT':
        try:
            data = request.json
            tx_id = int(data.get('id'))
            if os.path.exists(WALLET_FILE):
                df = pd.read_csv(WALLET_FILE)
                # Header check
                if 'amount' not in df.columns:
                    df = pd.read_csv(WALLET_FILE, header=None, names=['date', 'type', 'amount'])
                
                if tx_id in df.index:
                    df.at[tx_id, 'amount'] = float(data.get('amount', df.at[tx_id, 'amount']))
                    df.at[tx_id, 'type'] = data.get('type', df.at[tx_id, 'type'])
                    df.at[tx_id, 'date'] = data.get('date', df.at[tx_id, 'date'])
                    
                    df.to_csv(WALLET_FILE, index=False)
                    clear_user_cache()
                    return jsonify({"status": "success"})
                else:
                    return jsonify({"error": "Transaction not found"}), 404
        except Exception as e:
            app.logger.error(f"Wallet Put Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

    # DELETE: İşlem Sil
    if request.method == 'DELETE':
        try:
            tx_id = int(request.args.get('id'))
            if os.path.exists(WALLET_FILE):
                df = pd.read_csv(WALLET_FILE)
                # Header kontrolü
                if 'amount' not in df.columns:
                    df = pd.read_csv(WALLET_FILE, header=None, names=['date', 'type', 'amount'])
                
                if tx_id in df.index:
                    # --- SENKRONIZASYON BASLANGIC ---
                    # Cüzdandan silinen kayıt bir hisse işlemiyse (STOCK_BUY/STOCK_SELL),
                    # portföyden de ilgili hisse işlemini bulup silelim.
                    try:
                        deleted_row = df.loc[tx_id]
                        w_type = deleted_row['type']
                        w_date = deleted_row['date']
                        w_amount = float(deleted_row['amount'])

                        if w_type in ['STOCK_BUY', 'STOCK_SELL'] and os.path.exists(TRANSACTIONS_FILE):
                            df_tx = pd.read_csv(TRANSACTIONS_FILE)
                            # Header check for transactions
                            if not df_tx.empty and 'symbol' not in df_tx.columns and len(df_tx.columns) == 7:
                                df_tx = pd.read_csv(TRANSACTIONS_FILE, header=None, names=['symbol', 'quantity', 'price', 'totalCost', 'totalCommission', 'date', 'type'])
                            
                            if not df_tx.empty:
                                # Hedef işlem tipi (Cüzdanda STOCK_BUY ise Portföyde BUY'dır)
                                target_tx_type = 'BUY' if w_type == 'STOCK_BUY' else 'SELL'
                                
                                # Eşleşme bulma (Tarih ve Tutar üzerinden)
                                # BUY ise: Cost + Comm = Wallet Amount
                                # SELL ise: Cost - Comm = Wallet Amount
                                tolerance = 0.01
                                match_idx = None
                                
                                for idx, row in df_tx.iterrows():
                                    if row['type'] != target_tx_type: continue
                                    if row['date'] != w_date: continue
                                    
                                    cost = float(row['totalCost'])
                                    comm = float(row['totalCommission'])
                                    calc_amt = (cost + comm) if target_tx_type == 'BUY' else max(0, cost - comm)
                                    
                                    if abs(calc_amt - w_amount) < tolerance:
                                        match_idx = idx
                                        break
                                
                                if match_idx is not None:
                                    df_tx = df_tx.drop(match_idx)
                                    has_header = 'symbol' in df_tx.columns
                                    df_tx.to_csv(TRANSACTIONS_FILE, index=False, header=has_header)
                                    print(f"[SYNC] Cüzdan kaydı {tx_id} silindiği için işlem {match_idx} de silindi.")
                    except Exception as sync_err:
                        print(f"Sync error: {sync_err}")
                    # --- SENKRONIZASYON BITIS ---

                    df = df.drop(tx_id)
                    # Kaydederken header durumunu koru veya varsayılan olarak ekle
                    df.to_csv(WALLET_FILE, index=False)
                    clear_user_cache() # Veri değişti
                    return jsonify({"status": "success"})
                else:
                    return jsonify({"error": "Transaction not found"}), 404
        except Exception as e:
            app.logger.error(f"Wallet Delete Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

# Hedef Yönetimi (Target)
@app.route('/api/targets', methods=['GET', 'POST', 'DELETE'])
def handle_targets():
    if request.method == 'GET':
        # Cache Kontrolü
        cached = get_from_cache('user_targets')
        if cached: return jsonify(cached)

        if os.path.exists(TARGETS_FILE):
            try:
                with open(TARGETS_FILE, 'r') as f:
                    data = json.load(f)
                    save_to_cache('user_targets', data)
                    return jsonify(data)
            except:
                return jsonify({})
        return jsonify({})
    
    if request.method == 'POST':
        try:
            data = request.json
            with open(TARGETS_FILE, 'w') as f:
                json.dump(data, f)
            clear_user_cache() # Veri değişti
            return jsonify({"status": "success"})
        except Exception as e:
            app.logger.error(f"Targets Post Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'DELETE':
        try:
            if os.path.exists(TARGETS_FILE):
                os.remove(TARGETS_FILE)
            clear_user_cache() # Veri değişti
            return jsonify({"status": "success"})
        except Exception as e:
            app.logger.error(f"Targets Delete Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

# Verileri Sıfırla (Tüm verileri sil)
@app.route('/api/reset', methods=['POST'])
def reset_all_data():
    try:
        if os.path.exists(TRANSACTIONS_FILE):
            os.remove(TRANSACTIONS_FILE)
        
        if os.path.exists(WALLET_FILE):
            os.remove(WALLET_FILE)
            
        if os.path.exists(TARGETS_FILE):
            os.remove(TARGETS_FILE)
            
        clear_user_cache()
        return jsonify({"status": "success"})
    except Exception as e:
        app.logger.error(f"Reset Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Portföy Tarihçesi (Grafik İçin)
@app.route('/api/portfolio/history', methods=['GET'])
def get_portfolio_history():
    # Cache Kontrolü (En önemli kısım burası, çok işlem yapıyor)
    cached = get_from_cache('user_portfolio_history')
    if cached: return jsonify(cached)

    try:
        # Veri dosyaları yoksa boş dön
        if not os.path.exists(WALLET_FILE) and not os.path.exists(TRANSACTIONS_FILE):
            return jsonify([])

        # Tarih aralığını belirle (İnterval seçimi için)
        min_date = datetime.datetime.now()
        if os.path.exists(TRANSACTIONS_FILE) and os.path.getsize(TRANSACTIONS_FILE) > 0:
             df_temp = pd.read_csv(TRANSACTIONS_FILE)
             if 'date' in df_temp.columns:
                 min_date = pd.to_datetime(df_temp['date']).min()
        
        # Eğer geçmiş 90 günden kısaysa Saatlik (1h), uzunsa Günlük (1d) veri kullan
        # Bu sayede 1 haftalık grafikte sadece nokta değil, detaylı çizgi görünür.
        interval = '1h' if (datetime.datetime.now() - min_date).days < 90 else '1d'
        freq = 'H' if interval == '1h' else 'D'

        # --- 1. Nakit Geçmişi (Cash History) ---
        cash_series = pd.Series(dtype=float)
        df_wallet = pd.DataFrame()
        if os.path.exists(WALLET_FILE) and os.path.getsize(WALLET_FILE) > 0:
            try:
                df_wallet = pd.read_csv(WALLET_FILE)
                if 'amount' not in df_wallet.columns:
                    df_wallet = pd.read_csv(WALLET_FILE, header=None, names=['date', 'type', 'amount'])
                
                df_wallet['date'] = pd.to_datetime(df_wallet['date'])
                if interval == '1d':
                    df_wallet['date'] = df_wallet['date'].dt.normalize()
                else:
                    df_wallet['date'] = df_wallet['date'].dt.floor('h') # Saate yuvarla

                df_wallet['signed_amount'] = df_wallet.apply(
                    lambda x: x['amount'] if x['type'] in ['DEPOSIT', 'STOCK_SELL'] else -x['amount'], axis=1
                )
                # Günlük nakit akışını topla
                cash_series = df_wallet.groupby('date')['signed_amount'].sum()
            except Exception as e:
                print(f"Wallet history error: {e}")

        # --- 2. Hisse Değeri Geçmişi (Stock Value History) ---
        stock_value_series = pd.Series(dtype=float)
        net_stock_spend_series = pd.Series(dtype=float)
        if os.path.exists(TRANSACTIONS_FILE) and os.path.getsize(TRANSACTIONS_FILE) > 0:
            try:
                df_tx = pd.read_csv(TRANSACTIONS_FILE)
                if 'symbol' not in df_tx.columns and len(df_tx.columns) == 7:
                    df_tx = pd.read_csv(TRANSACTIONS_FILE, header=None, names=['symbol', 'quantity', 'price', 'totalCost', 'totalCommission', 'date', 'type'])
                
                if not df_tx.empty:
                    df_tx['date'] = pd.to_datetime(df_tx['date'])
                    if interval == '1d':
                        df_tx['date'] = df_tx['date'].dt.normalize()
                    else:
                        df_tx['date'] = df_tx['date'].dt.floor('h')

                    symbols = df_tx['symbol'].unique().tolist()
                    
                    if symbols:
                        min_date = df_tx['date'].min()
                        # Yfinance için tarih formatı
                        start_str = min_date.strftime('%Y-%m-%d')
                        
                        # Geçmiş fiyatları çek
                        stock_data = yf.download(symbols, start=start_str, interval=interval, progress=False, auto_adjust=True)['Close']
                        
                        # Tek hisse varsa Series gelir, DataFrame'e çevir
                        if isinstance(stock_data, pd.Series):
                            stock_data = stock_data.to_frame(name=symbols[0])
                        
                        # Timezone kaldır ve indexi hizala
                        if stock_data.index.tz is not None:
                            stock_data.index = stock_data.index.tz_convert(None)
                        
                        if interval == '1d':
                            stock_data.index = stock_data.index.normalize()
                        else:
                            stock_data.index = stock_data.index.floor('h')
                        
                        # Günlük hisse adetlerini hesapla
                        df_tx['signed_qty'] = df_tx.apply(lambda x: x['quantity'] if x['type'] == 'BUY' else -x['quantity'], axis=1)
                        daily_qty_change = df_tx.groupby(['date', 'symbol'])['signed_qty'].sum().unstack(fill_value=0)
                        
                        # Tüm tarih aralığını oluştur
                        full_idx = pd.date_range(start=min_date, end=datetime.datetime.now(), freq=freq)
                        if interval == '1d':
                            full_idx = full_idx.normalize()
                        else:
                            full_idx = full_idx.floor('h')
                        
                        # Adetleri kümülatif topla (Holdings over time)
                        holdings_over_time = daily_qty_change.reindex(full_idx, fill_value=0).cumsum()
                        
                        # Fiyatları hizala
                        prices_full = stock_data.reindex(full_idx)
                        
                        # İyileştirilmiş Fiyat Tamamlama:
                        # yfinance verisi eksikse (NaN), işlem geçmişindeki fiyatları kullan.
                        for sym in symbols:
                            if sym not in prices_full.columns:
                                prices_full[sym] = None # Sütun yoksa oluştur
                            
                            # Bu hisse için işlem geçmişini al
                            sym_txs = df_tx[df_tx['symbol'] == sym].sort_values('date')
                            
                            if not sym_txs.empty:
                                # İşlem günleri için işlem fiyatlarını al
                                tx_prices = sym_txs.groupby('date')['price'].last()
                                tx_prices_reindexed = tx_prices.reindex(full_idx)
                                
                                # 1. Piyasa verisi olmayan günleri işlem fiyatıyla doldur
                                prices_full[sym] = prices_full[sym].fillna(tx_prices_reindexed)
                                
                                # 2. Hala boşluk varsa önceki günün fiyatını taşı (ffill)
                                prices_full[sym] = prices_full[sym].ffill()
                                
                                # 3. En baştaki boşluklar için (ilk işlem öncesi) ilk işlem fiyatını kullan
                                first_price = sym_txs.iloc[0]['price']
                                prices_full[sym] = prices_full[sym].fillna(first_price)
                        
                        prices_full = prices_full.fillna(0)
                        
                        # Günlük Toplam Hisse Değeri = Adet * Fiyat
                        market_values = holdings_over_time * prices_full
                        stock_value_series = market_values.sum(axis=1)
                        
                        # Hisse Harcamaları (Nakit Akışı Etkisi)
                        # BUY: Para çıktı (+Spend), SELL: Para girdi (-Spend)
                        df_tx['trade_cash_flow'] = df_tx.apply(
                            lambda x: (x['totalCost'] + x['totalCommission']) if x['type'] == 'BUY' else -(x['totalCost'] - x['totalCommission']), axis=1
                        )
                        net_stock_spend_series = df_tx.groupby('date')['trade_cash_flow'].sum()
            except Exception as e:
                print(f"Stock history error: {e}")

        # --- 3. Birleştirme (Total Portfolio Value) ---
        # Tüm tarihleri birleştir
        all_dates = cash_series.index.union(stock_value_series.index).sort_values()
        
        # Gelecek tarihleri filtrele (Wallet'tan gelebilecek ileri tarihli işlemleri kes)
        all_dates = all_dates[all_dates <= datetime.datetime.now()]
        
        if all_dates.empty:
            return jsonify([])
            
        # Nakit bakiyesini kümülatif hesapla (Akışların toplamı)
        cash_flow_aligned = cash_series.reindex(all_dates, fill_value=0)
        cash_balance_over_time = cash_flow_aligned.cumsum()
        
        # Hisse değerini hizala
        stock_value_aligned = stock_value_series.reindex(all_dates).ffill().fillna(0)
        
        # Toplam = Nakit Bakiye + Hisse Değeri
        total_portfolio = cash_balance_over_time + stock_value_aligned
        
        # Yatırılan Ana Para (Invested Capital) Hesabı
        # Formül: Mevcut Nakit + Hisselere Harcanan Net Para = Toplam İçeri Giren Para
        net_stock_spend_aligned = net_stock_spend_series.reindex(all_dates, fill_value=0).cumsum()
        invested_capital = cash_balance_over_time + net_stock_spend_aligned
        
        # JSON Formatı
        result = []
        for date, value in total_portfolio.items():
            result.append({
                'date': date.strftime('%Y-%m-%d %H:%M') if interval == '1h' else date.strftime('%Y-%m-%d'),
                'value': float(value),
                'invested': float(invested_capital.loc[date])
            })
            
        save_to_cache('user_portfolio_history', result)
        return jsonify(result)

    except Exception as e:
        app.logger.error(f"Portfolio History Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Akıllı Arama (Şirket İsminden Sembol Bulma)
@app.route('/api/search', methods=['GET'])
def search_stocks():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        # Yahoo Finance Search API
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=5&newsCount=0"
        response = requests.get(url, headers=headers)
        data = response.json()
        
        results = []
        if 'quotes' in data:
            for quote in data['quotes']:
                # Sadece hisse senetlerini ve ETF'leri alalım
                if quote.get('quoteType') in ['EQUITY', 'ETF']:
                    results.append({
                        'symbol': quote.get('symbol'),
                        'name': quote.get('shortname') or quote.get('longname'),
                        'type': quote.get('quoteType'),
                        'exch': quote.get('exchange')
                    })
        return jsonify(results)
    except Exception as e:
        print(f"Search Error: {e}")
        return jsonify({'error': str(e)}), 500

# Ana Sayfa Rotası: React uygulamasını (index.html) sunar
@app.route('/')
def serve():
    # Eğer build alınmışsa index.html'i döndür
    if os.path.exists(app.static_folder):
        return send_from_directory(app.static_folder, 'index.html')
    else:
        return "React build klasörü (dist) bulunamadı. Lütfen 'npm run build' çalıştırın."

# --- SPA ROUTING FIX (SAYFA YENILEME SORUNU ICIN) ---
@app.errorhandler(404)
def not_found(e):
    # Eger istek API veya statik dosya degilse, index.html dondur (React Router halleder)
    # Bu sayede /market/AAPL gibi sayfalarda F5 yapinca 404 hatasi almazsiniz.
    if request.path.startswith('/api/') or request.path.startswith('/logos/'):
        return jsonify({'error': 'Not found'}), 404
    
    if os.path.exists(app.static_folder):
        return send_from_directory(app.static_folder, 'index.html')
    
    return "404 Not Found", 404

if __name__ == '__main__':
    # Eğer .exe ise tarayıcıyı otomatik aç
    try:
        if getattr(sys, 'frozen', False):
            # Monitor thread'i baslat (Arka planda calisip kapanmayi kontrol eder)
            t = threading.Thread(target=monitor_heartbeat, daemon=True)
            t.start()

            # Tarayiciyi acmadan once 4 saniye bekle (Sunucunun hazir olmasi icin)
            Timer(4.0, lambda: webbrowser.open("http://localhost:5000")).start()
            app.run(port=5000, debug=False)
        else:
            app.run(port=5000, debug=True)
    except Exception as e:
        # Kritik hata durumunda Masaustune rapor yaz
        try:
            desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
            error_path = os.path.join(desktop, 'BORSA_HATA_RAPORU.txt')
            with open(error_path, 'w', encoding='utf-8') as f:
                f.write(f"HATA ZAMANI: {datetime.datetime.now()}\n\n")
                f.write(traceback.format_exc())
        except:
            pass # Rapor yazarken de hata olursa yapacak bir sey yok
