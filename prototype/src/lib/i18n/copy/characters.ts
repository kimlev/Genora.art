import type { Locale } from "@/lib/i18n/types";

export type CharacterUiCopy = {
  nav: string;
  title: string;
  subtitle: string;
  create: string;
  count: (used: number, limit: number) => string;
  freeBuilds: (remaining: number) => string;
  empty: string;
  modalTitle: string;
  name: string;
  namePlaceholder: string;
  consent: string;
  photosTitle: string;
  photosLead: string;
  free: string;
  portrait: string;
  portraitHint: string;
  profile: string;
  profileHint: string;
  fullBody: string;
  fullBodyHint: string;
  guideTitle: string;
  guideLead: string;
  cancel: string;
  build: string;
  building: string;
  ready: string;
  failed: string;
  retry: string;
  usePhoto: string;
  useVideo: string;
  choose: string;
  manage: string;
  noReady: string;
  nameError: string;
  photosError: string;
  consentError: string;
  limitError: string;
  genericError: string;
  personalMode: string;
  aiMode: string;
  aiDescription: string;
  aiDescriptionPlaceholder: string;
  descriptionError: string;
};

type CharacterWords = Omit<CharacterUiCopy, "count" | "freeBuilds" | "personalMode" | "aiMode" | "aiDescription" | "aiDescriptionPlaceholder" | "descriptionError">;

