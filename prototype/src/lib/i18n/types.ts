export type Locale =
  | "ru"
  | "en"
  | "zh"
  | "hi"
  | "es"
  | "fr"
  | "ar"
  | "pt"
  | "de"
  | "ja"
  | "it"
  | "ko"
  | "tr"
  | "pl"
  | "nl"
  | "sv"
  | "cs"
  | "el"
  | "ro";

export const LOCALE_STORAGE_KEY = "arenaai-locale";

export type NavDictionary = {
  why: string;
  agents: string;
  songs: string;
  pricing: string;
  faq: string;
  signIn: string;
  getStarted: string;
  home: string;
  arena: string;
  images: string;
  blog: string;
};

export type HeroDictionary = {
  badge: string;
  titleBefore: string;
  titleAccent: string;
  titleAfter: string;
  promptPlaceholder: string;
  demoMode: string;
  demoModeUnit: string;
  messagesLeft: string;
  guestHint: string;
  demoReply: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trust: string;
  messagesLabel: string;
  entries: {
    text: { title: string; description: string };
    images: { title: string; description: string };
    music: { title: string; description: string };
  };
};

export type WhyDictionary = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: Array<{ title: string; description: string }>;
};

export type MarqueeDictionary = {
  label: string;
  models: string[];
};

export type DemoMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DemoDictionary = {
  title: string;
  subtitle: string;
  promptPlaceholder: string;
  send: string;
  modelLabel: string;
  suggestions: string[];
  messages: DemoMessage[];
};

export type ShowcasePanelDictionary = {
  id: string;
  group: "popular" | "tools";
  navTitle: string;
  navSubtitle: string;
  badge?: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  bullets: string[];
  phoneReply: string;
  phoneChips?: string[];
  phonePlaceholder: string;
};

export type ShowcaseDictionary = {
  popularLabel: string;
  toolsLabel: string;
  online: string;
  newBadge: string;
  panels: ShowcasePanelDictionary[];
};

export type AgentItemDictionary = {
  name: string;
  description: string;
};

export type AgentsDictionary = {
  title: string;
  subtitle: string;
  viewAll: string;
  useAgent: string;
  popularBadge: string;
  catalogEyebrow: string;
  catalogTitle: string;
  catalogSubtitle: string;
  filterAll: string;
  filterMine: string;
  filterImages: string;
  filterCode: string;
  filterWriting: string;
  filterAnalysis: string;
  filterMarketing: string;
  filterSong: string;
  filterText: string;
  filterVideo: string;
  builderContext: string;
  contextImages: string;
  contextCode: string;
  contextWriting: string;
  contextAnalysis: string;
  contextMarketing: string;
  contextSong: string;
  contextText: string;
  contextVideo: string;
  filtersLabel: string;
  /** Подпись кнопки для читалок экрана, `{name}` заменяется названием агента */
  chatsWithAgent: string;
  myAgentBadge: string;
  builderNew: string;
  builderEdit: string;
  builderSubtitle: string;
  builderClose: string;
  builderIcon: string;
  builderOptional: string;
  builderName: string;
  builderNamePlaceholder: string;
  builderDescription: string;
  builderDescriptionPlaceholder: string;
  builderSystem: string;
  builderSystemPlaceholder: string;
  builderAiHelp: string;
  builderAiHelpBusy: string;
  builderAiHelpError: string;
  builderAiHelpHint: string;
  builderAiHelpCost: string;
  builderCancel: string;
  builderSave: string;
  builderPromptTemplate: string;
  items: Record<string, AgentItemDictionary>;
};

export type ModelItemDictionary = {
  description: string;
};

export type ModelsDictionary = {
  items: Record<string, ModelItemDictionary>;
};

export type PricingDictionary = {
  title: string;
  subtitle: string;
  planName: string;
  planDescription: string;
  priceLabel: string;
  priceNote: string;
  note: string;
  cta: string;
  features: string[];
};

export type FaqDictionary = {
  title: string;
  items: Array<{ question: string; answer: string }>;
};

export type FooterDictionary = {
  tagline: string;
  product: string;
  company: string;
  legal: string;
  materials: string;
  documentation: string;
  copyright: string;
  copyrightFull: string;
  securePayment: string;
  links: {
    models: string;
    images: string;
    video: string;
    music: string;
    pricing: string;
    prices: string;
    agents: string;
    about: string;
    support: string;
    privacy: string;
    terms: string;
    cookies: string;
    blog: string;
    rating: string;
    agentsCatalog: string;
    allDocuments: string;
  };
};

