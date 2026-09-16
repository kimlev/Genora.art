import type { Locale } from "@/lib/i18n/types";
import type { StudioVideoMode, VideoSound } from "@/lib/catalog/video-studio";

export const VIDEO_AGENT_TAGS = [
  "intro",
  "ai-dances",
  "promo",
  "entertainment",
  "animate-photo",
  "luxury-life",
  "birthday",
  "background",
] as const;

export type VideoAgentTag = (typeof VIDEO_AGENT_TAGS)[number];
export type VideoAgentFilterTag = "all" | VideoAgentTag;
export type VideoAgentReferenceRole = "first-frame" | "reference" | "last-frame";
export type VideoAgentReferenceInput = {
  slot?: number;
  kind: "image" | "video";
  role: VideoAgentReferenceRole;
  url: string;
  previewUrl?: string | null;
};

export type VideoAgentSettings = {
  duration: number;
  resolution: string;
  aspectRatio: string;
  sound: VideoSound;
  style: string;
};

export type VideoAgentGuide = {
  goodImageUrl: string;
  badImageUrl: string;
  uploadFromGuide?: boolean;
};

export type VideoAgentDefaults = {
  id: string;
  tag: VideoAgentTag;
  providerId: string;
  modelId: string;
  videoMode: StudioVideoMode;
  videoUrl: string;
  videoPreviewUrl: string;
  coverUrl: string;
  promptPlaceholder: string;
  referenceInputs: VideoAgentReferenceInput[];
  videoSettings: VideoAgentSettings;
  guide?: VideoAgentGuide;
  minUserReferences?: number;
  maxUserReferences?: number;
};

const weatherRoot = "/agents/video/weather-change";
const glassesLogoRoot = "/agents/video/glasses-logo-promo";
const angelRoot = "/agents/video/angel";

export const VIDEO_AGENT_DEFAULTS: Record<string, VideoAgentDefaults> = {
  "weather-change": {
    id: "weather-change",
    tag: "background",
    providerId: "google",
    modelId: "omni-1.1-flash",
    videoMode: "v2v",
    videoUrl: `${weatherRoot}/weather-change.mp4`,
    videoPreviewUrl: `${weatherRoot}/weather-change-preview.mp4`,
    coverUrl: `${weatherRoot}/weather-change-poster.webp`,
    promptPlaceholder: "Укажите, какую погоду создать",
    referenceInputs: [],
    videoSettings: { duration: 8, resolution: "720p", aspectRatio: "9:16", sound: "off", style: "auto" },
  },
  "glasses-logo-promo": {
    id: "glasses-logo-promo",
    tag: "promo",
    providerId: "bytedance",
    modelId: "seedance-2.0-fast",
    videoMode: "t2v",
    videoUrl: `${glassesLogoRoot}/glasses-logo-promo.mp4`,
    videoPreviewUrl: `${glassesLogoRoot}/glasses-logo-promo-preview.m4v`,
    coverUrl: `${glassesLogoRoot}/glasses-logo-promo-poster.jpg`,
    promptPlaceholder: "Укажите только название бренда",
    referenceInputs: [],
    videoSettings: { duration: 10, resolution: "480p", aspectRatio: "1:1", sound: "on", style: "auto" },
  },
  angel: {
    id: "angel",
    tag: "entertainment",
    providerId: "bytedance",
    modelId: "seedance-2.0-fast",
    videoMode: "i2v",
    videoUrl: `${angelRoot}/angel.mp4`,
    videoPreviewUrl: `${angelRoot}/angel-preview.m4v`,
    coverUrl: `${angelRoot}/angel-poster.jpg`,
    promptPlaceholder: "Загрузите фото или выберите персонажа в полный рост",
    referenceInputs: [],
    videoSettings: { duration: 6, resolution: "480p", aspectRatio: "9:16", sound: "on", style: "auto" },
    guide: {
      goodImageUrl: `${angelRoot}/angel-reference-good.jpg`,
      badImageUrl: `${angelRoot}/angel-reference-bad.jpg`,
      uploadFromGuide: true,
    },
    minUserReferences: 1,
    maxUserReferences: 1,
  },
};