const aiWords: Record<Locale, Pick<CharacterUiCopy, "personalMode" | "aiMode" | "aiDescription" | "aiDescriptionPlaceholder" | "descriptionError">> = {
  ru:{personalMode:"Личный персонаж",aiMode:"AI персонаж",aiDescription:"Описание персонажа",aiDescriptionPlaceholder:"Возраст, пол, цвет волос, рост, одежда, особые приметы и желаемый стиль",descriptionError:"Опишите персонажа — от 10 до 2000 символов."},
  en:{personalMode:"Personal character",aiMode:"AI character",aiDescription:"Character description",aiDescriptionPlaceholder:"Age, gender, hair color, height, clothing, distinguishing features and desired style",descriptionError:"Describe the character in 10–2000 characters."},
  zh:{personalMode:"真人角色",aiMode:"AI 角色",aiDescription:"角色描述",aiDescriptionPlaceholder:"年龄、性别、发色、身高、服装、显著特征和风格",descriptionError:"请用10至2000个字符描述角色。"}, hi:{personalMode:"व्यक्तिगत पात्र",aiMode:"AI पात्र",aiDescription:"पात्र का विवरण",aiDescriptionPlaceholder:"उम्र, लिंग, बालों का रंग, कद, कपड़े, खास निशान और शैली",descriptionError:"पात्र का वर्णन 10–2000 अक्षरों में करें।"},
  es:{personalMode:"Personaje personal",aiMode:"Personaje IA",aiDescription:"Descripción del personaje",aiDescriptionPlaceholder:"Edad, género, color de pelo, altura, ropa, rasgos distintivos y estilo",descriptionError:"Describe el personaje con 10–2000 caracteres."}, fr:{personalMode:"Personnage personnel",aiMode:"Personnage IA",aiDescription:"Description du personnage",aiDescriptionPlaceholder:"Âge, genre, couleur des cheveux, taille, tenue, signes distinctifs et style",descriptionError:"Décrivez le personnage en 10 à 2000 caractères."},
  ar:{personalMode:"شخصية حقيقية",aiMode:"شخصية بالذكاء الاصطناعي",aiDescription:"وصف الشخصية",aiDescriptionPlaceholder:"العمر والجنس ولون الشعر والطول والملابس والسمات المميزة والأسلوب",descriptionError:"صِف الشخصية في 10 إلى 2000 حرف."}, pt:{personalMode:"Personagem pessoal",aiMode:"Personagem IA",aiDescription:"Descrição da personagem",aiDescriptionPlaceholder:"Idade, género, cor do cabelo, altura, roupa, traços distintivos e estilo",descriptionError:"Descreva a personagem em 10–2000 caracteres."},
  de:{personalMode:"Persönlicher Charakter",aiMode:"KI-Charakter",aiDescription:"Charakterbeschreibung",aiDescriptionPlaceholder:"Alter, Geschlecht, Haarfarbe, Größe, Kleidung, Merkmale und Stil",descriptionError:"Beschreibe den Charakter mit 10–2000 Zeichen."}, ja:{personalMode:"個人キャラクター",aiMode:"AIキャラクター",aiDescription:"キャラクターの説明",aiDescriptionPlaceholder:"年齢、性別、髪色、身長、服装、特徴、希望するスタイル",descriptionError:"10〜2000文字でキャラクターを説明してください。"},
  it:{personalMode:"Personaggio personale",aiMode:"Personaggio IA",aiDescription:"Descrizione del personaggio",aiDescriptionPlaceholder:"Età, genere, colore dei capelli, altezza, abbigliamento, segni distintivi e stile",descriptionError:"Descrivi il personaggio in 10–2000 caratteri."}, ko:{personalMode:"개인 캐릭터",aiMode:"AI 캐릭터",aiDescription:"캐릭터 설명",aiDescriptionPlaceholder:"나이, 성별, 머리색, 키, 의상, 특징 및 원하는 스타일",descriptionError:"캐릭터를 10~2000자로 설명하세요."},
  tr:{personalMode:"Kişisel karakter",aiMode:"AI karakter",aiDescription:"Karakter açıklaması",aiDescriptionPlaceholder:"Yaş, cinsiyet, saç rengi, boy, kıyafet, ayırt edici özellikler ve stil",descriptionError:"Karakteri 10–2000 karakterle açıklayın."}, pl:{personalMode:"Postać osobista",aiMode:"Postać AI",aiDescription:"Opis postaci",aiDescriptionPlaceholder:"Wiek, płeć, kolor włosów, wzrost, ubiór, cechy szczególne i styl",descriptionError:"Opisz postać w 10–2000 znakach."},
  nl:{personalMode:"Persoonlijk personage",aiMode:"AI-personage",aiDescription:"Beschrijving van personage",aiDescriptionPlaceholder:"Leeftijd, geslacht, haarkleur, lengte, kleding, kenmerken en stijl",descriptionError:"Beschrijf het personage in 10–2000 tekens."}, sv:{personalMode:"Personlig karaktär",aiMode:"AI-karaktär",aiDescription:"Karaktärsbeskrivning",aiDescriptionPlaceholder:"Ålder, kön, hårfärg, längd, kläder, kännetecken och stil",descriptionError:"Beskriv karaktären med 10–2000 tecken."},
  cs:{personalMode:"Osobní postava",aiMode:"AI postava",aiDescription:"Popis postavy",aiDescriptionPlaceholder:"Věk, pohlaví, barva vlasů, výška, oblečení, zvláštní znaky a styl",descriptionError:"Popište postavu 10–2000 znaky."}, el:{personalMode:"Προσωπικός χαρακτήρας",aiMode:"Χαρακτήρας AI",aiDescription:"Περιγραφή χαρακτήρα",aiDescriptionPlaceholder:"Ηλικία, φύλο, χρώμα μαλλιών, ύψος, ρούχα, ιδιαίτερα χαρακτηριστικά και στυλ",descriptionError:"Περιγράψτε τον χαρακτήρα με 10–2000 χαρακτήρες."},
  ro:{personalMode:"Personaj personal",aiMode:"Personaj AI",aiDescription:"Descrierea personajului",aiDescriptionPlaceholder:"Vârstă, gen, culoarea părului, înălțime, haine, semne distinctive și stil",descriptionError:"Descrieți personajul în 10–2000 de caractere."},
};

const en: CharacterWords = {
  nav: "Characters", title: "Characters", subtitle: "Your reusable identity from three photos for consistent images and videos.", create: "Create character",
  empty: "No characters yet. Create the first one from a close-up, a side profile, and a full-body photo.", modalTitle: "New character", name: "Name", namePlaceholder: "For example: Anna",
  consent: "I confirm these are my personal photos or I have the depicted person's written consent. I agree that the selected external AI provider may process them.", photosTitle: "Character photos", photosLead: "Upload three views of the same adult person. They are stored as separate references.", free: "FREE",
  portrait: "Portrait", portraitHint: "face close-up, straight on", profile: "Profile", profileHint: "face from the side", fullBody: "Full body", fullBodyHint: "person fully visible",
  guideTitle: "How to photograph a character", guideLead: "Use the same person, even light, no filters, and an unobstructed face. The three images remain separate; the generated angle sheet is only a visual card.",
  cancel: "Cancel", build: "Build for free", building: "Building…", ready: "Ready", failed: "Error", retry: "Try again", usePhoto: "Create photo", useVideo: "Create video",
  choose: "Use character", manage: "Manage characters", noReady: "Create a character first", nameError: "Enter 2–30 characters.", photosError: "Upload all three required photos.",
  consentError: "Confirm that you have permission to use these photos.", limitError: "One free character is already available.", genericError: "Could not create the character. Please try again.",
};