export type AuthDictionary = {
  welcomeBack: string;
  signInTitle: string;
  signUpTitle: string;
  signInSubtitle: string;
  signUpSubtitle: string;
  email: string;
  password: string;
  confirmPassword: string;
  continueWith: string;
  emailDivider: string;
  noAccount: string;
  hasAccount: string;
  signUp: string;
  signIn: string;
  privacyPrefix: string;
  privacyLink: string;
  backToHome: string;
  passwordMismatch: string;
  pinLabel: string;
  pinHint: string;
  pinInvalid: string;
  sideTitle: string;
  sideDescription: string;
  sideTriggers: string[];
  pleaseWait: string;
  signInFailed: string;
  forgotPassword: string;
  rememberMe: string;
  termsLink: string;
  privacyPolicyLink: string;
  acceptTermsPrefix: string;
  acceptPrivacyPrefix: string;
  googleTermsPrefix: string;
  googleTermsAnd: string;
  googleSoon: string;
  googleSoonHint: string;
  turnstileError: string;
  verifyChecking: string;
  verifyCheckingTitle: string;
  verifySuccessTitle: string;
  verifySuccess: string;
  verifyErrorTitle: string;
  verifyMissingToken: string;
  verifyInvalidLink: string;
  verifySignIn: string;
  verifyRetry: string;
  recoveryEyebrow: string;
  recoverySubtitle: string;
  recoveryAcceptedTitle: string;
  recoveryAcceptedText: string;
  recoverySending: string;
  recoverySubmit: string;
  recoveryBack: string;
  serverUnavailable: string;
  resetTitle: string;
  resetMissingToken: string;
  resetFailed: string;
  resetDoneTitle: string;
  resetDoneText: string;
  resetRepeatPassword: string;
  resetSaving: string;
  resetSubmit: string;
};

export type MockConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MockConversation = {
  id: string;
  title: string;
  messages: MockConversationMessage[];
};

export type ChatDictionary = {
  newChat: string;
  placeholder: string;
  send: string;
  selectModel: string;
  selectAgent: string;
  noAgent: string;
  history: string;
  emptyState: string;
  welcome: string;
  welcomeSubtitle: string;
  balance: string;
  balanceAmount: string;
  auto: string;
  thinking: string;
  openMenu: string;
  closeMenu: string;
  depthTitle: string;
  depthAria: string;
  depthFast: string;
  depthBalanced: string;
  depthDeep: string;
  depthAutoDesc: string;
  depthFastDesc: string;
  depthBalancedDesc: string;
  depthBalancedVerySlowDesc: string;
  depthBalancedSlowDesc: string;
  depthDeepDesc: string;
  selectProvider: string;
  provider: string;
  automatically: string;
  suggestions: string[];
  mockResponses: string[];
  conversations: MockConversation[];
};

export type PricingPageDictionary = {
  metaTitle: string;
  metaDescription: string;
  tableTitle: string;
  tableModel: string;
  tableInput: string;
  tableOutput: string;
  tableContext: string;
  exampleTitle: string;
  exampleDescription: string;
  per1M: string;
  benefits: Array<{ title: string; description: string }>;
  modeLabel: string;
  modeText: string;
  modeImage: string;
  noteText: string;
  noteImage: string;
  providerLabel: string;
  providerAll: string;
  tableScore: string;
  tableVotes: string;
  tableInputPer100K: string;
  tableOutputPer100K: string;
  imageSize: string;
  imageQuality: string;
  imagePrice: string;
  tokensShort: string;
  imageCatalogLoading: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaButton: string;
};

export type LegalDictionary = {
  privacyTitle: string;
  termsTitle: string;
  cookiesTitle: string;
  aboutTitle: string;
  lastUpdated: string;
  nav: {
    privacy: string;
    terms: string;
    cookies: string;
    about: string;
  };
  privacySections: Array<{ title: string; body: string }>;
  termsSections: Array<{ title: string; body: string }>;
  cookiesSections: Array<{ title: string; body: string }>;
  aboutSections: Array<{ title: string; body: string }>;
  consent: {
    dialogLabel: string;
    text: string;
    more: string;
    reject: string;
    accept: string;
    settings?: string;
    customize?: string;
    save?: string;
    essential?: string;
    analytics?: string;
    advertising?: string;
  };
};

