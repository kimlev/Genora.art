import type { Locale } from "@/lib/i18n";

/** Уровни надёжности пароля в машинном виде */
export type PasswordStrengthKey = "weak" | "fair" | "good" | "strong";

export type AuthUiCopy = {
  errors: {
    googleUnavailable: string;
    googleCancelled: string;
    googleStateInvalid: string;
    googleEmailUnverified: string;
    googleFailed: string;
    accountBlocked: string;
    adminEmailReserved: string;
    rateLimited: string;
  };
  strengthLabels: Record<PasswordStrengthKey, string>;
  strengthHints: Record<PasswordStrengthKey, string>;
  signInFailed: string;
  serverUnavailable: string;
  pinInvalid: string;
  securityCheck: string;
  preview: {
    subtitle: string;
    username: string;
    password: string;
    remember: string;
    failed: string;
    signIn: string;
  };
};

const en: AuthUiCopy = {
  errors: {
    googleUnavailable: "Google sign-in is temporarily unavailable",
    googleCancelled: "Google sign-in was cancelled",
    googleStateInvalid: "The sign-in session has expired. Please try again",
    googleEmailUnverified: "Google has not verified this email address",
    googleFailed: "Could not sign in with Google. Please try again",
    accountBlocked: "Account blocked",
    adminEmailReserved: "This email is reserved for an administrator",
    rateLimited: "Too many attempts. Try again later",
  },
  strengthLabels: { weak: "Weak", fair: "Fair", good: "Good", strong: "Strong" },
  strengthHints: {
    weak: "Add length, digits and symbols",
    fair: "Use at least 12 characters",
    good: "Even safer — 14+ characters of different types",
    strong: "This password is well protected",
  },
  signInFailed: "Could not sign in",
  serverUnavailable: "The server is temporarily unavailable",
  pinInvalid: "Invalid PIN code",
  securityCheck: "Cloudflare security check",
  preview: {
    subtitle: "The site is available to the team only for now.",
    username: "Username",
    password: "Password",
    remember: "Remember me for 30 days",
    failed: "Could not sign in",
    signIn: "Sign in",
  },
};

const ru: AuthUiCopy = {
  errors: {
    googleUnavailable: "Вход через Google временно недоступен",
    googleCancelled: "Вход через Google отменён",
    googleStateInvalid: "Сессия входа истекла. Попробуйте ещё раз",
    googleEmailUnverified: "Google не подтвердил этот адрес электронной почты",
    googleFailed: "Не удалось войти через Google. Попробуйте ещё раз",
    accountBlocked: "Аккаунт заблокирован",
    adminEmailReserved: "Этот email закреплён за администратором",
    rateLimited: "Слишком много попыток. Повторите позже",
  },
  strengthLabels: { weak: "Слабый", fair: "Средний", good: "Хороший", strong: "Надёжный" },
  strengthHints: {
    weak: "Добавьте длину, цифры и символы",
    fair: "Используйте не менее 12 символов",
    good: "Ещё надёжнее — 14+ символов разных типов",
    strong: "Пароль хорошо защищён",
  },
  signInFailed: "Не удалось выполнить вход",
  serverUnavailable: "Сервер временно недоступен",
  pinInvalid: "Неверный PIN-код",
  securityCheck: "Проверка безопасности Cloudflare",
  preview: {
    subtitle: "Сайт пока доступен только команде.",
    username: "Логин",
    password: "Пароль",
    remember: "Запомнить меня на 30 дней",
    failed: "Не удалось войти",
    signIn: "Войти",
  },
};