const ru: CharacterWords = {
  nav: "Персонажи", title: "Персонажи", subtitle: "Ваш постоянный образ из трёх фото для создания узнаваемых фотографий и видео.", create: "Создать персонажа",
  empty: "Пока нет ни одного персонажа. Для первого понадобятся крупный портрет, профиль и фото в полный рост.", modalTitle: "Новый персонаж", name: "Имя", namePlaceholder: "Например: Анна",
  consent: "Я подтверждаю, что это мои личные фотографии или у меня есть письменное согласие изображённого человека. Я разрешаю обработку выбранным внешним поставщиком ИИ-модели.", photosTitle: "Фото персонажа", photosLead: "Загрузите три ракурса одного совершеннолетнего человека. Они сохраняются отдельными референсами.", free: "БЕСПЛАТНО",
  portrait: "Портрет", portraitHint: "лицо крупно, анфас", profile: "Профиль", profileHint: "лицо сбоку", fullBody: "Полный рост", fullBodyHint: "человек целиком",
  guideTitle: "Как сфотографировать персонажа", guideLead: "Один человек, ровный свет, без фильтров и закрытого лица. Три фото остаются отдельными; созданная сетка ракурсов служит визуальной карточкой.",
  cancel: "Отмена", build: "Собрать бесплатно", building: "Собираем…", ready: "Готов", failed: "Ошибка", retry: "Попробовать ещё раз", usePhoto: "Создать фото", useVideo: "Создать видео",
  choose: "Использовать персонажа", manage: "Управление персонажами", noReady: "Сначала создайте персонажа", nameError: "Введите от 2 до 30 символов.", photosError: "Загрузите все три обязательных фото.",
  consentError: "Подтвердите согласие на использование фотографий.", limitError: "Один бесплатный персонаж уже создан.", genericError: "Не удалось создать персонажа. Попробуйте ещё раз.",
};

