# bird 🐦 — tweet atma, yanıtlama ve okuma için hızlı X CLI

`bird`, X/Twitter GraphQL (çerez kimlik doğrulaması) üzerinden tweet atma, yanıtlama ve okuma yapabilen hızlı bir X CLI aracıdır.

## Uyarı

Bu proje X/Twitter'ın **belgelenmemiş** web GraphQL API'sini (ve çerez kimlik doğrulamasını) kullanmaktadır. X, uç noktaları, sorgu kimliklerini ve bot karşıtı davranışları istedikleri zaman değiştirebilir — **önceden haber vermeden bozulması beklenmelidir**.

**Güçlü öneri: bird ile tweet atmayın. Çok hızlı bir şekilde engellerle karşılaşırsınız. Tweet okumak için kullanın.
Botlar X/Twitter'da hoş karşılanmaz. Kesinlikle yapmanız gerekiyorsa, bunun yerine tarayıcı otomasyonu kullanın veya tweet oluşturmak için Twitter API'sine ödeme yapın.**

## Kurulum

```bash
npm install -g @steipete/bird
# veya
pnpm add -g @steipete/bird
# veya
bun add -g @steipete/bird

# tek seferlik (kurulum olmadan)
bunx @steipete/bird whoami
```

Homebrew (macOS, önceden derlenmiş Bun ikili dosyası):

```bash
brew install steipete/tap/bird
```

## Hızlı Başlangıç

```bash
# Giriş yapılan hesabı göster
bird whoami

# Komut yardımını keşfet
bird help whoami

# Bir tweet oku (URL veya ID)
bird read https://x.com/user/status/1234567890123456789
bird 1234567890123456789 --json

# Konu + yanıtlar
bird thread https://x.com/user/status/1234567890123456789
bird replies 1234567890123456789
bird replies 1234567890123456789 --max-pages 3 --json
bird thread 1234567890123456789 --max-pages 3 --json

# Arama + bahsetmeler
bird search "from:steipete" -n 5
bird mentions -n 5
bird mentions --user @steipete -n 5

# Kullanıcı tweetleri (profil zaman akışı)
bird user-tweets @steipete -n 20
bird user-tweets @steipete -n 50 --json

# Yer imleri
bird bookmarks -n 5
bird bookmarks --folder-id 123456789123456789 -n 5 # https://x.com/i/bookmarks/<folder-id>
bird bookmarks --all --json
bird bookmarks --all --max-pages 2 --json
bird bookmarks --include-parent --json
bird unbookmark 1234567890123456789
bird unbookmark https://x.com/user/status/1234567890123456789

# Beğeniler
bird likes -n 5

# Haberler ve gündem konuları (Keşfet sekmelerinden AI-küratörlüğünde)
bird news --ai-only -n 10
bird news --sports -n 5

# Listeler
bird list-timeline 1234567890 -n 20
bird list-timeline https://x.com/i/lists/1234567890 --all --json
bird list-timeline 1234567890 --max-pages 3 --json

# Takip edilenler (kimi takip ediyorsunuz)
bird following -n 20
bird following --user 12345678 -n 10  # kullanıcı ID'siyle

# Takipçiler (sizi kim takip ediyor)
bird followers -n 20
bird followers --user 12345678 -n 10  # kullanıcı ID'siyle

# GraphQL sorgu kimlikleri önbelleğini yenile (yeniden derleme olmadan)
bird query-ids --fresh
```

## Haberler & Gündem

X'in Keşfet sayfası sekmelerinden AI-küratörlüğünde haberler ve gündem konularını getir:

```bash
# Tüm sekmelerden 10 haber öğesi getir (varsayılan: Senin İçin, Haberler, Spor, Eğlence)
bird news -n 10

# Sadece AI-küratörlüğünde haberleri getir (normal gündemleri filtreler)
bird news --ai-only -n 20

# Belirli sekmelerden getir
bird news --news-only --ai-only -n 10
bird news --sports -n 15
bird news --entertainment --ai-only -n 5

# Her haber öğesi için ilgili tweetleri dahil et
bird news --with-tweets --tweets-per-item 3 -n 10

# Birden fazla sekme filtresini birleştir
bird news --sports --entertainment -n 20

# JSON çıktısı
bird news --json -n 5
bird news --json-full --ai-only -n 10  # ham API yanıtını içerir
```