export type VideoAgentCopy = {
  name: string;
  description: string;
  placeholder: string;
  guideNotice?: string;
  goodHint?: string;
  badHint?: string;
};

const WEATHER_COPY: Record<Locale, VideoAgentCopy> = {
  ru: { name: "Смена погоды", description: "Меняет погоду в готовом видео, сохраняя сцену и статичную камеру.", placeholder: "Укажите, какую погоду создать" },
  en: { name: "Weather Change", description: "Changes the weather in an existing video while preserving the scene and locked camera.", placeholder: "Describe the weather to create" },
  zh: { name: "天气变换", description: "在保留场景和固定机位的同时改变现有视频中的天气。", placeholder: "请描述要生成的天气" },
  hi: { name: "मौसम बदलाव", description: "दृश्य और स्थिर कैमरा बनाए रखते हुए वीडियो का मौसम बदलता है।", placeholder: "बनाने वाला मौसम बताएं" },
  es: { name: "Cambio de clima", description: "Cambia el clima de un vídeo manteniendo la escena y la cámara fija.", placeholder: "Indica qué clima crear" },
  fr: { name: "Changement météo", description: "Change la météo d’une vidéo en conservant la scène et la caméra fixe.", placeholder: "Indiquez la météo à créer" },
  ar: { name: "تغيير الطقس", description: "يغيّر الطقس في فيديو جاهز مع الحفاظ على المشهد وثبات الكاميرا.", placeholder: "صف الطقس المطلوب" },
  pt: { name: "Mudança do clima", description: "Altera o clima de um vídeo mantendo a cena e a câmera fixa.", placeholder: "Indique o clima desejado" },
  de: { name: "Wetterwechsel", description: "Ändert das Wetter in einem Video und erhält Szene sowie feste Kamera.", placeholder: "Gewünschtes Wetter angeben" },
  ja: { name: "天候変更", description: "シーンと固定カメラを維持したまま動画の天候を変更します。", placeholder: "作成する天候を入力" },
  it: { name: "Cambio meteo", description: "Cambia il meteo di un video mantenendo scena e camera fissa.", placeholder: "Indica il meteo da creare" },
  ko: { name: "날씨 변경", description: "장면과 고정 카메라를 유지하면서 기존 영상의 날씨를 바꿉니다.", placeholder: "만들 날씨를 입력하세요" },
  tr: { name: "Hava değişimi", description: "Sahneyi ve sabit kamerayı koruyarak videodaki havayı değiştirir.", placeholder: "Oluşturulacak havayı yazın" },
  pl: { name: "Zmiana pogody", description: "Zmienia pogodę w filmie, zachowując scenę i nieruchomą kamerę.", placeholder: "Podaj pogodę do utworzenia" },
  nl: { name: "Weerwissel", description: "Verandert het weer in een video met behoud van scène en vaste camera.", placeholder: "Beschrijf het gewenste weer" },
  sv: { name: "Väderbyte", description: "Ändrar vädret i en video men behåller scenen och den fasta kameran.", placeholder: "Ange vilket väder som ska skapas" },
  cs: { name: "Změna počasí", description: "Změní počasí ve videu a zachová scénu i statickou kameru.", placeholder: "Uveďte požadované počasí" },
  el: { name: "Αλλαγή καιρού", description: "Αλλάζει τον καιρό σε βίντεο, διατηρώντας τη σκηνή και τη σταθερή κάμερα.", placeholder: "Περιγράψτε τον επιθυμητό καιρό" },
  ro: { name: "Schimbare meteo", description: "Schimbă vremea într-un videoclip, păstrând scena și camera fixă.", placeholder: "Indică vremea dorită" },
};

