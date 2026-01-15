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
from flask import g
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
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

# --- VERITABANI (SQLite) AYARLARI ---
DATABASE = os.path.join(STORAGE_DIR, 'borsa.db')

def create_tables(db):
    """Veritabanı tablolarını oluşturur."""
    # 1. Kullanıcılar Tablosu
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_public INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. İşlemler Tablosu (Transactions)
    db.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            total_cost REAL NOT NULL,
            total_commission REAL NOT NULL,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # 3. Cüzdan Tablosu (Wallet)
    db.execute('''
        CREATE TABLE IF NOT EXISTS wallet (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # 4. Hedefler Tablosu (Targets)
    db.execute('''
        CREATE TABLE IF NOT EXISTS targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            startingAmount REAL,
            startDate TEXT,
            years INTEGER,
            returnRate REAL,
            monthlyContribution REAL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # 5. Arkadaşlık Tablosu
    db.execute('''
        CREATE TABLE IF NOT EXISTS friendships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (friend_id) REFERENCES users (id),
            UNIQUE(user_id, friend_id)
        )
    ''')
    
    # Varsayılan Kullanıcı Oluştur
    try:
        db.execute('INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (1, "demo", "pbkdf2:sha256:260000$placeholder$placeholder")')
    except:
        pass
    
    db.commit()

def get_db():
    """Veritabanı bağlantısını alır veya oluşturur."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        # Sorgu sonuçlarına isimle erişebilmek için (row['username'] gibi)
        db.row_factory = sqlite3.Row
        
        # Tablo kontrolü (Dosya silindiyse otomatik oluştur)
        try:
            db.execute('SELECT 1 FROM users LIMIT 1')
        except sqlite3.OperationalError:
            create_tables(db)
            
    return db

@app.teardown_appcontext
def close_connection(exception):
    """İstek tamamlandığında veritabanı bağlantısını kapatır."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Gerekli tabloları oluşturur."""
    with app.app_context():
        db = get_db()
        create_tables(db)
        print("[DB] Veritabanı ve tablolar kontrol edildi/oluşturuldu.")

# --- KIMLIK DOGRULAMA (AUTH) ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Kullanıcı adı ve şifre gereklidir.'}), 400

    db = get_db()
    
    try:
        # Kullanıcı var mı kontrol et
        cur = db.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cur.fetchone() is not None:
            return jsonify({'error': 'Bu kullanıcı adı zaten alınmış.'}), 409

        # Şifreyi hashle ve kaydet
        hashed_pw = generate_password_hash(password)
        db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, hashed_pw))
        db.commit()
        
        return jsonify({'status': 'success', 'message': 'Kayıt başarılı.'}), 201
    except Exception as e:
        app.logger.error(f"Register Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Kullanıcı adı ve şifre gereklidir.'}), 400

    db = get_db()
    
    try:
        cur = db.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cur.fetchone()

        if user is None or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Geçersiz kullanıcı adı veya şifre.'}), 401

        # Başarılı giriş - Kullanıcı bilgilerini döndür
        return jsonify({
            'status': 'success',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'is_public': bool(user['is_public'])
            }
        })
    except Exception as e:
        app.logger.error(f"Login Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# --- KULLANICI YARDIMCISI ---
def get_current_user_id():
    user_id = request.headers.get('X-User-ID')
    if user_id:
        return int(user_id)
    return 1

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
logging.getLogger('werkzeug').setLevel(logging.ERROR)
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
            # Tarih formatı düzeltmesi (YYYY-MM-DD HH:MM -> YYYY-MM-DD)
            # yfinance bazen saat bilgisini sevmez ("unconverted data remains" hatasi icin)
            if ' ' in start: start = start.split(' ')[0]
            if end and ' ' in end: end = end.split(' ')[0]
            
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

# Portföy Yönetimi (Transaction Bazlı - SQLite)

@app.route('/api/portfolio', methods=['GET', 'POST'])
def handle_portfolio():
    user_id = get_current_user_id()
    db = get_db()

    # GET: İşlemleri oku ve portföy özetini hesapla
    if request.method == 'GET':
        # Cache Kontrolü
        cached = get_from_cache(f'user_{user_id}_portfolio_summary')
        if cached: return jsonify(cached)

        try:
            # Veritabanından işlemleri çek
            df = pd.read_sql_query("SELECT * FROM transactions WHERE user_id = ?", db, params=(user_id,))
            
            if not df.empty:
                # Sütun isimlerini düzelt (total_cost -> totalCost)
                df.rename(columns={'total_cost': 'totalCost', 'total_commission': 'totalCommission'}, inplace=True)

                # İşlem tipine göre miktar hesapla (BUY: +, SELL: -)
                df['signed_quantity'] = df.apply(lambda x: x['quantity'] if x['type'] == 'BUY' else -x['quantity'], axis=1)

                # İşlemleri hisse bazında grupla ve özetle
                portfolio = df.groupby('symbol').agg({
                    'signed_quantity': 'sum',
                    'totalCost': 'sum',
                    'totalCommission': 'sum'
                }).reset_index()
                
                portfolio.rename(columns={'signed_quantity': 'quantity'}, inplace=True)
                
                # Ortalama maliyeti hesapla (totalCost / quantity)
                portfolio['averageCost'] = portfolio.apply(
                    lambda x: x['totalCost'] / x['quantity'] if x['quantity'] > 0 else 0, axis=1
                )
                
                # Sadece elinde hisse kalanları (quantity > 0) döndür
                portfolio = portfolio[portfolio['quantity'] > 0]
                
                result = portfolio.to_dict(orient='records')
                save_to_cache(f'user_{user_id}_portfolio_summary', result)
                return jsonify(result)
            return jsonify([])
        except Exception as e:
            app.logger.error(f"Portfolio Read Error: {e}", exc_info=True)
            return jsonify([])
    
    # POST: Yeni işlem ekle (Append)
    if request.method == 'POST':
        try:
            data = request.json
            qty = float(data.get('quantity', 0))
            price = float(data.get('price', 0))
            
            total_cost = qty * price
            total_commission = float(data.get('commission', total_cost * 0.001))
            date_val = data.get('date', datetime.datetime.now().isoformat())
            tx_type = data.get('type', 'BUY')
            symbol = data.get('symbol')

            db.execute('''
                INSERT INTO transactions (user_id, symbol, quantity, price, total_cost, total_commission, date, type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, symbol, qty, price, total_cost, total_commission, date_val, tx_type))
            db.commit()
            
            clear_user_cache() # Veri değişti, cache'i temizle
            return jsonify({"status": "success", "data": data})
        except Exception as e:
            app.logger.error(f"Transaction Insert Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

# İşlem Geçmişi (Ham Veri)
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    user_id = get_current_user_id()
    db = get_db()

    # Cache Kontrolü
    cached = get_from_cache(f'user_{user_id}_transactions')
    if cached: return jsonify(cached)

    try:
        df = pd.read_sql_query("SELECT * FROM transactions WHERE user_id = ?", db, params=(user_id,))
        
        if not df.empty:
            # Sütun isimlerini frontend ile uyumlu hale getir (total_cost -> totalCost)
            df.rename(columns={'total_cost': 'totalCost', 'total_commission': 'totalCommission'}, inplace=True)

            # Tarihe göre sırala (En yeni en üstte)
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df = df.sort_values(by='date', ascending=False)
                # Tarihi ISO formatında string'e çevir (Frontend'de düzenlemek için gerekli)
                df['date'] = df['date'].dt.strftime('%Y-%m-%dT%H:%M')
            
            result = df.to_dict(orient='records')
            save_to_cache(f'user_{user_id}_transactions', result)
            return jsonify(result)
        return jsonify([])
    except Exception as e:
        print(f"Transaction Read Error: {e}")
        return jsonify([])

# İşlem Silme
@app.route('/api/transactions', methods=['DELETE'])
def delete_transaction():
    user_id = get_current_user_id()
    db = get_db()
    try:
        tx_id = int(request.args.get('id'))
        
        # Önce işlemi bul (Wallet sync için)
        cur = db.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
        tx = cur.fetchone()
        
        if tx:
            # İşlemi sil
            db.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
            
            # --- CÜZDAN SENKRONİZASYONU ---
            # Transaction silindiğinde, ilgili cüzdan kaydını da bul ve sil
            try:
                cost = float(tx['total_cost'])
                comm = float(tx['total_commission'])
                target_amount = 0
                target_types = []

                if tx['type'] == 'BUY':
                    target_amount = cost + comm
                    target_types = ['STOCK_BUY', 'WITHDRAW']
                else:
                    target_amount = max(0, cost - comm)
                    target_types = ['STOCK_SELL', 'DEPOSIT']
                
                # Eşleşen cüzdan kaydını bul (Tarih, Tip ve Tutar yaklaşık eşit)
                # SQLite'da float karşılaştırması için aralık kullanıyoruz
                db.execute('''
                    DELETE FROM wallet 
                    WHERE id IN (
                        SELECT id FROM wallet 
                        WHERE user_id = ? 
                        AND date = ? 
                        AND type IN (?, ?) 
                        AND ABS(amount - ?) < 0.01
                        LIMIT 1
                    )
                ''', (user_id, tx['date'], target_types[0], target_types[1], target_amount))
                
            except Exception as w_e:
                print(f"Wallet sync error during delete: {w_e}")
            
            db.commit()
            clear_user_cache()
            return jsonify({"status": "success"})
        else:
            return jsonify({"error": "Transaction not found"}), 404
    except Exception as e:
        app.logger.error(f"Transaction Delete Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# İşlem Güncelleme
@app.route('/api/transactions', methods=['PUT'])
def update_transaction():
    user_id = get_current_user_id()
    db = get_db()
    try:
        data = request.json
        tx_id = int(data.get('id'))
        
        # Mevcut veriyi çek
        cur = db.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
        tx = cur.fetchone()
        
        if tx:
            qty = float(data.get('quantity', tx['quantity']))
            price = float(data.get('price', tx['price']))
            total_cost = qty * price
            total_commission = float(data.get('commission', tx['total_commission']))
            date_val = data.get('date', tx['date'])
            
            db.execute('''
                UPDATE transactions 
                SET quantity = ?, price = ?, total_cost = ?, total_commission = ?, date = ?
                WHERE id = ?
            ''', (qty, price, total_cost, total_commission, date_val, tx_id))
            db.commit()
            
            clear_user_cache()
            return jsonify({"status": "success"})
        else:
            return jsonify({"error": "Transaction not found"}), 404
    except Exception as e:
        app.logger.error(f"Transaction Update Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Cüzdan Yönetimi (Nakit Giriş/Çıkış)
@app.route('/api/wallet', methods=['GET', 'POST', 'DELETE', 'PUT'])
def handle_wallet():
    user_id = get_current_user_id()
    db = get_db()

    # GET: Bakiyeyi Hesapla
    if request.method == 'GET':
        # Cache Kontrolü
        cached = get_from_cache(f'user_{user_id}_wallet')
        if cached: return jsonify(cached)

        try:
            df = pd.read_sql_query("SELECT * FROM wallet WHERE user_id = ?", db, params=(user_id,))
            
            if not df.empty:
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
                save_to_cache(f'user_{user_id}_wallet', result)
                return jsonify(result)
            return jsonify({'balance': 0.0, 'transactions': []})
        except Exception as e:
            print(f"Wallet Read Error: {e}")
            return jsonify({'balance': 0.0, 'transactions': []})

    # POST: Yeni İşlem Ekle
    if request.method == 'POST':
        try:
            data = request.json
            date_val = data.get('date', datetime.datetime.now().isoformat())
            tx_type = data.get('type', 'DEPOSIT')
            amount = float(data.get('amount', 0))
            
            db.execute('INSERT INTO wallet (user_id, type, amount, date) VALUES (?, ?, ?, ?)', 
                       (user_id, tx_type, amount, date_val))
            db.commit()
            
            clear_user_cache() # Veri değişti
            return jsonify({"status": "success"})
        except Exception as e:
            app.logger.error(f"Wallet Post Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

    # PUT: İşlem Güncelle
    if request.method == 'PUT':
        try:
            data = request.json
            tx_id = int(data.get('id'))
            
            # Mevcut veriyi kontrol et
            cur = db.execute("SELECT * FROM wallet WHERE id = ? AND user_id = ?", (tx_id, user_id))
            if cur.fetchone():
                amount = float(data.get('amount'))
                tx_type = data.get('type')
                date_val = data.get('date')
                
                db.execute('UPDATE wallet SET amount = ?, type = ?, date = ? WHERE id = ?', 
                           (amount, tx_type, date_val, tx_id))
                db.commit()
                
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
            
            # Önce kaydı bul (Sync için)
            cur = db.execute("SELECT * FROM wallet WHERE id = ? AND user_id = ?", (tx_id, user_id))
            row = cur.fetchone()
            
            if row:
                # --- SENKRONIZASYON ---
                try:
                    w_type = row['type']
                    w_date = row['date']
                    w_amount = float(row['amount'])
                    
                    if w_type in ['STOCK_BUY', 'STOCK_SELL']:
                        target_tx_type = 'BUY' if w_type == 'STOCK_BUY' else 'SELL'
                        
                        # Eşleşen portföy işlemini bul ve sil
                        # BUY: Cost + Comm = Amount
                        # SELL: Cost - Comm = Amount
                        # SQLite'da hesaplama yaparak eşleşme arıyoruz
                        if target_tx_type == 'BUY':
                            db.execute('''
                                DELETE FROM transactions 
                                WHERE id IN (
                                    SELECT id FROM transactions 
                                    WHERE user_id = ? AND date = ? AND type = 'BUY' 
                                    AND ABS((total_cost + total_commission) - ?) < 0.01
                                    LIMIT 1
                                )
                            ''', (user_id, w_date, w_amount))
                        else:
                            db.execute('''
                                DELETE FROM transactions 
                                WHERE id IN (
                                    SELECT id FROM transactions 
                                    WHERE user_id = ? AND date = ? AND type = 'SELL' 
                                    AND ABS((total_cost - total_commission) - ?) < 0.01
                                    LIMIT 1
                                )
                            ''', (user_id, w_date, w_amount))
                except Exception as sync_err:
                    print(f"Sync error: {sync_err}")
                
                # Cüzdan kaydını sil
                db.execute("DELETE FROM wallet WHERE id = ?", (tx_id,))
                db.commit()
                
                clear_user_cache()
                return jsonify({"status": "success"})
            else:
                return jsonify({"error": "Transaction not found"}), 404
        except Exception as e:
            app.logger.error(f"Wallet Delete Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

# Hedef Yönetimi (Target)
@app.route('/api/targets', methods=['GET', 'POST', 'DELETE'])
def handle_targets():
    user_id = get_current_user_id()
    db = get_db()

    if request.method == 'GET':
        # Cache Kontrolü
        cached = get_from_cache(f'user_{user_id}_targets')
        if cached: return jsonify(cached)

        cur = db.execute("SELECT * FROM targets WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        if row:
            data = dict(row)
            save_to_cache(f'user_{user_id}_targets', data)
            return jsonify(data)
        return jsonify({}) # Boş obje dön
    
    if request.method == 'POST':
        try:
            data = request.json
            
            # Önce var mı kontrol et
            cur = db.execute("SELECT id FROM targets WHERE user_id = ?", (user_id,))
            existing = cur.fetchone()
            
            if existing:
                db.execute('''
                    UPDATE targets 
                    SET startingAmount=?, startDate=?, years=?, returnRate=?, monthlyContribution=?
                    WHERE user_id=?
                ''', (data.get('startingAmount'), data.get('startDate'), data.get('years'), 
                      data.get('returnRate'), data.get('monthlyContribution'), user_id))
            else:
                db.execute('''
                    INSERT INTO targets (user_id, startingAmount, startDate, years, returnRate, monthlyContribution)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_id, data.get('startingAmount'), data.get('startDate'), data.get('years'), 
                      data.get('returnRate'), data.get('monthlyContribution')))
            
            db.commit()
            clear_user_cache() # Veri değişti
            return jsonify({"status": "success"})
        except Exception as e:
            app.logger.error(f"Targets Post Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'DELETE':
        try:
            db.execute("DELETE FROM targets WHERE user_id = ?", (user_id,))
            db.commit()
            clear_user_cache() # Veri değişti
            return jsonify({"status": "success"})
        except Exception as e:
            app.logger.error(f"Targets Delete Error: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500

# Verileri Sıfırla (Tüm verileri sil)
@app.route('/api/reset', methods=['POST'])
def reset_all_data():
    user_id = get_current_user_id()
    db = get_db()
    try:
        print(f"--- SIFIRLAMA İŞLEMİ BAŞLADI (User ID: {user_id}) ---")
        
        cur = db.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))
        print(f"-> Silinen İşlem Sayısı: {cur.rowcount}")
        
        cur = db.execute("DELETE FROM wallet WHERE user_id = ?", (user_id,))
        print(f"-> Silinen Cüzdan Kaydı: {cur.rowcount}")
        
        cur = db.execute("DELETE FROM targets WHERE user_id = ?", (user_id,))
        print(f"-> Silinen Hedef: {cur.rowcount}")
        
        db.commit()
        print("--- SIFIRLAMA TAMAMLANDI ---")
        
        clear_user_cache()
        return jsonify({"status": "success"})
    except Exception as e:
        app.logger.error(f"Reset Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# --- PORTFÖY HESAPLAMA MOTORU (Ortak Fonksiyon) ---
def calculate_portfolio_history(user_id, db):
    """Verilen kullanıcının portföy tarihçesini hesaplar."""
    
    try:
        # Verileri SQL'den çek
        df_wallet = pd.read_sql_query("SELECT * FROM wallet WHERE user_id = ?", db, params=(user_id,))
        df_tx = pd.read_sql_query("SELECT * FROM transactions WHERE user_id = ?", db, params=(user_id,))

        if df_wallet.empty and df_tx.empty:
             return []

        # Tarih aralığını belirle (İnterval seçimi için)
        min_date = datetime.datetime.now()
        if not df_tx.empty and 'date' in df_tx.columns:
             min_date = pd.to_datetime(df_tx['date']).min()
        
        # Eğer geçmiş 90 günden kısaysa Saatlik (1h), uzunsa Günlük (1d) veri kullan
        # Bu sayede 1 haftalık grafikte sadece nokta değil, detaylı çizgi görünür.
        interval = '1h' if (datetime.datetime.now() - min_date).days < 90 else '1d'
        freq = 'h' if interval == '1h' else 'D'

        # --- 1. Nakit Geçmişi (Cash History) ---
        cash_series = pd.Series(dtype=float)
        if not df_wallet.empty:
            try:
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
        if not df_tx.empty:
            try:
                # Sütun isimlerini düzelt (total_cost -> totalCost)
                df_tx.rename(columns={'total_cost': 'totalCost', 'total_commission': 'totalCommission'}, inplace=True)

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
            return []
            
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
            
        return result

    except Exception as e:
        print(f"Portfolio Calculation Error (User {user_id}): {e}")
        return []

# Portföy Tarihçesi (Grafik İçin - Kendi Portföyüm)
@app.route('/api/portfolio/history', methods=['GET'])
def get_portfolio_history():
    user_id = get_current_user_id()
    db = get_db()

    # Cache Kontrolü
    cached = get_from_cache(f'user_{user_id}_portfolio_history')
    if cached: return jsonify(cached)

    result = calculate_portfolio_history(user_id, db)
    
    if result:
        save_to_cache(f'user_{user_id}_portfolio_history', result)
    
    return jsonify(result)

# --- SOSYAL ÖZELLİKLER ---

# Arkadaş Arama
@app.route('/api/users/search', methods=['GET'])
def search_users():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify([])
    
    db = get_db()
    user_id = get_current_user_id()
    
    # Kendisi hariç, aranan kelimeyi içeren kullanıcıları bul
    cur = db.execute("SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 5", (f'%{query}%', user_id))
    results = [dict(row) for row in cur.fetchall()]
    return jsonify(results)

# Arkadaş Yönetimi (Listele, Ekle, Sil)
@app.route('/api/friends', methods=['GET', 'POST', 'DELETE'])
def handle_friends():
    user_id = get_current_user_id()
    db = get_db()
    
    if request.method == 'GET':
        # Arkadaş listesini getir
        cur = db.execute('''
            SELECT u.id, u.username 
            FROM friendships f
            JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = ?
        ''', (user_id,))
        friends = [dict(row) for row in cur.fetchall()]
        return jsonify(friends)
        
    if request.method == 'POST':
        # Arkadaş ekle
        data = request.json
        friend_id = data.get('friend_id')
        
        if not friend_id:
            return jsonify({'error': 'Friend ID required'}), 400
            
        try:
            db.execute('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)', (user_id, friend_id))
            db.commit()
            return jsonify({'status': 'success'})
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Already friends'}), 409

    if request.method == 'DELETE':
        # Arkadaş sil
        friend_id = request.args.get('id')
        db.execute('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?', (user_id, friend_id))
        db.commit()
        return jsonify({'status': 'success'})

# Arkadaş Portföyü (Kıyaslama İçin)
@app.route('/api/friends/portfolio/<int:friend_id>', methods=['GET'])
def get_friend_portfolio_history(friend_id):
    user_id = get_current_user_id()
    db = get_db()
    
    # Arkadaşlık kontrolü (Sadece arkadaşınsa veriyi çek)
    check = db.execute('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?', (user_id, friend_id)).fetchone()
    if not check:
        return jsonify({'error': 'Not friends'}), 403
        
    # Arkadaşın verisini hesapla (Cache kullanmadan anlık hesapla veya ayrı cache kullan)
    # Arkadaşın verisi için de cache kullanabiliriz:
    cache_key = f'user_{friend_id}_portfolio_history'
    cached = get_from_cache(cache_key)
    if cached: return jsonify(cached)
    
    result = calculate_portfolio_history(friend_id, db)
    
    # Arkadaşın verisini de cache'e atalım (Performans için)
    if result:
        save_to_cache(cache_key, result)
        
    return jsonify(result)

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
    # Veritabanını başlat
    init_db()
    
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