Sekme seçenekleri (birleştirilebilir):
- `--for-you` — Sadece Senin İçin sekmesinden getir
- `--news-only` — Sadece Haberler sekmesinden getir
- `--sports` — Sadece Spor sekmesinden getir
- `--entertainment` — Sadece Eğlence sekmesinden getir
- `--trending-only` — Sadece Gündem sekmesinden getir

Varsayılan olarak, komut Senin İçin, Haberler, Spor ve Eğlence sekmelerinden getirir (gürültüyü azaltmak için Gündem hariç tutulur). Başlıklar sekmeler arasında otomatik olarak tekilleştirilir.

## Kütüphane

`bird` bir kütüphane olarak kullanılabilir (CLI ile aynı GraphQL istemcisi):

```ts
import { TwitterClient, resolveCredentials } from '@steipete/bird';

const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
const client = new TwitterClient({ cookies });

// Tweet ara
const searchResult = await client.search('from:steipete', 50);

// Tüm sekmelerden haber ve gündem konularını getir (varsayılan: Senin İçin, Haberler, Spor, Eğlence)
const newsResult = await client.getNews(10, { aiOnly: true });

// Belirli sekmelerden ilgili tweetlerle getir
const sportsNews = await client.getNews(10, {
  aiOnly: true,
  withTweets: true,
  tabs: ['sports', 'entertainment']
});
```

Hesap detayları (Hakkında profili):

```ts
const aboutResult = await client.getUserAboutAccount('steipete');
if (aboutResult.success && aboutResult.aboutProfile) {
  console.log(aboutResult.aboutProfile.accountBasedIn);
}
```

Alanlar:
- `accountBasedIn`
- `source`
- `createdCountryAccurate`
- `locationAccurate`
- `learnMoreUrl`

## Komutlar

- `bird tweet "<metin>"` — yeni bir tweet gönder.
- `bird reply <tweet-id-veya-url> "<metin>"` — ID veya URL kullanarak bir tweete yanıt ver.
- `bird help [komut]` — yardım göster (veya bir alt komut için yardım).
- `bird query-ids [--fresh] [--json]` — önbelleğe alınmış GraphQL sorgu kimliklerini incele veya yenile.
- `bird home [-n sayı] [--following] [--json] [--json-full]` — ana zaman akışınızı (Senin İçin) veya Takip Edilen akışını getir.
- `bird read <tweet-id-veya-url> [--json]` — tweet içeriğini metin veya JSON olarak getir.
- `bird <tweet-id-veya-url> [--json]` — sadece bir URL veya ID sağlandığında `read` için kısayol.
- `bird replies <tweet-id-veya-url> [--all] [--max-pages n] [--cursor string] [--delay ms] [--json]` — bir tweete verilen yanıtları listele.
- `bird thread <tweet-id-veya-url> [--all] [--max-pages n] [--cursor string] [--delay ms] [--json]` — tam konuşma konusunu göster.
- `bird search "<sorgu>" [-n sayı] [--all] [--max-pages n] [--cursor string] [--json]` — bir sorguyla eşleşen tweetleri ara; `--max-pages` için `--all` veya `--cursor` gerekir.
- `bird mentions [-n sayı] [--user @kullanıcı] [--json]` — bir kullanıcıdan bahseden tweetleri bul (varsayılan olarak kimliği doğrulanmış kullanıcı).
- `bird user-tweets <@kullanıcı> [-n sayı] [--cursor string] [--max-pages n] [--delay ms] [--json]` — bir kullanıcının profil zaman akışından tweetleri getir.
- `bird bookmarks [-n sayı] [--folder-id id] [--all] [--max-pages n] [--cursor string] [--expand-root-only] [--author-chain] [--author-only] [--full-chain-only] [--include-ancestor-branches] [--include-parent] [--thread-meta] [--sort-chronological] [--json]` — yer imlerinizi listele (veya belirli bir yer imi klasörü); genişletme bayrakları konu bağlamını kontrol eder; `--max-pages` için `--all` veya `--cursor` gerekir.
- `bird unbookmark <tweet-id-veya-url...>` — tweet ID veya URL ile bir veya daha fazla yer imini kaldır.
- `bird likes [-n sayı] [--all] [--max-pages n] [--cursor string] [--json] [--json-full]` — beğenilen tweetlerinizi listele; `--max-pages` için `--all` veya `--cursor` gerekir.
- `bird news [-n sayı] [--ai-only] [--with-tweets] [--tweets-per-item n] [--for-you] [--news-only] [--sports] [--entertainment] [--trending-only] [--json]` — X'in Keşfet sekmelerinden haber ve gündem konularını getir.
- `bird trending` — `news` komutu için takma ad.
- `bird lists [--member-of] [-n sayı] [--json]` — listelerinizi listele (sahip olunan veya üyelikler).
- `bird list-timeline <liste-id-veya-url> [-n sayı] [--all] [--max-pages n] [--cursor string] [--json]` — bir liste zaman akışından tweetleri getir; `--max-pages`, `--all` gerektirir.
- `bird following [--user <kullanıcıId>] [-n sayı] [--cursor string] [--all] [--max-pages n] [--json]` — sizin (veya başka bir kullanıcının) takip ettiği kullanıcıları listele; `--max-pages` için `--all` gerekir.
- `bird followers [--user <kullanıcıId>] [-n sayı] [--cursor string] [--all] [--max-pages n] [--json]` — sizi (veya başka bir kullanıcıyı) takip eden kullanıcıları listele; `--max-pages` için `--all` gerekir.
- `bird about <@kullanıcı> [--json]` — bir kullanıcı için hesap kaynağı ve konum bilgisi al.
- `bird whoami` — çerezlerinizin hangi Twitter hesabına ait olduğunu yazdır.
- `bird check` — hangi kimlik bilgilerinin mevcut olduğunu ve nereden kaynaklandığını göster.