const localized: Partial<Record<Locale, Partial<CharacterWords>>> = {
  zh: { nav:"角色",title:"角色",subtitle:"用三张照片创建可重复使用的人物形象，用于一致的图片和视频。",create:"创建角色",empty:"还没有角色。请上传正面特写、侧面和全身照。",modalTitle:"新角色",name:"名称",namePlaceholder:"例如：安娜",consent:"这些是我的照片，或我已获得本人同意",photosTitle:"角色照片",photosLead:"上传同一成年人的三个角度，照片会作为独立参考保存。",free:"免费",portrait:"正面肖像",portraitHint:"面部特写，正视",profile:"侧面",profileHint:"面部侧视",fullBody:"全身",fullBodyHint:"完整人物",guideTitle:"如何拍摄角色",guideLead:"同一人物、均匀光线、无滤镜且面部无遮挡。三张照片保持独立，角度网格仅作视觉卡片。",cancel:"取消",build:"免费创建",building:"创建中…",ready:"已完成",failed:"错误",retry:"重试",usePhoto:"创建图片",useVideo:"创建视频",choose:"使用角色",manage:"管理角色",noReady:"请先创建角色",nameError:"请输入2到30个字符。",photosError:"请上传全部三张照片。",consentError:"请确认照片使用授权。",limitError:"已创建一个免费角色。",genericError:"无法创建角色，请重试。" },
  hi: { nav:"पात्र",title:"पात्र",subtitle:"एक जैसे फ़ोटो और वीडियो के लिए तीन तस्वीरों से बना पुन: उपयोग योग्य रूप।",create:"पात्र बनाएँ",empty:"अभी कोई पात्र नहीं है। सामने का क्लोज़-अप, साइड प्रोफ़ाइल और पूरे शरीर की फ़ोटो अपलोड करें।",modalTitle:"नया पात्र",name:"नाम",namePlaceholder:"जैसे: अन्ना",consent:"ये मेरी तस्वीरें हैं या मेरे पास व्यक्ति की अनुमति है",photosTitle:"पात्र की तस्वीरें",photosLead:"एक ही वयस्क व्यक्ति के तीन दृश्य अपलोड करें; वे अलग संदर्भ के रूप में सहेजे जाते हैं।",free:"मुफ़्त",portrait:"पोर्ट्रेट",portraitHint:"चेहरे का क्लोज़-अप, सामने",profile:"प्रोफ़ाइल",profileHint:"चेहरा बगल से",fullBody:"पूरा शरीर",fullBodyHint:"पूरा व्यक्ति",guideTitle:"पात्र की तस्वीर कैसे लें",guideLead:"एक ही व्यक्ति, समान रोशनी, बिना फ़िल्टर और खुला चेहरा। तीनों फ़ोटो अलग रहती हैं; कोणों की ग्रिड केवल दृश्य कार्ड है।",cancel:"रद्द करें",build:"मुफ़्त बनाएँ",building:"बना रहे हैं…",ready:"तैयार",failed:"त्रुटि",retry:"फिर कोशिश करें",usePhoto:"फ़ोटो बनाएँ",useVideo:"वीडियो बनाएँ",choose:"पात्र उपयोग करें",manage:"पात्र प्रबंधित करें",noReady:"पहले पात्र बनाएँ",nameError:"2–30 अक्षर दर्ज करें।",photosError:"तीनों आवश्यक तस्वीरें अपलोड करें।",consentError:"तस्वीरें उपयोग करने की अनुमति की पुष्टि करें।",limitError:"एक मुफ़्त पात्र पहले से उपलब्ध है।",genericError:"पात्र नहीं बन सका। फिर कोशिश करें।" },
  es: { nav:"Personajes",title:"Personajes",subtitle:"Tu identidad reutilizable creada con tres fotos para imágenes y vídeos coherentes.",create:"Crear personaje",empty:"Aún no hay personajes. Sube un primer plano frontal, un perfil y una foto de cuerpo entero.",modalTitle:"Nuevo personaje",name:"Nombre",namePlaceholder:"Por ejemplo: Ana",consent:"Son mis fotos o tengo permiso de la persona",photosTitle:"Fotos del personaje",photosLead:"Sube tres vistas de la misma persona adulta; se guardan como referencias separadas.",free:"GRATIS",portrait:"Retrato",portraitHint:"primer plano, de frente",profile:"Perfil",profileHint:"rostro de lado",fullBody:"Cuerpo entero",fullBodyHint:"persona completa",guideTitle:"Cómo fotografiar al personaje",guideLead:"La misma persona, luz uniforme, sin filtros y con el rostro visible. Las tres fotos quedan separadas; la cuadrícula es solo la tarjeta visual.",cancel:"Cancelar",build:"Crear gratis",building:"Creando…",ready:"Listo",failed:"Error",retry:"Reintentar",usePhoto:"Crear foto",useVideo:"Crear vídeo",choose:"Usar personaje",manage:"Gestionar personajes",noReady:"Crea primero un personaje",nameError:"Introduce entre 2 y 30 caracteres.",photosError:"Sube las tres fotos obligatorias.",consentError:"Confirma el permiso para usar las fotos.",limitError:"Ya tienes un personaje gratuito.",genericError:"No se pudo crear el personaje. Inténtalo de nuevo." },
  fr: { nav:"Personnages",title:"Personnages",subtitle:"Votre identité réutilisable créée à partir de trois photos pour des images et vidéos cohérentes.",create:"Créer un personnage",empty:"Aucun personnage. Ajoutez un gros plan de face, un profil et une photo en pied.",modalTitle:"Nouveau personnage",name:"Nom",namePlaceholder:"Par exemple : Anna",consent:"Ce sont mes photos ou j’ai l’autorisation de la personne",photosTitle:"Photos du personnage",photosLead:"Ajoutez trois vues de la même personne adulte, conservées comme références distinctes.",free:"GRATUIT",portrait:"Portrait",portraitHint:"visage de près, de face",profile:"Profil",profileHint:"visage de côté",fullBody:"En pied",fullBodyHint:"personne entière",guideTitle:"Comment photographier le personnage",guideLead:"Même personne, lumière uniforme, sans filtre et visage dégagé. Les trois photos restent séparées ; la grille sert uniquement de fiche visuelle.",cancel:"Annuler",build:"Créer gratuitement",building:"Création…",ready:"Prêt",failed:"Erreur",retry:"Réessayer",usePhoto:"Créer une photo",useVideo:"Créer une vidéo",choose:"Utiliser le personnage",manage:"Gérer les personnages",noReady:"Créez d’abord un personnage",nameError:"Saisissez 2 à 30 caractères.",photosError:"Ajoutez les trois photos requises.",consentError:"Confirmez l’autorisation d’utiliser ces photos.",limitError:"Un personnage gratuit existe déjà.",genericError:"Impossible de créer le personnage. Réessayez." },
  de: { nav:"Charaktere",title:"Charaktere",subtitle:"Deine wiederverwendbare Identität aus drei Fotos für einheitliche Bilder und Videos.",create:"Charakter erstellen",empty:"Noch kein Charakter. Lade Nahaufnahme, Seitenprofil und Ganzkörperfoto hoch.",modalTitle:"Neuer Charakter",name:"Name",namePlaceholder:"Zum Beispiel: Anna",consent:"Es sind meine Fotos oder ich habe die Erlaubnis der Person",photosTitle:"Charakterfotos",photosLead:"Lade drei Ansichten derselben erwachsenen Person hoch; sie bleiben getrennte Referenzen.",free:"KOSTENLOS",portrait:"Porträt",portraitHint:"Gesicht nah, frontal",profile:"Profil",profileHint:"Gesicht von der Seite",fullBody:"Ganzkörper",fullBodyHint:"Person vollständig",guideTitle:"So fotografierst du den Charakter",guideLead:"Dieselbe Person, gleichmäßiges Licht, keine Filter und freies Gesicht. Die drei Fotos bleiben getrennt; das Raster ist nur die visuelle Karte.",cancel:"Abbrechen",build:"Kostenlos erstellen",building:"Wird erstellt…",ready:"Fertig",failed:"Fehler",retry:"Erneut versuchen",usePhoto:"Foto erstellen",useVideo:"Video erstellen",choose:"Charakter verwenden",manage:"Charaktere verwalten",noReady:"Erstelle zuerst einen Charakter",nameError:"2–30 Zeichen eingeben.",photosError:"Alle drei Pflichtfotos hochladen.",consentError:"Bestätige die Erlaubnis zur Nutzung der Fotos.",limitError:"Ein kostenloser Charakter ist bereits vorhanden.",genericError:"Charakter konnte nicht erstellt werden. Bitte erneut versuchen." },
  pt: { nav:"Personagens",title:"Personagens",subtitle:"A sua identidade reutilizável criada com três fotos para imagens e vídeos consistentes.",create:"Criar personagem",empty:"Ainda não há personagens. Envie um retrato frontal, um perfil e uma foto de corpo inteiro.",modalTitle:"Nova personagem",name:"Nome",namePlaceholder:"Por exemplo: Ana",consent:"As fotos são minhas ou tenho autorização da pessoa",photosTitle:"Fotos da personagem",photosLead:"Envie três vistas da mesma pessoa adulta; ficam guardadas como referências separadas.",free:"GRÁTIS",portrait:"Retrato",portraitHint:"rosto de perto, frontal",profile:"Perfil",profileHint:"rosto de lado",fullBody:"Corpo inteiro",fullBodyHint:"pessoa completa",guideTitle:"Como fotografar a personagem",guideLead:"A mesma pessoa, luz uniforme, sem filtros e rosto descoberto. As três fotos ficam separadas; a grelha é apenas o cartão visual.",cancel:"Cancelar",build:"Criar grátis",building:"A criar…",ready:"Pronto",failed:"Erro",retry:"Tentar novamente",usePhoto:"Criar foto",useVideo:"Criar vídeo",choose:"Usar personagem",manage:"Gerir personagens",noReady:"Crie primeiro uma personagem",nameError:"Introduza 2–30 caracteres.",photosError:"Envie as três fotos obrigatórias.",consentError:"Confirme a autorização para usar as fotos.",limitError:"Já existe uma personagem gratuita.",genericError:"Não foi possível criar a personagem. Tente novamente." },
  it: { nav:"Personaggi",title:"Personaggi",subtitle:"La tua identità riutilizzabile creata da tre foto per immagini e video coerenti.",create:"Crea personaggio",empty:"Nessun personaggio. Carica un primo piano frontale, un profilo e una foto a figura intera.",modalTitle:"Nuovo personaggio",name:"Nome",namePlaceholder:"Ad esempio: Anna",consent:"Le foto sono mie o ho il consenso della persona",photosTitle:"Foto del personaggio",photosLead:"Carica tre viste della stessa persona adulta; vengono salvate come riferimenti separati.",free:"GRATIS",portrait:"Ritratto",portraitHint:"viso in primo piano, frontale",profile:"Profilo",profileHint:"viso di lato",fullBody:"Figura intera",fullBodyHint:"persona completa",guideTitle:"Come fotografare il personaggio",guideLead:"Stessa persona, luce uniforme, niente filtri e viso scoperto. Le tre foto restano separate; la griglia è solo la scheda visiva.",cancel:"Annulla",build:"Crea gratis",building:"Creazione…",ready:"Pronto",failed:"Errore",retry:"Riprova",usePhoto:"Crea foto",useVideo:"Crea video",choose:"Usa personaggio",manage:"Gestisci personaggi",noReady:"Crea prima un personaggio",nameError:"Inserisci 2–30 caratteri.",photosError:"Carica tutte e tre le foto richieste.",consentError:"Conferma il consenso all’uso delle foto.",limitError:"È già disponibile un personaggio gratuito.",genericError:"Impossibile creare il personaggio. Riprova." },
};