const GLASSES_LOGO_COPY: Record<Locale, VideoAgentCopy> = {
  ru: { name: "Лого на очках", description: "Создаёт модное промо очков с названием бренда на линзах и дужках.", placeholder: "Укажите только название бренда" },
  en: { name: "Logo Glasses", description: "Creates a fashion eyewear promo with the brand name on the lenses and temples.", placeholder: "Enter the brand name only" },
  zh: { name: "眼镜品牌", description: "制作时尚眼镜宣传片，在镜片和镜腿上展示品牌名称。", placeholder: "仅输入品牌名称" },
  hi: { name: "लोगो चश्मा", description: "लेंस और डंडियों पर ब्रांड नाम वाला फैशन आईवियर प्रोमो बनाता है।", placeholder: "केवल ब्रांड नाम लिखें" },
  es: { name: "Logo en gafas", description: "Crea una promo de gafas con el nombre de marca en lentes y patillas.", placeholder: "Escribe solo el nombre de la marca" },
  fr: { name: "Logo lunettes", description: "Crée une publicité mode avec le nom de marque sur les verres et les branches.", placeholder: "Saisissez uniquement le nom de la marque" },
  ar: { name: "شعار النظارات", description: "ينشئ إعلان نظارات عصرياً باسم العلامة على العدسات والأذرع.", placeholder: "أدخل اسم العلامة فقط" },
  pt: { name: "Logo nos óculos", description: "Cria um promo de óculos com o nome da marca nas lentes e hastes.", placeholder: "Indique apenas o nome da marca" },
  de: { name: "Brillenlogo", description: "Erstellt einen Brillen-Spot mit dem Markennamen auf Gläsern und Bügeln.", placeholder: "Nur den Markennamen eingeben" },
  ja: { name: "眼鏡ロゴ", description: "レンズとテンプルにブランド名を入れた眼鏡プロモを作成します。", placeholder: "ブランド名だけを入力" },
  it: { name: "Logo occhiali", description: "Crea un promo moda con il marchio su lenti e aste.", placeholder: "Inserisci solo il nome del marchio" },
  ko: { name: "안경 로고", description: "렌즈와 안경 다리에 브랜드명이 보이는 패션 홍보 영상을 만듭니다.", placeholder: "브랜드명만 입력하세요" },
  tr: { name: "Gözlük logosu", description: "Cam ve saplarda marka adı bulunan moda gözlük tanıtımı oluşturur.", placeholder: "Yalnızca marka adını yazın" },
  pl: { name: "Logo okularów", description: "Tworzy modową reklamę okularów z nazwą marki na szkłach i zausznikach.", placeholder: "Wpisz tylko nazwę marki" },
  nl: { name: "Brillenlogo", description: "Maakt een modepromo met de merknaam op glazen en pootjes.", placeholder: "Vul alleen de merknaam in" },
  sv: { name: "Glasögonlogo", description: "Skapar en modepromo med varumärket på glas och skalmar.", placeholder: "Ange endast varumärket" },
  cs: { name: "Logo brýlí", description: "Vytvoří módní promo s názvem značky na sklech a stranicích.", placeholder: "Zadejte pouze název značky" },
  el: { name: "Λογότυπο γυαλιών", description: "Δημιουργεί προωθητικό γυαλιών με την επωνυμία στους φακούς και τους βραχίονες.", placeholder: "Γράψτε μόνο την επωνυμία" },
  ro: { name: "Logo pe ochelari", description: "Creează un promo de modă cu numele mărcii pe lentile și brațe.", placeholder: "Introdu doar numele mărcii" },
};

