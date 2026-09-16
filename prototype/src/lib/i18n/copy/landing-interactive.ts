import { isServedLocale, type ServedLocale } from "@/lib/i18n/served-locales";
import type { Locale } from "@/lib/i18n/types";

export type LandingInteractiveCopy = {
  hero: {
    subtitle: string;
    hitsTitle: string;
    hitsDescription: string;
    imagesExtra: string;
    textSubtitle: string;
    textExtra: string;
    textQuestion: string;
    textAnswer: string;
    videoTitle: string;
    videoDescription: string;
    videoExtra: string;
    videoNav: string;
    openFullscreen: string;
    fullscreenComing: string;
    close: string;
  };
  showcase: {
    bullets: readonly [string, string, string];
    agentDescription: string;
    memoryQuestion: string;
    memoryAnswer: string;
    battleTitle: string;
    battlePrompt: string;
    battleAnswerA: string;
    battleAnswerB: string;
    placeholder: string;
  };
};

export type LandingMediaBadges = { photo: string; ai: string };

const mediaBadges: Record<ServedLocale, LandingMediaBadges> = {
  ru: { photo: "Фото", ai: "ИИ" },
  en: { photo: "Photo", ai: "AI" },
  hi: { photo: "फ़ोटो", ai: "एआई" },
  es: { photo: "Foto", ai: "IA" },
  fr: { photo: "Photo", ai: "IA" },
  ar: { photo: "صورة", ai: "AI" },
  pt: { photo: "Foto", ai: "IA" },
  de: { photo: "Foto", ai: "KI" },
  it: { photo: "Foto", ai: "IA" },
  tr: { photo: "Fotoğraf", ai: "YZ" },
  pl: { photo: "Zdjęcie", ai: "AI" },
  sv: { photo: "Foto", ai: "AI" },
  cs: { photo: "Foto", ai: "AI" },
};