const simpleNav: Partial<Record<Locale, [string, string]>> = {
  ar:["الشخصيات","أنشئ هوية قابلة لإعادة الاستخدام من ثلاث صور لصور وفيديوهات متناسقة."], ja:["キャラクター","3枚の写真から、画像や動画で繰り返し使える人物参照を作成します。"], ko:["캐릭터","사진 3장으로 이미지와 영상에 재사용할 수 있는 인물 참조를 만듭니다."], tr:["Karakterler","Tutarlı görsel ve videolar için üç fotoğraftan yeniden kullanılabilir kimlik oluşturun."], pl:["Postacie","Utwórz z trzech zdjęć wielokrotny wzorzec postaci do spójnych obrazów i filmów."], nl:["Personages","Maak uit drie foto's een herbruikbare identiteit voor consistente beelden en video's."], sv:["Karaktärer","Skapa en återanvändbar identitet från tre foton för konsekventa bilder och videor."], cs:["Postavy","Vytvořte ze tří fotografií opakovaně použitelnou identitu pro konzistentní obrázky a videa."], el:["Χαρακτήρες","Δημιουργήστε από τρεις φωτογραφίες μια επαναχρησιμοποιήσιμη ταυτότητα για συνεπείς εικόνες και βίντεο."], ro:["Personaje","Creați din trei fotografii o identitate reutilizabilă pentru imagini și videoclipuri consecvente."],
};