Yer imleri bayrakları:
- `--expand-root-only`: konuları sadece yer imi bir kök tweet olduğunda genişlet.
- `--author-chain`: sadece yer imi sahibi yazarın bağlı kendi kendine yanıt zincirini tut.
- `--author-only`: konu içindeki yer imi sahibi yazarın tüm tweetlerini dahil et.
- `--full-chain-only`: yer imli tweete bağlı tüm yanıt zincirini tut (tüm yazarlar).
- `--include-ancestor-branches`: `--full-chain-only` kullanırken atalar için kardeş dalları dahil et.
- `--include-parent`: kök olmayan yer imleri için doğrudan üst tweeti dahil et.
- `--thread-meta`: her tweete konu meta veri alanları ekle.
- `--sort-chronological`: çıktıyı genel olarak en eskiden en yeniye sırala (varsayılan yer imi sırasını korur).

Genel seçenekler:
- `--auth-token <token>`: `auth_token` çerezini manuel olarak ayarla.
- `--ct0 <token>`: `ct0` çerezini manuel olarak ayarla.
- `--cookie-source <safari|chrome|firefox>`: tarayıcı çerez kaynağını seç (tekrarlanabilir; sıra önemli).
- `--chrome-profile <ad>`: çerez çıkarma için Chrome profil adı (örn. `Default`, `Profile 2`).
- `--chrome-profile-dir <yol>`: çerez çıkarma için Chrome/Chromium profil dizini veya çerez DB yolu.
- `--firefox-profile <ad>`: çerez çıkarma için Firefox profili.
- `--cookie-timeout <ms>`: keychain/OS yardımcıları için çerez çıkarma zaman aşımı (milisaniye).
- `--timeout <ms>`: verilen zaman aşımından sonra istekleri iptal et (milisaniye).
- `--quote-depth <n>`: JSON çıktısında maksimum alıntı tweet derinliği (varsayılan: 1; 0 devre dışı bırakır).
- `--plain`: kararlı çıktı (emoji yok, renk yok).
- `--no-emoji`: emoji çıktısını devre dışı bırak.
- `--no-color`: ANSI renklerini devre dışı bırak (veya `NO_COLOR=1` ayarlayın).
- `--media <yol>`: medya dosyası ekle (tekrarlanabilir, 4 resme veya 1 videoya kadar).
- `--alt <metin>`: karşılık gelen `--media` için alternatif metin (tekrarlanabilir).