const ANGEL_COPY: Record<Locale, VideoAgentCopy> = {
  ru: { name: "Ангел", description: "Превращает человека с фото в кинематографичный образ ангела на шоссе.", placeholder: "Загрузите фото или выберите персонажа в полный рост", guideNotice: "Нужно одно фото или карточка персонажа в полный рост: голова и обувь должны целиком попадать в кадр.", goodHint: "Хорошо: человек виден полностью, лицо чёткое, руки и ноги не обрезаны.", badHint: "Плохо: портрет по плечи, селфи или кадр без ног.", },
  en: { name: "Angel", description: "Turns the person in a photo into a cinematic angel on a highway.", placeholder: "Upload a full-body photo or choose a character", guideNotice: "Use one full-body photo or character card with the entire head and shoes visible.", goodHint: "Good: the whole person is visible, with a clear face, hands, and feet.", badHint: "Bad: head-and-shoulders portrait, selfie, or cropped legs." },
  zh: { name: "天使", description: "把照片中的人物变成公路上的电影感天使。", placeholder: "上传全身照或选择角色", guideNotice: "请使用一张完整显示头部和鞋子的全身照或角色卡。", goodHint: "正确：人物全身、脸、手和脚都清晰可见。", badHint: "错误：肩部肖像、自拍或腿部被裁切。" },
  hi: { name: "फ़रिश्ता", description: "फोटो के व्यक्ति को राजमार्ग पर सिनेमाई फ़रिश्ते में बदलता है।", placeholder: "पूरे शरीर की फोटो अपलोड करें या पात्र चुनें", guideNotice: "एक पूरे शरीर की फोटो या पात्र कार्ड दें जिसमें सिर और जूते पूरे दिखें।", goodHint: "अच्छा: चेहरा, हाथ और पैर सहित पूरा व्यक्ति दिखे।", badHint: "खराब: केवल कंधों तक चित्र, सेल्फी या कटे पैर।" },
  es: { name: "Ángel", description: "Convierte a la persona de la foto en un ángel cinematográfico en una autopista.", placeholder: "Sube una foto de cuerpo entero o elige un personaje", guideNotice: "Usa una foto de cuerpo entero o una ficha con cabeza y calzado completos.", goodHint: "Bien: se ven con claridad rostro, manos, cuerpo y pies.", badHint: "Mal: retrato de hombros, selfie o piernas recortadas." },
  fr: { name: "Ange", description: "Transforme la personne en ange cinématographique sur une autoroute.", placeholder: "Importez une photo en pied ou choisissez un personnage", guideNotice: "Utilisez une photo en pied ou une fiche où la tête et les chaussures sont entières.", goodHint: "Bien : visage, mains, corps et pieds sont visibles.", badHint: "Mal : portrait aux épaules, selfie ou jambes coupées." },
  ar: { name: "ملاك", description: "يحوّل الشخص في الصورة إلى ملاك سينمائي على طريق سريع.", placeholder: "ارفع صورة كاملة للجسم أو اختر شخصية", guideNotice: "استخدم صورة كاملة أو بطاقة شخصية تظهر الرأس والحذاء بالكامل.", goodHint: "جيد: يظهر الشخص كاملاً مع وضوح الوجه واليدين والقدمين.", badHint: "سيئ: صورة للكتفين أو سيلفي أو أرجل مقصوصة." },
  pt: { name: "Anjo", description: "Transforma a pessoa da foto num anjo cinematográfico numa autoestrada.", placeholder: "Carregue uma foto de corpo inteiro ou escolha uma personagem", guideNotice: "Use uma foto de corpo inteiro ou cartão com cabeça e sapatos completos.", goodHint: "Bom: rosto, mãos, corpo e pés totalmente visíveis.", badHint: "Mau: retrato aos ombros, selfie ou pernas cortadas." },
  de: { name: "Engel", description: "Verwandelt die Person im Foto in einen filmischen Engel auf einer Autobahn.", placeholder: "Ganzkörperfoto hochladen oder Figur wählen", guideNotice: "Ein Ganzkörperfoto oder eine Figurenkarte mit vollständigem Kopf und Schuhen verwenden.", goodHint: "Gut: Gesicht, Hände, Körper und Füße sind klar sichtbar.", badHint: "Schlecht: Schulterporträt, Selfie oder abgeschnittene Beine." },
  ja: { name: "天使", description: "写真の人物を高速道路に立つ映画的な天使へ変えます。", placeholder: "全身写真をアップロードするかキャラクターを選択", guideNotice: "頭から靴まで完全に写る全身写真またはキャラクターカードを使用してください。", goodHint: "良い例：顔、手、足を含む全身が鮮明です。", badHint: "悪い例：肩までの写真、セルフィー、脚が切れた写真。" },
  it: { name: "Angelo", description: "Trasforma la persona della foto in un angelo cinematografico in autostrada.", placeholder: "Carica una foto intera o scegli un personaggio", guideNotice: "Usa una foto intera o una scheda con testa e scarpe completamente visibili.", goodHint: "Bene: volto, mani, corpo e piedi sono visibili.", badHint: "Male: ritratto alle spalle, selfie o gambe tagliate." },
  ko: { name: "천사", description: "사진 속 인물을 고속도로 위의 영화 같은 천사로 바꿉니다.", placeholder: "전신 사진을 업로드하거나 캐릭터를 선택하세요", guideNotice: "머리부터 신발까지 온전히 보이는 전신 사진이나 캐릭터 카드를 사용하세요.", goodHint: "좋음: 얼굴, 손, 몸, 발이 모두 선명하게 보입니다.", badHint: "나쁨: 어깨 사진, 셀카 또는 잘린 다리." },
  tr: { name: "Melek", description: "Fotoğraftaki kişiyi otoyolda sinematik bir meleğe dönüştürür.", placeholder: "Tam boy fotoğraf yükleyin veya karakter seçin", guideNotice: "Baş ve ayakkabıların tamamen göründüğü tam boy fotoğraf veya karakter kartı kullanın.", goodHint: "İyi: yüz, eller, vücut ve ayaklar net görünür.", badHint: "Kötü: omuz portresi, selfie veya kesilmiş bacaklar." },
  pl: { name: "Anioł", description: "Zmienia osobę ze zdjęcia w filmowego anioła na autostradzie.", placeholder: "Dodaj zdjęcie całej sylwetki lub wybierz postać", guideNotice: "Użyj zdjęcia całej sylwetki lub karty postaci z widoczną głową i obuwiem.", goodHint: "Dobrze: wyraźnie widać twarz, dłonie, ciało i stopy.", badHint: "Źle: portret do ramion, selfie lub ucięte nogi." },
  nl: { name: "Engel", description: "Verandert de persoon op de foto in een filmische engel op een snelweg.", placeholder: "Upload een volledige foto of kies een personage", guideNotice: "Gebruik een volledige foto of personagekaart met hoofd en schoenen in beeld.", goodHint: "Goed: gezicht, handen, lichaam en voeten zijn duidelijk zichtbaar.", badHint: "Fout: schouderportret, selfie of afgesneden benen." },
  sv: { name: "Ängel", description: "Förvandlar personen på fotot till en filmisk ängel på en motorväg.", placeholder: "Ladda upp en helkroppsbild eller välj en karaktär", guideNotice: "Använd en helkroppsbild eller karaktärskort där huvud och skor syns helt.", goodHint: "Bra: ansikte, händer, kropp och fötter syns tydligt.", badHint: "Dåligt: axelporträtt, selfie eller beskurna ben." },
  cs: { name: "Anděl", description: "Promění osobu na fotografii ve filmového anděla na dálnici.", placeholder: "Nahrajte fotografii celé postavy nebo vyberte postavu", guideNotice: "Použijte fotografii celé postavy nebo kartu s celou hlavou a obuví.", goodHint: "Dobře: jasně je vidět obličej, ruce, tělo i chodidla.", badHint: "Špatně: portrét po ramena, selfie nebo oříznuté nohy." },
  el: { name: "Άγγελος", description: "Μετατρέπει το άτομο της φωτογραφίας σε κινηματογραφικό άγγελο σε αυτοκινητόδρομο.", placeholder: "Ανεβάστε ολόσωμη φωτογραφία ή επιλέξτε χαρακτήρα", guideNotice: "Χρησιμοποιήστε ολόσωμη φωτογραφία ή κάρτα με ολόκληρο κεφάλι και παπούτσια.", goodHint: "Σωστό: πρόσωπο, χέρια, σώμα και πόδια φαίνονται καθαρά.", badHint: "Λάθος: πορτρέτο ώμων, selfie ή κομμένα πόδια." },
  ro: { name: "Înger", description: "Transformă persoana din fotografie într-un înger cinematografic pe autostradă.", placeholder: "Încarcă o fotografie completă sau alege un personaj", guideNotice: "Folosește o fotografie completă sau un card cu capul și încălțămintea integral vizibile.", goodHint: "Bine: fața, mâinile, corpul și picioarele se văd clar.", badHint: "Rău: portret până la umeri, selfie sau picioare tăiate." },
};