const writtenConsents: Record<Locale, string> = {
  ru: "Я подтверждаю, что это мои личные фотографии или у меня есть письменное согласие изображённого человека. Я разрешаю обработку выбранным внешним поставщиком ИИ-модели.",
  en: "I confirm these are my personal photos or I have the depicted person's written consent. I agree that the selected external AI provider may process them.",
  zh: "我确认这些是我的个人照片，或我已获得被摄者的书面同意，并同意由所选外部 AI 服务商处理。",
  hi: "मैं पुष्टि करता/करती हूँ कि ये मेरी निजी तस्वीरें हैं या मेरे पास दिखाए गए व्यक्ति की लिखित सहमति है। मैं चुने गए बाहरी AI प्रदाता द्वारा इनके प्रसंस्करण की अनुमति देता/देती हूँ।",
  es: "Confirmo que son mis fotos personales o que tengo el consentimiento escrito de la persona. Autorizo su tratamiento por el proveedor externo de IA elegido.",
  fr: "Je confirme qu’il s’agit de mes photos personnelles ou que j’ai l’accord écrit de la personne. J’autorise leur traitement par le fournisseur d’IA externe choisi.",
  ar: "أؤكد أن هذه صوري الشخصية أو أن لدي موافقة خطية من الشخص الظاهر، وأوافق على معالجتها لدى مزود الذكاء الاصطناعي الخارجي المختار.",
  pt: "Confirmo que são as minhas fotos pessoais ou que tenho o consentimento escrito da pessoa. Autorizo o processamento pelo fornecedor externo de IA escolhido.",
  de: "Ich bestätige, dass dies meine persönlichen Fotos sind oder mir die schriftliche Einwilligung der abgebildeten Person vorliegt. Ich erlaube die Verarbeitung durch den gewählten externen KI-Anbieter.",
  ja: "自分の写真であるか、写っている本人の書面による同意を得ていることを確認し、選択した外部AI事業者による処理に同意します。",
  it: "Confermo che sono mie foto personali o che ho il consenso scritto della persona ritratta. Autorizzo il trattamento da parte del fornitore IA esterno scelto.",
  ko: "본인의 개인 사진이거나 사진 속 인물의 서면 동의를 받았음을 확인하며, 선택한 외부 AI 제공업체의 처리를 허용합니다.",
  tr: "Bunların kişisel fotoğraflarım olduğunu veya görüntüdeki kişinin yazılı iznini aldığımı onaylıyor, seçilen harici yapay zekâ sağlayıcısının işlemesine izin veriyorum.",
  pl: "Potwierdzam, że są to moje prywatne zdjęcia albo mam pisemną zgodę przedstawionej osoby. Zezwalam na ich przetwarzanie przez wybranego zewnętrznego dostawcę AI.",
  nl: "Ik bevestig dat dit mijn persoonlijke foto's zijn of dat ik schriftelijke toestemming van de afgebeelde persoon heb. Ik sta verwerking door de gekozen externe AI-provider toe.",
  sv: "Jag bekräftar att detta är mina privata foton eller att jag har skriftligt samtycke från personen på bilden. Jag godkänner behandling hos vald extern AI-leverantör.",
  cs: "Potvrzuji, že jde o mé osobní fotografie nebo že mám písemný souhlas zobrazené osoby. Souhlasím se zpracováním vybraným externím poskytovatelem AI.",
  el: "Επιβεβαιώνω ότι είναι προσωπικές μου φωτογραφίες ή ότι έχω γραπτή συγκατάθεση του εικονιζόμενου. Επιτρέπω την επεξεργασία από τον επιλεγμένο εξωτερικό πάροχο AI.",
  ro: "Confirm că sunt fotografiile mele personale sau că am acordul scris al persoanei din imagine. Permit prelucrarea de către furnizorul extern AI selectat.",
};