const zh: AuthUiCopy = {
  errors: {
    googleUnavailable: "Google 登录暂时不可用",
    googleCancelled: "已取消 Google 登录",
    googleStateInvalid: "登录会话已过期，请重试",
    googleEmailUnverified: "Google 未验证此电子邮件地址",
    googleFailed: "无法通过 Google 登录，请重试",
    accountBlocked: "账号已被封禁",
    adminEmailReserved: "该邮箱已分配给管理员",
    rateLimited: "尝试次数过多，请稍后再试",
  },
  strengthLabels: { weak: "弱", fair: "中等", good: "良好", strong: "强" },
  strengthHints: {
    weak: "增加长度，并添加数字和符号",
    fair: "请使用至少 12 个字符",
    good: "更安全的做法：14 个以上不同类型的字符",
    strong: "密码保护良好",
  },
  signInFailed: "登录失败",
  serverUnavailable: "服务器暂时不可用",
  pinInvalid: "PIN 码不正确",
  securityCheck: "Cloudflare 安全验证",
  preview: {
    subtitle: "网站目前仅向团队开放。",
    username: "用户名",
    password: "密码",
    remember: "记住我 30 天",
    failed: "登录失败",
    signIn: "登录",
  },
};

const hi: AuthUiCopy = {
  errors: {
    googleUnavailable: "Google से साइन इन अभी उपलब्ध नहीं है",
    googleCancelled: "Google से साइन इन रद्द कर दिया गया",
    googleStateInvalid: "साइन इन सत्र समाप्त हो गया। फिर से प्रयास करें",
    googleEmailUnverified: "Google ने इस ईमेल पते की पुष्टि नहीं की",
    googleFailed: "Google से साइन इन नहीं हो सका। फिर से प्रयास करें",
    accountBlocked: "खाता अवरुद्ध है",
    adminEmailReserved: "यह ईमेल एक व्यवस्थापक के लिए आरक्षित है",
    rateLimited: "बहुत अधिक प्रयास। बाद में फिर कोशिश करें",
  },
  strengthLabels: { weak: "कमज़ोर", fair: "औसत", good: "अच्छा", strong: "मज़बूत" },
  strengthHints: {
    weak: "लंबाई बढ़ाएँ, अंक और चिह्न जोड़ें",
    fair: "कम से कम 12 वर्ण उपयोग करें",
    good: "और सुरक्षित — विभिन्न प्रकार के 14+ वर्ण",
    strong: "पासवर्ड अच्छी तरह सुरक्षित है",
  },
  signInFailed: "साइन इन नहीं हो सका",
  serverUnavailable: "सर्वर अस्थायी रूप से उपलब्ध नहीं है",
  pinInvalid: "पिन कोड गलत है",
  securityCheck: "Cloudflare सुरक्षा जाँच",
  preview: {
    subtitle: "साइट फ़िलहाल केवल टीम के लिए उपलब्ध है।",
    username: "उपयोगकर्ता नाम",
    password: "पासवर्ड",
    remember: "मुझे 30 दिनों तक याद रखें",
    failed: "साइन इन नहीं हो सका",
    signIn: "साइन इन",
  },
};

const es: AuthUiCopy = {
  errors: {
    googleUnavailable: "El inicio de sesión con Google no está disponible temporalmente",
    googleCancelled: "Se canceló el inicio de sesión con Google",
    googleStateInvalid: "La sesión de inicio ha caducado. Inténtalo de nuevo",
    googleEmailUnverified: "Google no ha verificado esta dirección de correo",
    googleFailed: "No se pudo iniciar sesión con Google. Inténtalo de nuevo",
    accountBlocked: "Cuenta bloqueada",
    adminEmailReserved: "Este correo está reservado para un administrador",
    rateLimited: "Demasiados intentos. Inténtalo más tarde",
  },
  strengthLabels: { weak: "Débil", fair: "Media", good: "Buena", strong: "Segura" },
  strengthHints: {
    weak: "Añade longitud, números y símbolos",
    fair: "Usa al menos 12 caracteres",
    good: "Aún más segura: más de 14 caracteres de distintos tipos",
    strong: "La contraseña está bien protegida",
  },
  signInFailed: "No se pudo iniciar sesión",
  serverUnavailable: "El servidor no está disponible temporalmente",
  pinInvalid: "Código PIN incorrecto",
  securityCheck: "Comprobación de seguridad de Cloudflare",
  preview: {
    subtitle: "Por ahora el sitio solo está disponible para el equipo.",
    username: "Usuario",
    password: "Contraseña",
    remember: "Recordarme durante 30 días",
    failed: "No se pudo iniciar sesión",
    signIn: "Iniciar sesión",
  },
};