const VIDEO_TAG_COPY: Record<Locale, Record<VideoAgentFilterTag, string>> = {
  ru: { all: "Все", intro: "Интро", "ai-dances": "ИИ танцы", promo: "Промо", entertainment: "Развлечения", "animate-photo": "Оживи фото", "luxury-life": "Роскошная жизнь", birthday: "С днём рождения", background: "Работа с фоном" },
  en: { all: "All", intro: "Intro", "ai-dances": "AI dances", promo: "Promo", entertainment: "Entertainment", "animate-photo": "Animate photo", "luxury-life": "Luxury life", birthday: "Happy birthday", background: "Background editing" },
  zh: { all: "全部", intro: "片头", "ai-dances": "AI 舞蹈", promo: "宣传", entertainment: "娱乐", "animate-photo": "照片动起来", "luxury-life": "奢华生活", birthday: "生日快乐", background: "背景处理" },
  hi: { all: "सभी", intro: "इंट्रो", "ai-dances": "AI डांस", promo: "प्रोमो", entertainment: "मनोरंजन", "animate-photo": "फोटो जीवंत करें", "luxury-life": "शानदार जीवन", birthday: "जन्मदिन मुबारक", background: "बैकग्राउंड संपादन" },
  es: { all: "Todos", intro: "Intro", "ai-dances": "Bailes IA", promo: "Promo", entertainment: "Entretenimiento", "animate-photo": "Animar foto", "luxury-life": "Vida de lujo", birthday: "Feliz cumpleaños", background: "Editar fondo" },
  fr: { all: "Tous", intro: "Intro", "ai-dances": "Danses IA", promo: "Promo", entertainment: "Divertissement", "animate-photo": "Animer une photo", "luxury-life": "Vie de luxe", birthday: "Joyeux anniversaire", background: "Modifier le fond" },
  ar: { all: "الكل", intro: "مقدمة", "ai-dances": "رقصات الذكاء", promo: "ترويجي", entertainment: "ترفيه", "animate-photo": "تحريك الصورة", "luxury-life": "حياة فاخرة", birthday: "عيد ميلاد سعيد", background: "تعديل الخلفية" },
  pt: { all: "Todos", intro: "Intro", "ai-dances": "Danças IA", promo: "Promo", entertainment: "Entretenimento", "animate-photo": "Animar foto", "luxury-life": "Vida de luxo", birthday: "Feliz aniversário", background: "Editar fundo" },
  de: { all: "Alle", intro: "Intro", "ai-dances": "KI-Tänze", promo: "Promo", entertainment: "Unterhaltung", "animate-photo": "Foto animieren", "luxury-life": "Luxusleben", birthday: "Geburtstag", background: "Hintergrund bearbeiten" },
  ja: { all: "すべて", intro: "イントロ", "ai-dances": "AIダンス", promo: "プロモ", entertainment: "エンタメ", "animate-photo": "写真を動かす", "luxury-life": "ラグジュアリー", birthday: "誕生日", background: "背景編集" },
  it: { all: "Tutti", intro: "Intro", "ai-dances": "Danze IA", promo: "Promo", entertainment: "Intrattenimento", "animate-photo": "Anima foto", "luxury-life": "Vita di lusso", birthday: "Buon compleanno", background: "Modifica sfondo" },
  ko: { all: "전체", intro: "인트로", "ai-dances": "AI 댄스", promo: "프로모", entertainment: "엔터테인먼트", "animate-photo": "사진 애니메이션", "luxury-life": "럭셔리 라이프", birthday: "생일 축하", background: "배경 편집" },
  tr: { all: "Tümü", intro: "Giriş", "ai-dances": "AI dansları", promo: "Tanıtım", entertainment: "Eğlence", "animate-photo": "Fotoğrafı canlandır", "luxury-life": "Lüks yaşam", birthday: "Doğum günü", background: "Arka plan düzenleme" },
  pl: { all: "Wszystkie", intro: "Intro", "ai-dances": "Tańce AI", promo: "Promo", entertainment: "Rozrywka", "animate-photo": "Ożyw zdjęcie", "luxury-life": "Luksusowe życie", birthday: "Urodziny", background: "Edycja tła" },
  nl: { all: "Alles", intro: "Intro", "ai-dances": "AI-dansen", promo: "Promo", entertainment: "Entertainment", "animate-photo": "Foto animeren", "luxury-life": "Luxe leven", birthday: "Verjaardag", background: "Achtergrond bewerken" },
  sv: { all: "Alla", intro: "Intro", "ai-dances": "AI-danser", promo: "Reklam", entertainment: "Underhållning", "animate-photo": "Animera foto", "luxury-life": "Lyxliv", birthday: "Födelsedag", background: "Redigera bakgrund" },
  cs: { all: "Vše", intro: "Intro", "ai-dances": "AI tance", promo: "Promo", entertainment: "Zábava", "animate-photo": "Oživit fotku", "luxury-life": "Luxusní život", birthday: "Narozeniny", background: "Úprava pozadí" },
  el: { all: "Όλα", intro: "Εισαγωγή", "ai-dances": "Χοροί AI", promo: "Προώθηση", entertainment: "Ψυχαγωγία", "animate-photo": "Ζωντάνεμα φωτογραφίας", "luxury-life": "Πολυτελής ζωή", birthday: "Γενέθλια", background: "Επεξεργασία φόντου" },
  ro: { all: "Toate", intro: "Intro", "ai-dances": "Dansuri AI", promo: "Promo", entertainment: "Divertisment", "animate-photo": "Animează fotografia", "luxury-life": "Viață de lux", birthday: "La mulți ani", background: "Editare fundal" },
};

export function videoAgentDefaults(id: string): VideoAgentDefaults | null {
  return VIDEO_AGENT_DEFAULTS[id] ?? null;
}

export function videoAgentCopy(id: string, locale: string): VideoAgentCopy | null {
  const copy = id === "weather-change"
    ? WEATHER_COPY
    : id === "glasses-logo-promo"
      ? GLASSES_LOGO_COPY
      : id === "angel"
        ? ANGEL_COPY
        : null;
  return copy?.[locale as Locale] ?? copy?.en ?? null;
}

export function videoAgentNeedsUserPrompt(id: string): boolean {
  return id !== "angel";
}

export function videoAgentMinUserReferences(id: string): number {
  return VIDEO_AGENT_DEFAULTS[id]?.minUserReferences ?? 0;
}

export function videoAgentTagLabel(locale: string, tag: VideoAgentFilterTag): string {
  return (VIDEO_TAG_COPY[locale as Locale] ?? VIDEO_TAG_COPY.en)[tag];
}