## Kimlik Doğrulama (GraphQL)

GraphQL modu mevcut X/Twitter web oturumunuzu kullanır (şifre istemi yok). Dahili X uç noktalarına istek gönderir ve çerezler (`auth_token`, `ct0`) aracılığıyla kimlik doğrulaması yapar.

Yazma işlemleri:
- `tweet`/`reply` öncelikle GraphQL (`CreateTweet`) kullanır.
- GraphQL hata `226` ("otomatik istek") döndürürse, `bird` eski `statuses/update.json` uç noktasına geri döner.

`bird` kimlik bilgilerini şu sırayla çözer:

1. CLI bayrakları: `--auth-token`, `--ct0`
2. Ortam değişkenleri: `AUTH_TOKEN`, `CT0` (yedek: `TWITTER_AUTH_TOKEN`, `TWITTER_CT0`)
3. `@steipete/sweet-cookie` aracılığıyla tarayıcı çerezleri (`--cookie-source` sırasıyla geçersiz kılınabilir)

Tarayıcı çerez kaynakları:
- Safari: `~/Library/Cookies/Cookies.binarycookies` (yedek: `~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies`)
- Chrome: `~/Library/Application Support/Google/Chrome/<Profil>/Cookies`
- Firefox: `~/Library/Application Support/Firefox/Profiles/<profil>/cookies.sqlite`
  - Chromium varyantları (Arc/Brave/vb.) için `--chrome-profile-dir` ile bir profil dizini veya çerez DB'si iletin.

## Yapılandırma (JSON5)

Yapılandırma önceliği: CLI bayrakları > ortam değişkenleri > proje yapılandırması > genel yapılandırma.

- Genel: `~/.config/bird/config.json5`
- Proje: `./.birdrc.json5`

Örnek `~/.config/bird/config.json5`:

```json5
{
  // Tarayıcı çıkarma için çerez kaynak sırası (string veya dizi)
  cookieSource: ["firefox", "safari"],
  chromeProfileDir: "/yol/Chromium/Profil",
  firefoxProfile: "default-release",
  cookieTimeoutMs: 30000,
  timeoutMs: 20000,
  quoteDepth: 1
}
```

Ortam kısayolları:
- `BIRD_TIMEOUT_MS`
- `BIRD_COOKIE_TIMEOUT_MS`
- `BIRD_QUOTE_DEPTH`

## Çıktı

- `--json` read/replies/thread/search/mentions/user-tweets/bookmarks/likes için ham tweet nesnelerini yazdırır.
- `--json` ile sayfalandırma kullanırken (`--all`, `--cursor`, `--max-pages`, veya `user-tweets` için `-n > 20`), çıktı `{ tweets, nextCursor }` şeklindedir.
- `read` Notes ve Articles için mevcut olduğunda tam metni döndürür.
- Kararlı, betik dostu çıktı için `--plain` kullanın (emoji yok, renk yok).

### JSON Şeması

`--json` kullanırken tweet nesneleri şunları içerir:

| Alan | Tür | Açıklama |
|------|-----|----------|
| `id` | string | Tweet ID |
| `text` | string | Tam tweet metni (mevcut olduğunda Note/Article içeriğini içerir) |
| `author` | object | `{ username, name }` |
| `authorId` | string? | Yazarın kullanıcı ID'si |
| `createdAt` | string | Zaman damgası |
| `replyCount` | number | Yanıt sayısı |
| `retweetCount` | number | Retweet sayısı |
| `likeCount` | number | Beğeni sayısı |
| `conversationId` | string | Konu konuşma ID'si |
| `inReplyToStatusId` | string? | Üst tweet ID (bu bir yanıtsa mevcuttur) |
| `quotedTweet` | object? | Gömülü alıntı tweet (aynı şema; derinlik `--quote-depth` ile kontrol edilir) |

`--json` ile `following`/`followers` kullanırken kullanıcı nesneleri şunları içerir:

