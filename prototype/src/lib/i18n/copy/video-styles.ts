import type { Locale } from "@/lib/i18n/types";

export type VideoStyleId = "cinematic" | "handheld" | "commercial" | "anime" | "night" | "nature" | "product" | "cartoon" | "stylized3d";

export type VideoStyleCopy = {
  id: VideoStyleId;
  label: string;
  description: string;
  prompt: string;
};

const styles: Record<Locale, VideoStyleCopy[]> = {
  ru: [
    { id: "cinematic", label: "Кино", description: "Плавная камера, киношный свет и глубина кадра.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Репортаж", description: "Живая ручная камера, как у оператора на месте.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Реклама", description: "Чистый глянцевый ролик для продукта или бренда.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Аниме", description: "Яркая анимация, чёткие линии и динамичные сцены.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Ночь", description: "Неон, контраст и атмосфера вечернего города.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Природа", description: "Мягкий свет, пейзаж и спокойное движение.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Предмет", description: "Крупный план вещи: фактура, блики, медленный объезд.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  en: [
    { id: "cinematic", label: "Cinema", description: "Smooth camera, film light, and depth.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportage", description: "A live handheld camera, as if on location.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Ad", description: "A clean glossy clip for a product or brand.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Bright animation, clear lines, dynamic scenes.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Night", description: "Neon, contrast, and a night-city mood.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Nature", description: "Soft light, landscape, and calm motion.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Product", description: "A close-up of an object: texture, highlights, a slow orbit.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  zh: [
    { id: "cinematic", label: "电影", description: "平滑运镜、电影光和景深。", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "纪实", description: "现场手持镜头，像在拍摄现场。", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "广告", description: "干净光亮的产品或品牌短片。", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "动漫", description: "鲜明动画、清晰线条和动态场面。", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "夜景", description: "霓虹、对比和夜城氛围。", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "自然", description: "柔光、风景和缓慢运动。", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "产品", description: "物品特写：质感、高光、缓慢环绕。", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  hi: [
    { id: "cinematic", label: "सिनेमा", description: "चिकना कैमरा, फिल्मी रोशनी और गहराई।", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "रिपोर्ट", description: "लाइव हैंडहेल्ड कैमरा, जैसे मौके पर।", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "विज्ञापन", description: "उत्पाद या ब्रांड के लिए चमकदार क्लिप।", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "एनिमे", description: "चमकीली एनिमेशन, साफ रेखाएँ, गति।", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "रात", description: "नियॉन, कंट्रास्ट और रात का शहर।", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "प्रकृति", description: "नरम रोशनी, परिदृश्य, शांत गति।", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "उत्पाद", description: "वस्तु का क्लोज़-अप: बनावट और धीमा चक्कर।", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  es: [
    { id: "cinematic", label: "Cine", description: "Cámara suave, luz de cine y profundidad.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportaje", description: "Cámara en mano, como en el lugar.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Anuncio", description: "Clip brillante para un producto o marca.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Animación viva, líneas claras y escenas dinámicas.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Noche", description: "Neón, contraste y ambiente de ciudad.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Naturaleza", description: "Luz suave, paisaje y movimiento calmo.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Producto", description: "Primer plano: textura, brillos y órbita lenta.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  fr: [
    { id: "cinematic", label: "Cinéma", description: "Caméra fluide, lumière de film et profondeur.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportage", description: "Caméra à l’épaule, comme sur place.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Pub", description: "Clip lisse pour un produit ou une marque.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Animé", description: "Animation vive, traits nets, scènes dynamiques.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Nuit", description: "Néon, contraste et ambiance de ville.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Nature", description: "Lumière douce, paysage et mouvement calme.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Objet", description: "Gros plan : matière, reflets, orbite lente.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  ar: [
    { id: "cinematic", label: "سينما", description: "كاميرا سلسة وإضاءة فيلم وعمق.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "تقرير", description: "كاميرا محمولة حية كما في الموقع.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "إعلان", description: "مقطع لامع لمنتج أو علامة.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "أنمي", description: "رسوم زاهية وخطوط واضحة وحركة.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "ليل", description: "نيون وتباين وأجواء مدينة ليلية.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "طبيعة", description: "ضوء ناعم ومنظر وحركة هادئة.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "منتج", description: "لقطة قريبة: ملمس ولمعان ودوران بطيء.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  pt: [
    { id: "cinematic", label: "Cinema", description: "Câmara suave, luz de filme e profundidade.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportagem", description: "Câmara na mão, como no local.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Anúncio", description: "Clipe brilhante para produto ou marca.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Animação viva, linhas claras e cenas dinâmicas.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Noite", description: "Néon, contraste e clima de cidade.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Natureza", description: "Luz suave, paisagem e movimento calmo.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Produto", description: "Close: textura, brilhos e órbita lenta.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  de: [
    { id: "cinematic", label: "Kino", description: "Weiche Kamera, Filmlicht und Tiefe.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportage", description: "Live-Handkamera, wie vor Ort.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Werbung", description: "Glatter Clip für Produkt oder Marke.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Helle Animation, klare Linien, Dynamik.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Nacht", description: "Neon, Kontrast und Stadtstimmung.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Natur", description: "Weiches Licht, Landschaft, ruhige Bewegung.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Produkt", description: "Nahaufnahme: Textur, Glanz, langsame Orbit.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  ja: [
    { id: "cinematic", label: "映画", description: "滑らかなカメラ、映画照明、奥行き。", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "取材", description: "現場のような手持ちカメラ。", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "広告", description: "製品やブランド向けの艶のある映像。", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "アニメ", description: "鮮やかな線と動きのある場面。", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "夜", description: "ネオン、コントラスト、夜の街。", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "自然", description: "柔らかい光、風景、穏やかな動き。", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "商品", description: "質感とハイライト、ゆっくり周回。", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  it: [
    { id: "cinematic", label: "Cinema", description: "Camera fluida, luce da film e profondità.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportage", description: "Camera a mano, come sul posto.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Spot", description: "Clip lucida per un prodotto o un brand.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Animazione viva, linee chiare, scene dinamiche.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Notte", description: "Neon, contrasto e atmosfera di città.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Natura", description: "Luce morbida, paesaggio e moto calmo.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Prodotto", description: "Primo piano: texture, riflessi, orbita lenta.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  ko: [
    { id: "cinematic", label: "영화", description: "부드러운 카메라, 영화 조명, 깊이.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "르포", description: "현장처럼 들고 찍는 카메라.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "광고", description: "제품·브랜드용 반짝이는 클립.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "애니", description: "선명한 선과 역동적인 장면.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "밤", description: "네온, 대비, 밤 도시 분위기.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "자연", description: "부드러운 빛, 풍경, 고요한 움직임.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "제품", description: "질감과 하이라이트, 느린 선회.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  tr: [
    { id: "cinematic", label: "Sinema", description: "Akıcı kamera, film ışığı ve derinlik.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Röportaj", description: "Sahadaymış gibi elde kamera.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Reklam", description: "Ürün veya marka için parlak klip.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Canlı animasyon, net çizgiler, hareket.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Gece", description: "Neon, kontrast ve gece şehri.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Doğa", description: "Yumuşak ışık, manzara, sakin hareket.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Ürün", description: "Yakın çekim: doku, ışıltı, yavaş tur.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  pl: [
    { id: "cinematic", label: "Kino", description: "Płynna kamera, światło filmowe i głębia.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportaż", description: "Kamera z ręki, jak na miejscu.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Reklama", description: "Błyszczący klip produktu lub marki.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Żywa animacja, czyste linie, dynamika.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Noc", description: "Neon, kontrast i klimat miasta.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Natura", description: "Miękkie światło, krajobraz, spokojny ruch.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Produkt", description: "Zbliżenie: faktura, błyski, powolny obieg.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  nl: [
    { id: "cinematic", label: "Film", description: "Vloeiende camera, filmlicht en diepte.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportage", description: "Handheld camera, alsof je erbij bent.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Reclame", description: "Gladde clip voor product of merk.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Felle animatie, heldere lijnen, dynamiek.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Nacht", description: "Neon, contrast en stadssfeer.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Natuur", description: "Zacht licht, landschap, kalme beweging.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Product", description: "Close-up: textuur, highlights, trage baan.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  sv: [
    { id: "cinematic", label: "Film", description: "Mjuk kamera, filmljus och djup.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportage", description: "Handkamera, som på plats.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Reklam", description: "Blank klipp för produkt eller varumärke.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Livlig animation, rena linjer, dynamik.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Natt", description: "Neon, kontrast och nattstad.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Natur", description: "Mjukt ljus, landskap, lugn rörelse.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Produkt", description: "Närbild: textur, ljus, långsam omlopp.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  cs: [
    { id: "cinematic", label: "Film", description: "Plynulá kamera, filmové světlo a hloubka.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportáž", description: "Ruční kamera jako na místě.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Reklama", description: "Lesklý klip produktu nebo značky.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Živá animace, čisté linky, dynamika.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Noc", description: "Neon, kontrast a nálada města.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Příroda", description: "Měkké světlo, krajina, klidný pohyb.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Produkt", description: "Detail: textura, odlesky, pomalá orbita.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  el: [
    { id: "cinematic", label: "Κινηματογράφος", description: "Ομαλή κάμερα, φως ταινίας και βάθος.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Ρεπορτάζ", description: "Κάμερα στο χέρι, σαν επί τόπου.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Διαφήμιση", description: "Γυαλιστερό κλιπ προϊόντος ή μάρκας.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Άνιμε", description: "Ζωντανή κίνηση, καθαρές γραμμές.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Νύχτα", description: "Νέον, αντίθεση και νυχτερινή πόλη.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Φύση", description: "Απαλό φως, τοπίο, ήρεμη κίνηση.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Προϊόν", description: "Κοντινό: υφή, λάμψεις, αργή τροχιά.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
  ro: [
    { id: "cinematic", label: "Cinema", description: "Cameră lină, lumină de film și adâncime.", prompt: "Cinematic camera, film lighting, shallow depth of field, smooth motion." },
    { id: "handheld", label: "Reportaj", description: "Cameră din mână, ca la fața locului.", prompt: "Handheld documentary camera, natural movement, real-world lighting." },
    { id: "commercial", label: "Reclamă", description: "Clip lucios pentru produs sau brand.", prompt: "Polished commercial video, clean studio look, product-ready lighting." },
    { id: "anime", label: "Anime", description: "Animație vie, linii clare, scene dinamice.", prompt: "Anime style animation, clear lines, vivid colors, dynamic motion." },
    { id: "night", label: "Noapte", description: "Neon, contrast și atmosferă de oraș.", prompt: "Night scene, neon lights, high contrast, atmospheric city mood." },
    { id: "nature", label: "Natură", description: "Lumină blândă, peisaj, mișcare calmă.", prompt: "Natural landscape, soft daylight, calm camera, organic motion." },
    { id: "product", label: "Produs", description: "Prim-plan: textură, reflexii, orbită lentă.", prompt: "Product close-up, material texture, slow orbit, studio highlights." },
  ],
};

const extra: Record<Locale, VideoStyleCopy[]> = {
  ru: [
    { id: "cartoon", label: "Мультяшный", description: "Классический 2D-мульт: контур, плоский цвет, весёлое движение.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D-мульт", description: "Современные объёмные герои, как в полнометражном мультфильме.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  en: [
    { id: "cartoon", label: "Cartoon", description: "Classic 2D cartoon: outline, flat color, playful motion.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Stylized 3D", description: "Modern 3D cartoon heroes, like a feature animation.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  zh: [
    { id: "cartoon", label: "卡通", description: "经典二维卡通：轮廓、平涂和活泼动作。", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "三维卡通", description: "现代立体卡通角色，像院线动画。", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  hi: [
    { id: "cartoon", label: "कार्टून", description: "क्लासिक 2D कार्टून: रेखा, सपाट रंग, मज़ेदार गति।", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D कार्टून", description: "आधुनिक त्रिआयामी कार्टून पात्र, जैसे फ़ीचर फ़िल्म।", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  es: [
    { id: "cartoon", label: "Caricatura", description: "Dibujo 2D clásico: contorno, color plano y movimiento alegre.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D estilizado", description: "Héroes 3D modernos, como en una película de animación.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  fr: [
    { id: "cartoon", label: "Cartoon", description: "Dessin 2D classique : contour, aplat, mouvement joyeux.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D stylisé", description: "Héros 3D modernes, comme un long métrage d’animation.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  ar: [
    { id: "cartoon", label: "كرتون", description: "كرتون ثنائي الأبعاد: خطوط وألوان مسطحة وحركة مرحة.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "كرتون ثلاثي", description: "شخصيات كرتونية مجسّمة بأسلوب فيلم رسوم حديث.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  pt: [
    { id: "cartoon", label: "Cartoon", description: "2D clássico: contorno, cor plana e movimento alegre.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D estilizado", description: "Heróis 3D modernos, como num filme de animação.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  de: [
    { id: "cartoon", label: "Cartoon", description: "Klassischer 2D-Cartoon: Kontur, Flächfarbe, spielerische Bewegung.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Stilisierte 3D", description: "Moderne 3D-Helden wie in einem Animationsfilm.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  ja: [
    { id: "cartoon", label: "カートゥーン", description: "クラシックな2D：輪郭、平塗、快活な動き。", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3Dカートゥーン", description: "劇場アニメのような現代的な立体キャラ。", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  it: [
    { id: "cartoon", label: "Cartoon", description: "2D classico: contorno, colore piatto, movimento giocoso.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D stilizzato", description: "Eroi 3D moderni, come in un film d’animazione.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  ko: [
    { id: "cartoon", label: "카툰", description: "클래식 2D: 윤곽, 평면색, 경쾌한 움직임.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D 카툰", description: "장편 애니메이션 같은 현대 입체 캐릭터.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  tr: [
    { id: "cartoon", label: "Çizgi film", description: "Klasik 2D: kontur, düz renk, neşeli hareket.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Stilize 3D", description: "Animasyon filmi gibi modern 3D kahramanlar.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  pl: [
    { id: "cartoon", label: "Kreskówka", description: "Klasyczny 2D: kontur, płaski kolor, radosny ruch.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Stylizowane 3D", description: "Nowoczesni bohaterowie 3D jak w filmie animowanym.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  nl: [
    { id: "cartoon", label: "Cartoon", description: "Klassieke 2D: omtrek, vlakke kleur, speelse beweging.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Gestileerde 3D", description: "Moderne 3D-helden, zoals in een animatiefilm.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  sv: [
    { id: "cartoon", label: "Tecknat", description: "Klassisk 2D: kontur, platt färg, lekfull rörelse.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Stilisera 3D", description: "Moderna 3D-hjältar som i en animerad långfilm.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  cs: [
    { id: "cartoon", label: "Kreslený", description: "Klasický 2D: obrys, plocha, hravé pohyby.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Stylizované 3D", description: "Moderní 3D hrdinové jako v animovaném filmu.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  el: [
    { id: "cartoon", label: "Καρτούν", description: "Κλασικό 2D: περίγραμμα, επίπεδα χρώματα, παιχνιδιάρικη κίνηση.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "Στυλιζαρισμένο 3D", description: "Μοντέρνοι 3D ήρωες σαν ταινία κινουμένων σχεδίων.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
  ro: [
    { id: "cartoon", label: "Desen", description: "2D clasic: contur, culoare plată, mișcare jucăușă.", prompt: "Classic 2D cartoon animation, bold outlines, flat colors, playful motion." },
    { id: "stylized3d", label: "3D stilizat", description: "Eroi 3D moderni, ca într-un film de animație.", prompt: "Stylized 3D cartoon characters, smooth CGI volumes, modern animated-feature look." },
  ],
};

export function videoStyles(locale: Locale): VideoStyleCopy[] {
  return [...(styles[locale] ?? styles.en), ...(extra[locale] ?? extra.en)];
}

export function videoStyleById(locale: Locale, id: string): VideoStyleCopy | undefined {
  return videoStyles(locale).find((item) => item.id === id);
}

const USER_DESCRIPTION_OPEN = "<user_description>";
const USER_DESCRIPTION_CLOSE = "</user_description>";

function originalVideoPrompt(prompt: string, stylePrompt: string) {
  const trimmed = prompt.trim();
  const canonicalStart = `${USER_DESCRIPTION_OPEN}\n`;
  const styleStart = `\n${USER_DESCRIPTION_CLOSE}\n<selected_video_style `;
  const styleIndex = trimmed.lastIndexOf(styleStart);
  if (trimmed.startsWith(canonicalStart) && styleIndex >= 0 && trimmed.endsWith("</selected_video_style>")) {
    return trimmed.slice(canonicalStart.length, styleIndex).trim();
  }
  const legacySuffix = `\n${stylePrompt}`;
  return trimmed.endsWith(legacySuffix) ? trimmed.slice(0, -legacySuffix.length).trim() : trimmed;
}

export function applyVideoStylePriority(prompt: string, locale: Locale, styleId: string) {
  const style = videoStyleById(locale, styleId);
  if (!style || styleId === "auto") return prompt.trim();
  const base = originalVideoPrompt(prompt, style.prompt);
  const priority = [
    `<selected_video_style id="${style.id}" priority="highest">`,
    style.prompt,
    "Apply this selected style to the entire video. It overrides any conflicting style, lighting, color, rendering, camera, motion, or atmosphere instructions in the user description.",
    "</selected_video_style>",
  ].join("\n");
  return base ? `${USER_DESCRIPTION_OPEN}\n${base}\n${USER_DESCRIPTION_CLOSE}\n${priority}` : priority;
}

export function videoStylePromptExtraChars(locale: Locale, styleId: string) {
  if (styleId === "auto") return 0;
  return Math.max(0, applyVideoStylePriority("x", locale, styleId).length - 1);
}