const fr: AuthUiCopy = {
  errors: {
    googleUnavailable: "La connexion avec Google est temporairement indisponible",
    googleCancelled: "Connexion avec Google annulée",
    googleStateInvalid: "La session de connexion a expiré. Réessayez",
    googleEmailUnverified: "Google n’a pas vérifié cette adresse e-mail",
    googleFailed: "Impossible de se connecter avec Google. Réessayez",
    accountBlocked: "Compte bloqué",
    adminEmailReserved: "Cette adresse e-mail est réservée à un administrateur",
    rateLimited: "Trop de tentatives. Réessayez plus tard",
  },
  strengthLabels: { weak: "Faible", fair: "Moyen", good: "Bon", strong: "Fort" },
  strengthHints: {
    weak: "Ajoutez de la longueur, des chiffres et des symboles",
    fair: "Utilisez au moins 12 caractères",
    good: "Encore plus sûr : 14 caractères ou plus de types variés",
    strong: "Le mot de passe est bien protégé",
  },
  signInFailed: "Impossible de se connecter",
  serverUnavailable: "Le serveur est temporairement indisponible",
  pinInvalid: "Code PIN incorrect",
  securityCheck: "Vérification de sécurité Cloudflare",
  preview: {
    subtitle: "Le site est pour l’instant réservé à l’équipe.",
    username: "Identifiant",
    password: "Mot de passe",
    remember: "Se souvenir de moi pendant 30 jours",
    failed: "Impossible de se connecter",
    signIn: "Connexion",
  },
};

const ar: AuthUiCopy = {
  errors: {
    googleUnavailable: "تسجيل الدخول عبر Google غير متاح مؤقتاً",
    googleCancelled: "تم إلغاء تسجيل الدخول عبر Google",
    googleStateInvalid: "انتهت جلسة تسجيل الدخول. حاول مرة أخرى",
    googleEmailUnverified: "لم يؤكد Google عنوان البريد الإلكتروني هذا",
    googleFailed: "تعذّر تسجيل الدخول عبر Google. حاول مرة أخرى",
    accountBlocked: "الحساب محظور",
    adminEmailReserved: "هذا البريد الإلكتروني مخصص لمسؤول",
    rateLimited: "محاولات كثيرة جداً. حاول لاحقاً",
  },
  strengthLabels: { weak: "ضعيفة", fair: "متوسطة", good: "جيدة", strong: "قوية" },
  strengthHints: {
    weak: "أضف طولاً وأرقاماً ورموزاً",
    fair: "استخدم 12 حرفاً على الأقل",
    good: "أكثر أماناً: 14 حرفاً فأكثر من أنواع مختلفة",
    strong: "كلمة المرور محمية جيداً",
  },
  signInFailed: "تعذّر تسجيل الدخول",
  serverUnavailable: "الخادم غير متاح مؤقتاً",
  pinInvalid: "رمز PIN غير صحيح",
  securityCheck: "فحص أمان Cloudflare",
  preview: {
    subtitle: "الموقع متاح حالياً للفريق فقط.",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    remember: "تذكّرني لمدة 30 يوماً",
    failed: "تعذّر تسجيل الدخول",
    signIn: "تسجيل الدخول",
  },
};

