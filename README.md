# SignalRGB için Tapo Standalone 0.6.0 — güvenli önizleme

Bu paket Tapo L530 ampul ve P110 priz için, başlangıç güvenliğine öncelik verilerek yeniden hazırlanmıştır. Yerel ağda doğrudan KLAP v2 kullanır; `tapo-rest`, harici süreç veya servis yöneticisi çalıştırmaz.

## Bu sürümde değişenler

- E-posta, parola, cihaz adı ve IP adresi artık JavaScript koduna yazılmaz.
- Bilgiler SignalRGB içindeki Tapo servis panelinden girilir.
- Parola alanı maskelidir. Boş bırakılarak kaydedilirse önceki parola korunur.
- L530 ve P110 için ayrı, pakete gömülü cihaz görselleri vardır.
- Denetleyici adı, model, marka, üretici ve ürün bilgileri açıkça `Tapo L530` veya `Tapo P110` olarak gönderilir.
- Ayar kaydından sonra çalışan denetleyiciler canlı olarak silinip yeniden oluşturulmaz; değişiklikler SignalRGB yeniden başlatılınca uygulanır.

SignalRGB'nin ayarları diskte hangi yöntemle koruduğu bu çalışma kapsamında doğrulanmadı. Bu nedenle parolanın şifreli saklandığı iddia edilmez. Ancak parola artık eklenti kaynak kodunda veya ZIP içinde bulunmaz.

## Güvenli kurulum

1. SignalRGB'yi sistem tepsisinden tamamen kapatın.
2. Eski `TapoStandalone.js` ve `TapoStandalone.qml` dosyalarını eklenti klasörünün dışına taşıyın. Aynı anda yalnızca bu sürüm kurulu olsun.
3. ZIP içindeki `TapoStandalone.js` ve `TapoStandalone.qml` dosyalarını SignalRGB'nin özel eklenti klasörüne birlikte kopyalayın.
4. SignalRGB'yi açın. Tapo servis paneline girin.
5. Tapo hesabınızın e-posta ve parolasını girin.
6. Önce yalnızca bir modeli etkinleştirin; adını ve sabit yerel IPv4 adresini yazın. Örnek adlar `Tapo L530` ve `Tapo P110` şeklindedir.
7. **Save configuration** düğmesine basın, SignalRGB'yi tamamen kapatıp yeniden açın.
8. İlk denemede yalnızca tek cihazla kararlılığı doğrulayın.

Geçerli e-posta, kayıtlı parola, etkin cihaz ve geçerli IPv4 adresi birlikte bulunmadıkça eklenti denetleyici duyurmaz ve Tapo bağlantısı başlatmaz.

## Acil geri alma

SignalRGB açılmazsa Görev Yöneticisi'nden tüm SignalRGB işlemlerini sonlandırın, yalnızca `TapoStandalone.js` ile `TapoStandalone.qml` dosyalarını özel eklenti klasöründen çıkarın ve SignalRGB'yi yeniden başlatın.

## Doğrulama durumu

- JavaScript sözdizimi Node.js 24 ile kontrol edildi.
- SHA-1, SHA-256, AES-128 ve AES-CBC yardımcıları standart vektörlerle sınandı.
- QML dengeli parantez/yapı, maskeli parola alanı ve sınırlı tek kayıt çağrısı açısından statik olarak kontrol edildi.
- ZIP oluşturulduktan sonra yeniden açılıp dosya listesi doğrulandı.
- Paket gerçek SignalRGB kurulumu ve fiziksel L530/P110 cihazlarıyla çalıştırılmadı.

Bu kontroller başlangıçta çökme riskini azaltır; gerçek çalışma garantisi vermez. SignalRGB sürümü, Tapo firmware'i veya hesap kimlik doğrulaması uyumsuz olabilir. Arayüzün model alanını nasıl gösterdiği de gerçek SignalRGB çalıştırması olmadan kesinleştirilemez; eklenti desteklenen denetleyici metadata alanlarını doldurur.

## Dosyalar

- `TapoStandalone.js` — SignalRGB eklentisi ve doğrudan LAN protokolü
- `TapoStandalone.qml` — güvenli ayar paneli
- `tapo-l530.png` / `tapo-p110.png` — gömülü görsellerin kaynak kopyaları
- `VALIDATION.md` — yapılan kontroller ve sınırları
- `MIGRATION.md` — v0.4.0 risk karşılaştırması
- `SOURCES.md` — resmi API ve örnek dayanakları