const copy: Record<ServedLocale, LandingInteractiveCopy> = {
  ru: {
    hero: { subtitle: "Всё для работы, творчества и идей.", hitsTitle: "Хиты", hitsDescription: "Пиши музыку, создавай треки и саундтреки", imagesExtra: "Твори сам или используй готовые шаблоны", textSubtitle: "Умные чаты с памятью", textExtra: "Получай ответы на любой вопрос", textQuestion: "Какая модель лучше для моей задачи?", textAnswer: "Genora.art подбирает подходящую модель и режим ответа, для экономии токенов, а еще чаты имеют встроенную память контекста диалога.", videoTitle: "Видео", videoDescription: "Делай ролики, которые удивляют", videoExtra: "Генерируй сцены, движения и визуальные истории", videoNav: "Перейти к разделу видео", openFullscreen: "Открыть на весь экран", fullscreenComing: "Полноформатный ролик будет установлен после получения видео", close: "Закрыть" },
    showcase: { bullets: ["Умные агенты доводят задачу до результата", "Память сохраняет факты и контекст между чатами", "Битва моделей помогает понять, какая модель лучше под ваш запрос"], agentDescription: "Разбирает видео на промт: загрузите ролик — получите готовый промт для генерации.", memoryQuestion: "Продолжим план запуска?", memoryAnswer: "Genora.art помнит важные факты и детали в ваших диалогах — не нужно повторять их в каждом новом чате.", battleTitle: "Битва моделей", battlePrompt: "Предложи слоган для нового продукта", battleAnswerA: "Идеи обретают форму.", battleAnswerB: "От замысла — к результату.", placeholder: "Написать..." },
  },
  en: {
    hero: { subtitle: "Everything for work, creativity, and ideas.", hitsTitle: "Hits", hitsDescription: "Write music, create tracks and soundtracks", imagesExtra: "Create freely or start from a ready-made template", textSubtitle: "Smart chats with memory", textExtra: "Get answers to any question", textQuestion: "Which model is best for my task?", textAnswer: "Genora.art selects the right model and response mode to save tokens, while chats have built-in memory for the conversation context.", videoTitle: "Video", videoDescription: "Create videos that stand out", videoExtra: "Generate scenes, motion, and visual stories", videoNav: "Go to the video section", openFullscreen: "Open fullscreen", fullscreenComing: "The full-length video will be added once it is available", close: "Close" },
    showcase: { bullets: ["Smart agents take tasks through to completion", "Memory preserves facts and context across chats", "Model Battle helps you find the best model for your request"], agentDescription: "Turns a video into a prompt: upload a clip and get a ready-to-use generation prompt.", memoryQuestion: "Shall we continue the launch plan?", memoryAnswer: "Genora.art remembers important facts and details from your conversations, so you do not need to repeat them in every new chat.", battleTitle: "Model Battle", battlePrompt: "Suggest a tagline for a new product", battleAnswerA: "Ideas take shape.", battleAnswerB: "From concept to result.", placeholder: "Type a message..." },
  },
  hi: {
    hero: { subtitle: "काम, रचनात्मकता और विचारों के लिए सब कुछ।", hitsTitle: "हिट्स", hitsDescription: "संगीत लिखें, ट्रैक और साउंडट्रैक बनाएँ", imagesExtra: "खुद बनाएँ या तैयार टेम्पलेट इस्तेमाल करें", textSubtitle: "मेमोरी वाले स्मार्ट चैट", textExtra: "किसी भी सवाल का जवाब पाएँ", textQuestion: "मेरे काम के लिए कौन-सा मॉडल बेहतर है?", textAnswer: "Genora.art टोकन बचाने के लिए सही मॉडल और उत्तर मोड चुनता है, और चैट में संवाद के संदर्भ की अंतर्निहित मेमोरी होती है।", videoTitle: "वीडियो", videoDescription: "ऐसे वीडियो बनाएँ जो प्रभावित करें", videoExtra: "दृश्य, गति और विज़ुअल कहानियाँ बनाएँ", videoNav: "वीडियो अनुभाग पर जाएँ", openFullscreen: "पूर्ण स्क्रीन में खोलें", fullscreenComing: "वीडियो मिलने के बाद पूर्ण संस्करण जोड़ा जाएगा", close: "बंद करें" },
    showcase: { bullets: ["स्मार्ट एजेंट काम को परिणाम तक पहुँचाते हैं", "मेमोरी चैट के बीच तथ्य और संदर्भ सहेजती है", "मॉडल बैटल आपके अनुरोध के लिए बेहतर मॉडल चुनने में मदद करता है"], agentDescription: "वीडियो को प्रॉम्प्ट में बदलता है: क्लिप अपलोड करें और तैयार जनरेशन प्रॉम्प्ट पाएँ।", memoryQuestion: "लॉन्च योजना जारी रखें?", memoryAnswer: "Genora.art आपके संवादों के महत्वपूर्ण तथ्य और विवरण याद रखता है—हर नई चैट में उन्हें दोहराने की ज़रूरत नहीं।", battleTitle: "मॉडल बैटल", battlePrompt: "नए उत्पाद के लिए टैगलाइन सुझाएँ", battleAnswerA: "विचार आकार लेते हैं।", battleAnswerB: "कल्पना से परिणाम तक।", placeholder: "संदेश लिखें..." },
  },
  es: {
    hero: { subtitle: "Todo para trabajar, crear y desarrollar ideas.", hitsTitle: "Éxitos", hitsDescription: "Escribe música y crea canciones y bandas sonoras", imagesExtra: "Crea desde cero o usa plantillas listas", textSubtitle: "Chats inteligentes con memoria", textExtra: "Obtén respuestas a cualquier pregunta", textQuestion: "¿Qué modelo es mejor para mi tarea?", textAnswer: "Genora.art selecciona el modelo y el modo de respuesta adecuados para ahorrar tokens, y los chats incorporan memoria del contexto de la conversación.", videoTitle: "Vídeo", videoDescription: "Crea vídeos que sorprenden", videoExtra: "Genera escenas, movimiento e historias visuales", videoNav: "Ir a la sección de vídeo", openFullscreen: "Abrir a pantalla completa", fullscreenComing: "El vídeo completo se añadirá cuando esté disponible", close: "Cerrar" },
    showcase: { bullets: ["Los agentes inteligentes llevan cada tarea hasta el resultado", "La memoria conserva datos y contexto entre chats", "La Batalla de modelos ayuda a elegir el mejor modelo para tu solicitud"], agentDescription: "Convierte un vídeo en un prompt: sube el clip y recibe un prompt listo para generar.", memoryQuestion: "¿Continuamos con el plan de lanzamiento?", memoryAnswer: "Genora.art recuerda los datos y detalles importantes de tus conversaciones: no tienes que repetirlos en cada chat nuevo.", battleTitle: "Batalla de modelos", battlePrompt: "Propón un eslogan para un producto nuevo", battleAnswerA: "Las ideas toman forma.", battleAnswerB: "De la idea al resultado.", placeholder: "Escribe un mensaje..." },
  },
  fr: {
    hero: { subtitle: "Tout pour travailler, créer et donner vie aux idées.", hitsTitle: "Hits", hitsDescription: "Écrivez de la musique, créez des titres et des bandes-son", imagesExtra: "Créez librement ou partez d’un modèle prêt à l’emploi", textSubtitle: "Des chats intelligents avec mémoire", textExtra: "Obtenez une réponse à chaque question", textQuestion: "Quel modèle convient le mieux à ma tâche ?", textAnswer: "Genora.art choisit le modèle et le mode de réponse adaptés pour économiser les jetons, tandis que les chats mémorisent le contexte de la conversation.", videoTitle: "Vidéo", videoDescription: "Créez des vidéos qui surprennent", videoExtra: "Générez des scènes, des mouvements et des histoires visuelles", videoNav: "Aller à la section vidéo", openFullscreen: "Ouvrir en plein écran", fullscreenComing: "La vidéo complète sera ajoutée dès qu’elle sera disponible", close: "Fermer" },
    showcase: { bullets: ["Des agents intelligents mènent chaque tâche jusqu’au résultat", "La mémoire conserve les faits et le contexte entre les chats", "La Bataille de modèles aide à trouver le meilleur modèle pour votre demande"], agentDescription: "Transforme une vidéo en prompt : importez le clip et obtenez un prompt de génération prêt à l’emploi.", memoryQuestion: "On poursuit le plan de lancement ?", memoryAnswer: "Genora.art mémorise les faits et détails importants de vos échanges : inutile de les répéter dans chaque nouveau chat.", battleTitle: "Bataille de modèles", battlePrompt: "Propose un slogan pour un nouveau produit", battleAnswerA: "Les idées prennent forme.", battleAnswerB: "De l’idée au résultat.", placeholder: "Écrire un message..." },
  },
  ar: {
    hero: { subtitle: "كل ما تحتاجه للعمل والإبداع والأفكار.", hitsTitle: "الأغاني الرائجة", hitsDescription: "اكتب الموسيقى وأنشئ المقاطع والموسيقى التصويرية", imagesExtra: "أنشئ بحرية أو استخدم قوالب جاهزة", textSubtitle: "دردشات ذكية بذاكرة", textExtra: "احصل على إجابة لأي سؤال", textQuestion: "ما النموذج الأنسب لمهمتي؟", textAnswer: "يختار Genora.art النموذج ووضع الإجابة المناسبين لتوفير الرموز، كما تتضمن الدردشات ذاكرة مدمجة لسياق الحوار.", videoTitle: "فيديو", videoDescription: "أنشئ مقاطع فيديو مبهرة", videoExtra: "أنشئ مشاهد وحركة وقصصًا بصرية", videoNav: "الانتقال إلى قسم الفيديو", openFullscreen: "فتح بملء الشاشة", fullscreenComing: "ستتم إضافة الفيديو الكامل عند توفره", close: "إغلاق" },
    showcase: { bullets: ["وكلاء أذكياء ينجزون المهمة حتى النتيجة", "الذاكرة تحفظ الحقائق والسياق بين الدردشات", "معركة النماذج تساعدك على معرفة النموذج الأفضل لطلبك"], agentDescription: "يحوّل الفيديو إلى مطالبة: حمّل المقطع واحصل على مطالبة جاهزة للتوليد.", memoryQuestion: "هل نتابع خطة الإطلاق؟", memoryAnswer: "يتذكر Genora.art الحقائق والتفاصيل المهمة في محادثاتك، فلا حاجة إلى تكرارها في كل دردشة جديدة.", battleTitle: "معركة النماذج", battlePrompt: "اقترح شعارًا لمنتج جديد", battleAnswerA: "الأفكار تتخذ شكلًا.", battleAnswerB: "من الفكرة إلى النتيجة.", placeholder: "اكتب رسالة..." },
  },
  pt: {
    hero: { subtitle: "Tudo para trabalhar, criar e desenvolver ideias.", hitsTitle: "Sucessos", hitsDescription: "Escreva música e crie faixas e bandas sonoras", imagesExtra: "Crie livremente ou use modelos prontos", textSubtitle: "Chats inteligentes com memória", textExtra: "Obtenha respostas para qualquer pergunta", textQuestion: "Qual modelo é melhor para a minha tarefa?", textAnswer: "O Genora.art seleciona o modelo e o modo de resposta adequados para poupar tokens, e os chats têm memória integrada do contexto da conversa.", videoTitle: "Vídeo", videoDescription: "Crie vídeos que surpreendem", videoExtra: "Gere cenas, movimento e histórias visuais", videoNav: "Ir para a secção de vídeo", openFullscreen: "Abrir em ecrã inteiro", fullscreenComing: "O vídeo completo será adicionado quando estiver disponível", close: "Fechar" },
    showcase: { bullets: ["Agentes inteligentes levam a tarefa até ao resultado", "A memória guarda factos e contexto entre chats", "A Batalha de modelos ajuda a descobrir o melhor modelo para o seu pedido"], agentDescription: "Transforma um vídeo num prompt: carregue o clipe e receba um prompt pronto para gerar.", memoryQuestion: "Continuamos o plano de lançamento?", memoryAnswer: "O Genora.art lembra-se dos factos e detalhes importantes das suas conversas — não precisa de os repetir em cada novo chat.", battleTitle: "Batalha de modelos", battlePrompt: "Sugira um slogan para um novo produto", battleAnswerA: "As ideias ganham forma.", battleAnswerB: "Da ideia ao resultado.", placeholder: "Escrever mensagem..." },
  },
  de: {
    hero: { subtitle: "Alles für Arbeit, Kreativität und Ideen.", hitsTitle: "Hits", hitsDescription: "Schreibe Musik und erstelle Tracks und Soundtracks", imagesExtra: "Gestalte frei oder nutze fertige Vorlagen", textSubtitle: "Intelligente Chats mit Gedächtnis", textExtra: "Erhalte Antworten auf jede Frage", textQuestion: "Welches Modell passt am besten zu meiner Aufgabe?", textAnswer: "Genora.art wählt das passende Modell und den Antwortmodus, um Tokens zu sparen; zugleich speichern Chats den Kontext des Gesprächs.", videoTitle: "Video", videoDescription: "Erstelle Videos, die überraschen", videoExtra: "Generiere Szenen, Bewegung und visuelle Geschichten", videoNav: "Zum Videobereich", openFullscreen: "Im Vollbild öffnen", fullscreenComing: "Das vollständige Video wird hinzugefügt, sobald es verfügbar ist", close: "Schließen" },
    showcase: { bullets: ["Intelligente Agenten führen Aufgaben bis zum Ergebnis", "Das Gedächtnis bewahrt Fakten und Kontext über Chats hinweg", "Der Modellvergleich zeigt, welches Modell am besten zu deiner Anfrage passt"], agentDescription: "Wandelt ein Video in einen Prompt um: Clip hochladen und einen fertigen Generierungs-Prompt erhalten.", memoryQuestion: "Sollen wir den Startplan fortsetzen?", memoryAnswer: "Genora.art merkt sich wichtige Fakten und Details aus deinen Gesprächen – du musst sie nicht in jedem neuen Chat wiederholen.", battleTitle: "Modellvergleich", battlePrompt: "Schlage einen Slogan für ein neues Produkt vor", battleAnswerA: "Ideen nehmen Gestalt an.", battleAnswerB: "Von der Idee zum Ergebnis.", placeholder: "Nachricht schreiben..." },
  },
  it: {
    hero: { subtitle: "Tutto per il lavoro, la creatività e le idee.", hitsTitle: "Hit", hitsDescription: "Scrivi musica e crea brani e colonne sonore", imagesExtra: "Crea liberamente o usa modelli già pronti", textSubtitle: "Chat intelligenti con memoria", textExtra: "Ottieni risposte a qualsiasi domanda", textQuestion: "Qual è il modello migliore per la mia attività?", textAnswer: "Genora.art seleziona il modello e la modalità di risposta più adatti per risparmiare token, mentre le chat conservano il contesto della conversazione.", videoTitle: "Video", videoDescription: "Crea video che sorprendono", videoExtra: "Genera scene, movimenti e storie visive", videoNav: "Vai alla sezione video", openFullscreen: "Apri a schermo intero", fullscreenComing: "Il video completo verrà aggiunto appena disponibile", close: "Chiudi" },
    showcase: { bullets: ["Gli agenti intelligenti portano ogni attività al risultato", "La memoria conserva fatti e contesto tra le chat", "La Sfida tra modelli aiuta a trovare il modello migliore per la tua richiesta"], agentDescription: "Trasforma un video in un prompt: carica il filmato e ottieni un prompt di generazione pronto all’uso.", memoryQuestion: "Continuiamo con il piano di lancio?", memoryAnswer: "Genora.art ricorda fatti e dettagli importanti delle tue conversazioni: non devi ripeterli in ogni nuova chat.", battleTitle: "Sfida tra modelli", battlePrompt: "Proponi uno slogan per un nuovo prodotto", battleAnswerA: "Le idee prendono forma.", battleAnswerB: "Dall’idea al risultato.", placeholder: "Scrivi un messaggio..." },
  },
  tr: {
    hero: { subtitle: "İş, yaratıcılık ve fikirler için her şey.", hitsTitle: "Hitler", hitsDescription: "Müzik yazın, parçalar ve film müzikleri oluşturun", imagesExtra: "Özgürce oluşturun veya hazır şablonları kullanın", textSubtitle: "Hafızalı akıllı sohbetler", textExtra: "Her soruya yanıt alın", textQuestion: "Görevim için hangi model daha iyi?", textAnswer: "Genora.art token tasarrufu için uygun modeli ve yanıt modunu seçer; sohbetler de konuşma bağlamını yerleşik hafızada tutar.", videoTitle: "Video", videoDescription: "Şaşırtan videolar oluşturun", videoExtra: "Sahneler, hareketler ve görsel hikâyeler üretin", videoNav: "Video bölümüne git", openFullscreen: "Tam ekran aç", fullscreenComing: "Tam uzunluktaki video hazır olduğunda eklenecek", close: "Kapat" },
    showcase: { bullets: ["Akıllı ajanlar görevi sonuca ulaştırır", "Hafıza, sohbetler arasında gerçekleri ve bağlamı korur", "Model Savaşı, isteğiniz için en iyi modeli bulmanıza yardımcı olur"], agentDescription: "Videoyu prompta dönüştürür: klibi yükleyin ve kullanıma hazır üretim promptunu alın.", memoryQuestion: "Lansman planına devam edelim mi?", memoryAnswer: "Genora.art konuşmalarınızdaki önemli gerçekleri ve ayrıntıları hatırlar; bunları her yeni sohbette tekrarlamanız gerekmez.", battleTitle: "Model Savaşı", battlePrompt: "Yeni bir ürün için slogan öner", battleAnswerA: "Fikirler şekil kazanır.", battleAnswerB: "Fikirden sonuca.", placeholder: "Mesaj yazın..." },
  },
  pl: {
    hero: { subtitle: "Wszystko do pracy, twórczości i rozwijania pomysłów.", hitsTitle: "Hity", hitsDescription: "Pisz muzykę, twórz utwory i ścieżki dźwiękowe", imagesExtra: "Twórz swobodnie lub korzystaj z gotowych szablonów", textSubtitle: "Inteligentne czaty z pamięcią", textExtra: "Uzyskaj odpowiedź na każde pytanie", textQuestion: "Który model najlepiej pasuje do mojego zadania?", textAnswer: "Genora.art wybiera odpowiedni model i tryb odpowiedzi, aby oszczędzać tokeny, a czaty mają wbudowaną pamięć kontekstu rozmowy.", videoTitle: "Wideo", videoDescription: "Twórz filmy, które zaskakują", videoExtra: "Generuj sceny, ruch i wizualne historie", videoNav: "Przejdź do sekcji wideo", openFullscreen: "Otwórz na pełnym ekranie", fullscreenComing: "Pełna wersja wideo zostanie dodana, gdy będzie dostępna", close: "Zamknij" },
    showcase: { bullets: ["Inteligentni agenci prowadzą zadanie aż do wyniku", "Pamięć zachowuje fakty i kontekst między czatami", "Bitwa modeli pomaga wybrać najlepszy model do Twojego zapytania"], agentDescription: "Zamienia wideo w prompt: prześlij klip i otrzymaj gotowy prompt do generowania.", memoryQuestion: "Kontynuujemy plan uruchomienia?", memoryAnswer: "Genora.art pamięta ważne fakty i szczegóły z rozmów — nie musisz powtarzać ich w każdym nowym czacie.", battleTitle: "Bitwa modeli", battlePrompt: "Zaproponuj hasło dla nowego produktu", battleAnswerA: "Pomysły nabierają kształtu.", battleAnswerB: "Od pomysłu do rezultatu.", placeholder: "Napisz wiadomość..." },
  },
  sv: {
    hero: { subtitle: "Allt för arbete, kreativitet och idéer.", hitsTitle: "Hits", hitsDescription: "Skriv musik och skapa låtar och soundtrack", imagesExtra: "Skapa fritt eller använd färdiga mallar", textSubtitle: "Smarta chattar med minne", textExtra: "Få svar på alla frågor", textQuestion: "Vilken modell passar bäst för min uppgift?", textAnswer: "Genora.art väljer rätt modell och svarsläge för att spara tokens, och chattarna har inbyggt minne för samtalets kontext.", videoTitle: "Video", videoDescription: "Skapa videor som överraskar", videoExtra: "Generera scener, rörelse och visuella berättelser", videoNav: "Gå till videosektionen", openFullscreen: "Öppna i helskärm", fullscreenComing: "Videon i full längd läggs till när den är tillgänglig", close: "Stäng" },
    showcase: { bullets: ["Smarta agenter tar uppgiften hela vägen till resultat", "Minnet bevarar fakta och kontext mellan chattar", "Modellkampen hjälper dig att hitta den bästa modellen för din fråga"], agentDescription: "Gör om en video till en prompt: ladda upp klippet och få en färdig genereringsprompt.", memoryQuestion: "Ska vi fortsätta med lanseringsplanen?", memoryAnswer: "Genora.art minns viktiga fakta och detaljer från dina samtal – du behöver inte upprepa dem i varje ny chatt.", battleTitle: "Modellkamp", battlePrompt: "Föreslå en slogan för en ny produkt", battleAnswerA: "Idéer tar form.", battleAnswerB: "Från idé till resultat.", placeholder: "Skriv ett meddelande..." },
  },
  cs: {
    hero: { subtitle: "Vše pro práci, kreativitu a nápady.", hitsTitle: "Hity", hitsDescription: "Pište hudbu, tvořte skladby a soundtracky", imagesExtra: "Tvořte volně nebo použijte hotové šablony", textSubtitle: "Chytré chaty s pamětí", textExtra: "Získejte odpověď na jakoukoli otázku", textQuestion: "Který model je pro můj úkol nejlepší?", textAnswer: "Genora.art vybere vhodný model a režim odpovědi, aby šetřil tokeny, a chaty mají vestavěnou paměť kontextu konverzace.", videoTitle: "Video", videoDescription: "Tvořte videa, která překvapí", videoExtra: "Generujte scény, pohyb a vizuální příběhy", videoNav: "Přejít do sekce videa", openFullscreen: "Otevřít na celou obrazovku", fullscreenComing: "Plná verze videa bude přidána, jakmile bude dostupná", close: "Zavřít" },
    showcase: { bullets: ["Chytří agenti dovedou úkol až k výsledku", "Paměť uchovává fakta a kontext mezi chaty", "Souboj modelů pomáhá zjistit, který model je pro váš požadavek nejlepší"], agentDescription: "Převede video na prompt: nahrajte klip a získejte hotový prompt pro generování.", memoryQuestion: "Budeme pokračovat v plánu spuštění?", memoryAnswer: "Genora.art si pamatuje důležitá fakta a detaily z vašich konverzací — nemusíte je opakovat v každém novém chatu.", battleTitle: "Souboj modelů", battlePrompt: "Navrhni slogan pro nový produkt", battleAnswerA: "Nápady dostávají tvar.", battleAnswerB: "Od nápadu k výsledku.", placeholder: "Napsat zprávu..." },
  },
};

export function landingInteractiveCopy(locale: Locale): LandingInteractiveCopy {
  return isServedLocale(locale) ? copy[locale] : copy.en;
}

export function landingMediaBadges(locale: Locale): LandingMediaBadges {
  return isServedLocale(locale) ? mediaBadges[locale] : mediaBadges.en;
}