const pt: AuthUiCopy = {
  errors: {
    googleUnavailable: "O login com o Google está temporariamente indisponível",
    googleCancelled: "Login com o Google cancelado",
    googleStateInvalid: "A sessão de login expirou. Tente novamente",
    googleEmailUnverified: "O Google não confirmou este endereço de e-mail",
    googleFailed: "Não foi possível entrar com o Google. Tente novamente",
    accountBlocked: "Conta bloqueada",
    adminEmailReserved: "Este e-mail está reservado a um administrador",
    rateLimited: "Muitas tentativas. Tente mais tarde",
  },
  strengthLabels: { weak: "Fraca", fair: "Média", good: "Boa", strong: "Forte" },
  strengthHints: {
    weak: "Aumente o tamanho e adicione números e símbolos",
    fair: "Use pelo menos 12 caracteres",
    good: "Ainda mais segura: 14+ caracteres de tipos diferentes",
    strong: "A senha está bem protegida",
  },
  signInFailed: "Não foi possível entrar",
  serverUnavailable: "O servidor está temporariamente indisponível",
  pinInvalid: "Código PIN incorreto",
  securityCheck: "Verificação de segurança da Cloudflare",
  preview: {
    subtitle: "Por enquanto, o site está disponível apenas para a equipe.",
    username: "Usuário",
    password: "Senha",
    remember: "Lembrar de mim por 30 dias",
    failed: "Não foi possível entrar",
    signIn: "Entrar",
  },
};

const de: AuthUiCopy = {
  errors: {
    googleUnavailable: "Die Anmeldung mit Google ist vorübergehend nicht verfügbar",
    googleCancelled: "Anmeldung mit Google abgebrochen",
    googleStateInvalid: "Die Anmeldesitzung ist abgelaufen. Bitte erneut versuchen",
    googleEmailUnverified: "Google hat diese E-Mail-Adresse nicht bestätigt",
    googleFailed: "Anmeldung mit Google fehlgeschlagen. Bitte erneut versuchen",
    accountBlocked: "Konto gesperrt",
    adminEmailReserved: "Diese E-Mail-Adresse ist einem Administrator vorbehalten",
    rateLimited: "Zu viele Versuche. Bitte später erneut versuchen",
  },
  strengthLabels: { weak: "Schwach", fair: "Mittel", good: "Gut", strong: "Stark" },
  strengthHints: {
    weak: "Länge, Ziffern und Sonderzeichen hinzufügen",
    fair: "Mindestens 12 Zeichen verwenden",
    good: "Noch sicherer: 14+ Zeichen verschiedener Typen",
    strong: "Das Passwort ist gut geschützt",
  },
  signInFailed: "Anmeldung fehlgeschlagen",
  serverUnavailable: "Der Server ist vorübergehend nicht verfügbar",
  pinInvalid: "Falscher PIN-Code",
  securityCheck: "Cloudflare-Sicherheitsprüfung",
  preview: {
    subtitle: "Die Website ist vorerst nur für das Team verfügbar.",
    username: "Benutzername",
    password: "Passwort",
    remember: "30 Tage angemeldet bleiben",
    failed: "Anmeldung fehlgeschlagen",
    signIn: "Anmelden",
  },
};

const ja: AuthUiCopy = {
  errors: {
    googleUnavailable: "Googleログインは一時的にご利用いただけません",
    googleCancelled: "Googleログインをキャンセルしました",
    googleStateInvalid: "ログインセッションの有効期限が切れました。もう一度お試しください",
    googleEmailUnverified: "Googleはこのメールアドレスを確認していません",
    googleFailed: "Googleでログインできませんでした。もう一度お試しください",
    accountBlocked: "アカウントはブロックされています",
    adminEmailReserved: "このメールアドレスは管理者用に予約されています",
    rateLimited: "試行回数が多すぎます。しばらくしてからお試しください",
  },
  strengthLabels: { weak: "弱い", fair: "普通", good: "良好", strong: "強力" },
  strengthHints: {
    weak: "文字数を増やし、数字と記号を追加してください",
    fair: "12文字以上を使用してください",
    good: "さらに安全に — 異なる種類の文字を14文字以上",
    strong: "パスワードは十分に保護されています",
  },
  signInFailed: "ログインできませんでした",
  serverUnavailable: "サーバーが一時的に利用できません",
  pinInvalid: "PINコードが正しくありません",
  securityCheck: "Cloudflareのセキュリティチェック",
  preview: {
    subtitle: "サイトは現在チームのみが利用できます。",
    username: "ユーザー名",
    password: "パスワード",
    remember: "30日間ログイン状態を保持する",
    failed: "ログインできませんでした",
    signIn: "ログイン",
  },
};