const characterNameErrors: Record<Locale, string> = {
  ru: "Введите от 3 до 25 символов.",
  en: "Enter 3–25 characters.",
  zh: "请输入3到25个字符。",
  hi: "3–25 अक्षर दर्ज करें।",
  es: "Introduce entre 3 y 25 caracteres.",
  fr: "Saisissez 3 à 25 caractères.",
  ar: "أدخل من 3 إلى 25 حرفًا.",
  pt: "Introduza 3–25 caracteres.",
  de: "3–25 Zeichen eingeben.",
  ja: "3〜25文字で入力してください。",
  it: "Inserisci da 3 a 25 caratteri.",
  ko: "3~25자로 입력하세요.",
  tr: "3–25 karakter girin.",
  pl: "Wpisz od 3 do 25 znaków.",
  nl: "Voer 3–25 tekens in.",
  sv: "Ange 3–25 tecken.",
  cs: "Zadejte 3–25 znaků.",
  el: "Εισαγάγετε 3–25 χαρακτήρες.",
  ro: "Introduceți 3–25 de caractere.",
};

export function characterUiCopy(locale: Locale): CharacterUiCopy {
  const base = locale === "ru" ? ru : en;
  const nav = simpleNav[locale];
  const words: CharacterWords = { ...base, ...(localized[locale] ?? {}), consent: writtenConsents[locale], nameError: characterNameErrors[locale], ...(nav ? { nav: nav[0], title: nav[0], subtitle: nav[1] } : {}) };
  return {
    ...words,
    ...aiWords[locale],
    count: (used) => locale === "ru" ? `Персонажей: ${used}` : `${words.title}: ${used}`,
    freeBuilds: (remaining) => locale === "ru" ? `Бесплатных сборок: ${remaining}` : `Free builds: ${remaining}`,
  };
}