export type SupportDictionary = {
  title: string;
  subtitle: string;
  responseTime: string;
  formTitle: string;
  name: string;
  emailLabel: string;
  topic: string;
  message: string;
  submit: string;
  sending: string;
  sent: string;
  antiSpam: string;
  rateLimited: string;
  error: string;
  topicOptions: {
    cooperation: string;
    billingRefund: string;
    other: string;
  };
};

export type WorkspaceDictionary = {
  menuChats: string;
  backToMenu: string;
  menuAgents: string;
  menuRating: string;
  menuLabel: string;
  menuHome: string;
  menuImages: string;
  menuAudio: string;
  menuBattle: string;
  menuMyRating: string;
  menuPhotoCreate: string;
  menuPhotoTemplates: string;
  menuVideoTemplates: string;
  menuMusicCreate: string;
  menuGallery: string;
  galleryEmpty: string;
  gallerySignIn: string;
  videoTemplatesTitle: string;
  videoTemplatesLead: string;
  chatsTitle: string;
  agentChatsTitle: string;
  imagesTitle: string;
  battlesTitle: string;
  myAgentsTitle: string;
  backToAllChats: string;
  backToChat: string;
  renameTitle: string;
  renameCancel: string;
  renameSave: string;
  confirmDeleteAgent: string;
  deleteConfirm: string;
  newChat: string;
  newGeneration: string;
  newBattle: string;
  createAgent: string;
  emptyChats: string;
  imageHistoryEmpty: string;
  battleHistoryEmpty: string;
  customAgentsEmpty: string;
  guestImages: string;
  newImageLabel: string;
  variantsShort: string;
  noAgent: string;
  signOut: string;
  balanceTitle: string;
  tokens: string;
  topUp: string;
  guestTitle: string;
  guestSubtitle: string;
  signIn: string;
  signUp: string;
  registrationBonusTitle: string;
  registrationBonusAmount: string;
  registrationBonusSpendHint: string;
  openMenu: string;
  closeMenu: string;
  language: string;
};

export type ProfileDictionary = {
  title: string;
  navProfile: string;
  navBalance: string;
  navSecurity: string;
  navUsage: string;
  signOut: string;
  guestTitle: string;
  guestSubtitle: string;
  profileTitle: string;
  profileSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  save: string;
  saved: string;
  saveChanges: string;
  changesSaved: string;
  nickname: string;
  timezone: string;
  timezoneSearch: string;
  timezoneNotFound: string;
  aiTone: string;
  toneConcise: string;
  toneBalanced: string;
  toneDetailed: string;
  toneExpert: string;
  addressLegend: string;
  addressHint: string;
  country: string;
  countrySelect: string;
  countrySearch: string;
  countryNotFound: string;
  postalCode: string;
  region: string;
  city: string;
  address: string;
  addressPlaceholder: string;
  detectedPrefix: string;
  detectedUnknown: string;
  detectedSuffix: string;
  aiPreferences: string;
  aiPreferencesPlaceholder: string;
  addPhoto: string;
  changePhoto: string;
  processing: string;
  avatarTypeError: string;
  avatarSizeError: string;
  avatarMinError: string;
  avatarMaxError: string;
  avatarProcessError: string;
  tzMinsk: string;
  tzMoscow: string;
  tzLondon: string;
  tzBerlin: string;
  tzDubai: string;
  tzHongKong: string;
  tzNewYork: string;
  usageTitle: string;
  usageSubtitle: string;
  balanceTitle: string;
  balanceSubtitle: string;
  balanceAvailable: string;
  tokens: string;
  topUp: string;
  historyTitle: string;
  historyEmpty: string;
  securityTitle: string;
  securitySubtitle: string;
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
  changePassword: string;
  sessionsTitle: string;
  sessionsNote: string;
  changePasswordTitle: string;
  pinTitle: string;
  pinDescription: string;
  pinAdd: string;
  pinRepeat: string;
  pinSave: string;
  pinSaved: string;
  pinActiveDescription: string;
  pinEnterToDisable: string;
  pinConfirmDisable: string;
  pinDisabled: string;
  statusOn: string;
  statusOff: string;
  pinMismatch: string;
  pinInvalid: string;
  pinWrong: string;
  saving: string;
  googleAuthTitle: string;
  googleAuthDescription: string;
  googleAuthCode: string;
  googleAuthActivate: string;
  googleAuthEnabled: string;
  googleAuthDisable: string;
  googleAuthActivated: string;
  googleAuthDisabled: string;
  passwordMismatch: string;
  passwordChangeFailed: string;
};