const it: AuthUiCopy = {
  errors: {
    googleUnavailable: "L’accesso con Google non è temporaneamente disponibile",
    googleCancelled: "Accesso con Google annullato",
    googleStateInvalid: "La sessione di accesso è scaduta. Riprova",
    googleEmailUnverified: "Google non ha verificato questo indirizzo e-mail",
    googleFailed: "Impossibile accedere con Google. Riprova",
    accountBlocked: "Account bloccato",
    adminEmailReserved: "Questa e-mail è riservata a un amministratore",
    rateLimited: "Troppi tentativi. Riprova più tardi",
  },
  strengthLabels: { weak: "Debole", fair: "Media", good: "Buona", strong: "Forte" },
  strengthHints: {
    weak: "Aumenta la lunghezza e aggiungi numeri e simboli",
    fair: "Usa almeno 12 caratteri",
    good: "Ancora più sicura: 14+ caratteri di tipi diversi",
    strong: "La password è ben protetta",
  },
  signInFailed: "Impossibile accedere",
  serverUnavailable: "Il server non è temporaneamente disponibile",
  pinInvalid: "Codice PIN non valido",
  securityCheck: "Controllo di sicurezza Cloudflare",
  preview: {
    subtitle: "Per ora il sito è disponibile solo al team.",
    username: "Nome utente",
    password: "Password",
    remember: "Ricordami per 30 giorni",
    failed: "Impossibile accedere",
    signIn: "Accedi",
  },
};

const ko: AuthUiCopy = {
  errors: {
    googleUnavailable: "Google 로그인을 일시적으로 사용할 수 없습니다",
    googleCancelled: "Google 로그인이 취소되었습니다",
    googleStateInvalid: "로그인 세션이 만료되었습니다. 다시 시도하세요",
    googleEmailUnverified: "Google이 이 이메일 주소를 확인하지 않았습니다",
    googleFailed: "Google로 로그인하지 못했습니다. 다시 시도하세요",
    accountBlocked: "계정이 차단되었습니다",
    adminEmailReserved: "이 이메일은 관리자용으로 예약되어 있습니다",
    rateLimited: "시도 횟수가 너무 많습니다. 나중에 다시 시도하세요",
  },
  strengthLabels: { weak: "약함", fair: "보통", good: "양호", strong: "강함" },
  strengthHints: {
    weak: "길이를 늘리고 숫자와 기호를 추가하세요",
    fair: "12자 이상 사용하세요",
    good: "더 안전하게 — 다양한 종류의 문자 14자 이상",
    strong: "비밀번호가 잘 보호되어 있습니다",
  },
  signInFailed: "로그인하지 못했습니다",
  serverUnavailable: "서버를 일시적으로 사용할 수 없습니다",
  pinInvalid: "PIN 코드가 올바르지 않습니다",
  securityCheck: "Cloudflare 보안 확인",
  preview: {
    subtitle: "사이트는 현재 팀에게만 공개되어 있습니다.",
    username: "사용자 이름",
    password: "비밀번호",
    remember: "30일 동안 로그인 유지",
    failed: "로그인하지 못했습니다",
    signIn: "로그인",
  },
};