| Alan | Tür | Açıklama |
|------|-----|----------|
| `id` | string | Kullanıcı ID |
| `username` | string | Kullanıcı adı/handle |
| `name` | string | Görünen ad |
| `description` | string? | Kullanıcı biyografisi |
| `followersCount` | number? | Takipçi sayısı |
| `followingCount` | number? | Takip edilen sayısı |
| `isBlueVerified` | boolean? | Mavi doğrulanmış bayrağı |
| `profileImageUrl` | string? | Profil resmi URL'si |
| `createdAt` | string? | Hesap oluşturma zaman damgası |

`--json` ile `news`/`trending` kullanırken haber nesneleri şunları içerir:

| Alan | Tür | Açıklama |
|------|-----|----------|
| `id` | string | Haber öğesi için benzersiz tanımlayıcı |
| `headline` | string | Haber başlığı veya gündem başlığı |
| `category` | string? | Kategori (örn. "AI · Teknoloji", "Gündem", "Haberler") |
| `timeAgo` | string? | Göreceli zaman (örn. "2 saat önce") |
| `postCount` | number? | Gönderi sayısı |
| `description` | string? | Öğe açıklaması |
| `url` | string? | Gündem veya haber makalesinin URL'si |
| `tweets` | array? | İlgili tweetler (sadece `--with-tweets` kullanıldığında) |
| `_raw` | object? | Ham API yanıtı (sadece `--json-full` kullanıldığında) |


## Sorgu Kimlikleri (GraphQL)

X, GraphQL "sorgu kimliklerini" sık sık değiştirir. Her GraphQL işlemi şu şekilde adreslenir:

- `operationName` (örn. `TweetDetail`, `CreateTweet`)
- `queryId` (X'in web istemci paketlerinde bulunan değişen ID)

`bird`, `src/lib/query-ids.json`'da bir temel eşleme ile gelir (derleme sırasında `dist/`'e kopyalanır). Çalışma zamanında,
X'in halka açık web istemci paketlerini kazıyarak bu eşlemeyi yenileyebilir ve sonucu diskte önbelleğe alabilir.

Çalışma zamanı önbelleği:
- Varsayılan yol: `~/.config/bird/query-ids-cache.json`
- Yolu geçersiz kıl: `BIRD_QUERY_IDS_CACHE=/yol/dosya.json`
- TTL: 24 saat (eski önbellek hala kullanılır, ancak "taze değil" olarak işaretlenir)

Otomatik kurtarma:
- GraphQL `404` (sorgu ID geçersiz) durumunda, `bird` bir kez yenilemeye zorlar ve yeniden dener.
- `TweetDetail`/`SearchTimeline` için, `bird` yenileme sırasında bozulmayı azaltmak için bilinen küçük bir yedek ID seti arasında da döner.

İsteğe bağlı yenileme:

```bash
bird query-ids --fresh
```

Çıkış kodları:
- `0`: başarı
- `1`: çalışma zamanı hatası (ağ/kimlik doğrulama/vb.)
- `2`: geçersiz kullanım/doğrulama (örn. hatalı `--user` handle'ı)

## Sürüm

`bird --version`, mevcut olduğunda `package.json` sürümü artı mevcut git sha'yı yazdırır, örn. `0.3.0 (3df7969b)`.

## Medya Yüklemeleri

- `--media` (tekrarlanabilir) ve her öğe için isteğe bağlı `--alt` ile medya ekleyin.
- 4 resim/GIF'e kadar veya 1 video (karıştırma yok). Desteklenen: jpg, jpeg, png, webp, gif, mp4, mov.
- Resimler/GIF'ler + 1 video desteklenir (Twitter eski yükleme uç noktası + çerezler aracılığıyla yükler; videonun işlenmesi daha uzun sürebilir).

Örnek:

```bash
bird tweet "merhaba" --media resim.png --alt "açıklama"
```

## Geliştirme

```bash
cd ~/Projects/bird
pnpm install
pnpm run build       # dist/ + bun ikili dosyası
pnpm run build:dist  # sadece dist/
pnpm run build:binary

pnpm run dev tweet "Test"
pnpm run dev -- --plain check
pnpm test
pnpm run lint
```

## Notlar

- GraphQL dahili X uç noktalarını kullanır ve hız sınırlamasına tabi olabilir (429).
- Sorgu kimlikleri değişir; çalışma zamanında `bird query-ids --fresh` ile yenileyin (veya yerleşik temeli `pnpm run graphql:update` ile güncelleyin).