export type RatingDictionary = {
  title: string;
  subtitle: string;
  pageTitle: string;
  pageSubtitle: string;
  bestFor: string;
  myTitle: string;
  mySubtitle: string;
  columnModel: string;
  columnScore: string;
  columnVotes: string;
  columnPrice: string;
  columnContext: string;
  priceInOut: string;
  columnTokensUsed: string;
  priceHint: string;
  note: string;
  filterProvider: string;
  filterProviderAll: string;
  filterProviderReset: string;
  filterPrice: string;
  filterPriceAria: string;
  filterPriceAll: string;
  filterPriceUnder1: string;
  filterPrice1to5: string;
  filterPriceOver5: string;
  filterPriceReset: string;
  filterType: string;
  filterTypeAria: string;
  filterTypeAll: string;
  filterTypeText: string;
  filterTypeImage: string;
  filterTypePhoto: string;
  filterTypeVideo: string;
  filterTypeMusic: string;
  filterTypeFavorites: string;
  comingSoon: string;
  filterTypeReset: string;
  sortLabel: string;
  sortByScore: string;
  sortByVotes: string;
  sortByPrice: string;
  sortByTokens: string;
  sortReset: string;
  orderLabel: string;
  orderDesc: string;
  orderAsc: string;
  orderReset: string;
  priceNote: string;
  personalNote: string;
  publicNote: string;
};

export type CapabilitiesDictionary = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: Array<{ title: string; description: string; points: string[] }>;
};

export type ArenaDictionary = {
  eyebrow: string;
  title: string;
  subtitle: string;
  advantages: string[];
  cta: string;
  previewTitle: string;
  leftText: string;
  rightText: string;
  thought: string;
  selected: string;
  compare: string;
  caption: string;
};

export type ImageLandingDictionary = {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  headline: string;
  body: string;
  cta: string;
  imageAlt: string;
  items: Array<{ title: string; text: string }>;
};

export type BlogPreviewDictionary = {
  eyebrow: string;
  title: string;
  allPosts: string;
  minutes: string;
  filterLanguage: string;
  filterTopic: string;
  filterTag: string;
  allLanguages: string;
  allTopics: string;
  allTags: string;
  readTime: string;
  published: string;
  inThisArticle: string;
  sectionsLabel: string;
  faqTitle: string;
  relatedTitle: string;
  articleLanguage: string;
  emptyState: string;
};

export type PricingLandingDictionary = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  notes: string[];
  benefits: Array<{ title: string; description: string }>;
};

export type StudioDictionary = {
  quality: string;
  style: string;
  styles: string;
  provider: string;
  model: string;
  size: string;
  format: string;
  unavailable: string;
  qualityHint: string;
  styleAuto: string;
  stylePhotorealistic: string;
  styleIllustration: string;
  styleCinematic: string;
  styleMinimal: string;
  style3d: string;
  styleCartoon: string;
  qualityTurbo: string;
  qualityDefault: string;
  qualityQuality: string;
  qualityLow: string;
  qualityMedium: string;
  qualityMinimal: string;
  qualityHigh: string;
  qualityOn: string;
  qualityOff: string;
};

export type Dictionary = {
  brand: string;
  nav: NavDictionary;
  workspace: WorkspaceDictionary;
  profile: ProfileDictionary;
  rating: RatingDictionary;
  capabilities: CapabilitiesDictionary;
  arena: ArenaDictionary;
  imageLanding: ImageLandingDictionary;
  blogPreview: BlogPreviewDictionary;
  pricingLanding: PricingLandingDictionary;
  hero: HeroDictionary;
  why: WhyDictionary;
  marquee: MarqueeDictionary;
  demo: DemoDictionary;
  showcase: ShowcaseDictionary;
  agents: AgentsDictionary;
  models: ModelsDictionary;
  pricing: PricingDictionary;
  pricingPage: PricingPageDictionary;
  faq: FaqDictionary;
  footer: FooterDictionary;
  auth: AuthDictionary;
  chat: ChatDictionary;
  studio: StudioDictionary;
  legal: LegalDictionary;
  support: SupportDictionary;
};