const tr: AuthUiCopy = {
  errors: {
    googleUnavailable: "Google ile giriş geçici olarak kullanılamıyor",
    googleCancelled: "Google ile giriş iptal edildi",
    googleStateInvalid: "Giriş oturumunun süresi doldu. Tekrar deneyin",
    googleEmailUnverified: "Google bu e-posta adresini doğrulamadı",
    googleFailed: "Google ile giriş yapılamadı. Tekrar deneyin",
    accountBlocked: "Hesap engellendi",
    adminEmailReserved: "Bu e-posta bir yöneticiye ayrılmış",
    rateLimited: "Çok fazla deneme. Daha sonra tekrar deneyin",
  },
  strengthLabels: { weak: "Zayıf", fair: "Orta", good: "İyi", strong: "Güçlü" },
  strengthHints: {
    weak: "Uzunluk, rakam ve sembol ekleyin",
    fair: "En az 12 karakter kullanın",
    good: "Daha da güvenli: farklı türde 14+ karakter",
    strong: "Şifre iyi korunuyor",
  },
  signInFailed: "Giriş yapılamadı",
  serverUnavailable: "Sunucu geçici olarak kullanılamıyor",
  pinInvalid: "PIN kodu hatalı",
  securityCheck: "Cloudflare güvenlik kontrolü",
  preview: {
    subtitle: "Site şimdilik yalnızca ekibe açık.",
    username: "Kullanıcı adı",
    password: "Şifre",
    remember: "Beni 30 gün hatırla",
    failed: "Giriş yapılamadı",
    signIn: "Giriş yap",
  },
};

const pl: AuthUiCopy = {
  errors: {
    googleUnavailable: "Logowanie przez Google jest chwilowo niedostępne",
    googleCancelled: "Logowanie przez Google zostało anulowane",
    googleStateInvalid: "Sesja logowania wygasła. Spróbuj ponownie",
    googleEmailUnverified: "Google nie potwierdziło tego adresu e-mail",
    googleFailed: "Nie udało się zalogować przez Google. Spróbuj ponownie",
    accountBlocked: "Konto zablokowane",
    adminEmailReserved: "Ten e-mail jest zarezerwowany dla administratora",
    rateLimited: "Zbyt wiele prób. Spróbuj później",
  },
  strengthLabels: { weak: "Słabe", fair: "Średnie", good: "Dobre", strong: "Silne" },
  strengthHints: {
    weak: "Zwiększ długość, dodaj cyfry i symbole",
    fair: "Użyj co najmniej 12 znaków",
    good: "Jeszcze bezpieczniej — 14+ znaków różnych typów",
    strong: "Hasło jest dobrze chronione",
  },
  signInFailed: "Nie udało się zalogować",
  serverUnavailable: "Serwer jest chwilowo niedostępny",
  pinInvalid: "Nieprawidłowy kod PIN",
  securityCheck: "Kontrola bezpieczeństwa Cloudflare",
  preview: {
    subtitle: "Strona jest na razie dostępna tylko dla zespołu.",
    username: "Login",
    password: "Hasło",
    remember: "Zapamiętaj mnie na 30 dni",
    failed: "Nie udało się zalogować",
    signIn: "Zaloguj się",
  },
};

const nl: AuthUiCopy = {
  errors: {
    googleUnavailable: "Inloggen met Google is tijdelijk niet beschikbaar",
    googleCancelled: "Inloggen met Google is geannuleerd",
    googleStateInvalid: "De inlogsessie is verlopen. Probeer het opnieuw",
    googleEmailUnverified: "Google heeft dit e-mailadres niet geverifieerd",
    googleFailed: "Inloggen met Google is mislukt. Probeer het opnieuw",
    accountBlocked: "Account geblokkeerd",
    adminEmailReserved: "Dit e-mailadres is gereserveerd voor een beheerder",
    rateLimited: "Te veel pogingen. Probeer het later opnieuw",
  },
  strengthLabels: { weak: "Zwak", fair: "Matig", good: "Goed", strong: "Sterk" },
  strengthHints: {
    weak: "Maak het langer en voeg cijfers en symbolen toe",
    fair: "Gebruik minstens 12 tekens",
    good: "Nog veiliger: 14+ tekens van verschillende types",
    strong: "Het wachtwoord is goed beveiligd",
  },
  signInFailed: "Inloggen is mislukt",
  serverUnavailable: "De server is tijdelijk niet beschikbaar",
  pinInvalid: "Onjuiste pincode",
  securityCheck: "Cloudflare-beveiligingscontrole",
  preview: {
    subtitle: "De site is voorlopig alleen beschikbaar voor het team.",
    username: "Gebruikersnaam",
    password: "Wachtwoord",
    remember: "Onthoud mij 30 dagen",
    failed: "Inloggen is mislukt",
    signIn: "Inloggen",
  },
};

const sv: AuthUiCopy = {
  errors: {
    googleUnavailable: "Inloggning med Google är tillfälligt otillgänglig",
    googleCancelled: "Inloggningen med Google avbröts",
    googleStateInvalid: "Inloggningssessionen har gått ut. Försök igen",
    googleEmailUnverified: "Google har inte verifierat den här e-postadressen",
    googleFailed: "Det gick inte att logga in med Google. Försök igen",
    accountBlocked: "Kontot är blockerat",
    adminEmailReserved: "Den här e-postadressen är reserverad för en administratör",
    rateLimited: "För många försök. Försök igen senare",
  },
  strengthLabels: { weak: "Svagt", fair: "Medel", good: "Bra", strong: "Starkt" },
  strengthHints: {
    weak: "Gör det längre och lägg till siffror och tecken",
    fair: "Använd minst 12 tecken",
    good: "Ännu säkrare: 14+ tecken av olika typer",
    strong: "Lösenordet är väl skyddat",
  },
  signInFailed: "Det gick inte att logga in",
  serverUnavailable: "Servern är tillfälligt otillgänglig",
  pinInvalid: "Fel PIN-kod",
  securityCheck: "Cloudflares säkerhetskontroll",
  preview: {
    subtitle: "Webbplatsen är tills vidare endast tillgänglig för teamet.",
    username: "Användarnamn",
    password: "Lösenord",
    remember: "Kom ihåg mig i 30 dagar",
    failed: "Det gick inte att logga in",
    signIn: "Logga in",
  },
};

const cs: AuthUiCopy = {
  errors: {
    googleUnavailable: "Přihlášení přes Google je dočasně nedostupné",
    googleCancelled: "Přihlášení přes Google bylo zrušeno",
    googleStateInvalid: "Platnost přihlašovací relace vypršela. Zkuste to znovu",
    googleEmailUnverified: "Google tuto e-mailovou adresu nepotvrdil",
    googleFailed: "Přihlášení přes Google se nezdařilo. Zkuste to znovu",
    accountBlocked: "Účet je zablokován",
    adminEmailReserved: "Tento e-mail je vyhrazen pro administrátora",
    rateLimited: "Příliš mnoho pokusů. Zkuste to později",
  },
  strengthLabels: { weak: "Slabé", fair: "Střední", good: "Dobré", strong: "Silné" },
  strengthHints: {
    weak: "Prodlužte heslo a přidejte číslice a symboly",
    fair: "Použijte alespoň 12 znaků",
    good: "Ještě bezpečnější — 14+ znaků různých typů",
    strong: "Heslo je dobře chráněné",
  },
  signInFailed: "Přihlášení se nezdařilo",
  serverUnavailable: "Server je dočasně nedostupný",
  pinInvalid: "Nesprávný PIN kód",
  securityCheck: "Bezpečnostní kontrola Cloudflare",
  preview: {
    subtitle: "Web je zatím dostupný pouze týmu.",
    username: "Přihlašovací jméno",
    password: "Heslo",
    remember: "Zapamatovat si mě na 30 dní",
    failed: "Přihlášení se nezdařilo",
    signIn: "Přihlásit se",
  },
};

const el: AuthUiCopy = {
  errors: {
    googleUnavailable: "Η σύνδεση με Google δεν είναι προσωρινά διαθέσιμη",
    googleCancelled: "Η σύνδεση με Google ακυρώθηκε",
    googleStateInvalid: "Η συνεδρία σύνδεσης έληξε. Δοκιμάστε ξανά",
    googleEmailUnverified: "Η Google δεν επιβεβαίωσε αυτή τη διεύθυνση email",
    googleFailed: "Η σύνδεση με Google απέτυχε. Δοκιμάστε ξανά",
    accountBlocked: "Ο λογαριασμός έχει αποκλειστεί",
    adminEmailReserved: "Αυτό το email προορίζεται για διαχειριστή",
    rateLimited: "Πάρα πολλές προσπάθειες. Δοκιμάστε αργότερα",
  },
  strengthLabels: { weak: "Αδύναμος", fair: "Μέτριος", good: "Καλός", strong: "Ισχυρός" },
  strengthHints: {
    weak: "Προσθέστε μήκος, ψηφία και σύμβολα",
    fair: "Χρησιμοποιήστε τουλάχιστον 12 χαρακτήρες",
    good: "Ακόμη ασφαλέστερος: 14+ χαρακτήρες διαφορετικών τύπων",
    strong: "Ο κωδικός προστατεύεται καλά",
  },
  signInFailed: "Η σύνδεση απέτυχε",
  serverUnavailable: "Ο διακομιστής δεν είναι προσωρινά διαθέσιμος",
  pinInvalid: "Λανθασμένος κωδικός PIN",
  securityCheck: "Έλεγχος ασφαλείας Cloudflare",
  preview: {
    subtitle: "Ο ιστότοπος είναι προς το παρόν διαθέσιμος μόνο στην ομάδα.",
    username: "Όνομα χρήστη",
    password: "Κωδικός",
    remember: "Να με θυμάσαι για 30 ημέρες",
    failed: "Η σύνδεση απέτυχε",
    signIn: "Σύνδεση",
  },
};

const ro: AuthUiCopy = {
  errors: {
    googleUnavailable: "Autentificarea cu Google este temporar indisponibilă",
    googleCancelled: "Autentificarea cu Google a fost anulată",
    googleStateInvalid: "Sesiunea de autentificare a expirat. Încearcă din nou",
    googleEmailUnverified: "Google nu a confirmat această adresă de e-mail",
    googleFailed: "Autentificarea cu Google a eșuat. Încearcă din nou",
    accountBlocked: "Cont blocat",
    adminEmailReserved: "Acest e-mail este rezervat unui administrator",
    rateLimited: "Prea multe încercări. Încearcă mai târziu",
  },
  strengthLabels: { weak: "Slabă", fair: "Medie", good: "Bună", strong: "Puternică" },
  strengthHints: {
    weak: "Mărește lungimea și adaugă cifre și simboluri",
    fair: "Folosește cel puțin 12 caractere",
    good: "Și mai sigură: 14+ caractere de tipuri diferite",
    strong: "Parola este bine protejată",
  },
  signInFailed: "Autentificarea a eșuat",
  serverUnavailable: "Serverul este temporar indisponibil",
  pinInvalid: "Cod PIN incorect",
  securityCheck: "Verificare de securitate Cloudflare",
  preview: {
    subtitle: "Deocamdată site-ul este disponibil doar echipei.",
    username: "Nume de utilizator",
    password: "Parolă",
    remember: "Ține-mă minte 30 de zile",
    failed: "Autentificarea a eșuat",
    signIn: "Autentificare",
  },
};

const copies: Record<Locale, AuthUiCopy> = {
  ru,
  en,
  zh,
  hi,
  es,
  fr,
  ar,
  pt,
  de,
  ja,
  it,
  ko,
  tr,
  pl,
  nl,
  sv,
  cs,
  el,
  ro,
};

export function authUiCopy(locale: Locale): AuthUiCopy {
  return copies[locale] ?? en;
}
