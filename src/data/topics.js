/**
 * Topic feeds and their keyword rules.
 *
 * Keywords are matched as whole words, case-insensitively unless the keyword
 * contains capitals (so 'WHO' or 'AI' never match 'who' or 'said'); a trailing `*` matches
 * any word starting with that stem (e.g. `invest*` → investor, investment).
 * Multi-word phrases are fine. English and French terms live side by side because
 * a large share of African newsrooms publish in French.
 */
export const TOPICS = [
  { slug: 'business', name: 'Business & Finance', color: '#C2502D',
    keywords: ['business', 'economy', 'economic', 'econom*', 'bank*', 'finance', 'financial', 'invest*', 'market*', 'stock*', 'shares', 'bond*', 'eurobond', 'inflation', 'interest rate*', 'central bank', 'GDP', 'revenue', 'profit*', 'startup*', 'start-up*', 'funding', 'fintech', 'IMF', 'world bank', 'afreximbank', 'AfDB', 'budget', 'tax*', 'debt', 'currency', 'exchange rate', 'IPO', 'merger', 'acquisition', 'entreprise*', 'économie', 'banque*', 'investiss*', 'bourse', 'croissance', 'dette', 'economia', 'empresa*', 'banco*', 'investimento*', 'economía', 'inversión', 'mercado*'] },
  { slug: 'politics', name: 'Politics & Governance', color: '#453240',
    keywords: ['election*', 'president*', 'parliament*', 'minister*', 'government', 'governance', 'opposition', 'senate', 'senator*', 'vote*', 'voting', 'ballot*', 'coup', 'junta', 'constitution*', 'policy', 'policies', 'corruption', 'diplomat*', 'summit', 'african union', 'AU summit', 'ECOWAS', 'SADC', 'protest*', 'court', 'judiciary', 'cabinet', 'MP', 'MPs', 'governor*', 'élection*', 'présiden*', 'gouvernement', 'ministre*', 'parlement*', 'assemblée nationale', 'opposition', 'détournement*', 'eleição', 'eleições', 'governo', 'presidente', 'parlamento', 'ministro*', 'elecciones', 'gobierno', 'diputado*'] },
  { slug: 'trade', name: 'Trade & Integration', color: '#D99A2B',
    keywords: ['trade', 'AfCFTA', 'free trade', 'export*', 'import*', 'tariff*', 'customs', 'port', 'ports', 'shipping', 'logistics', 'corridor*', 'border*', 'EAC', 'ECOWAS', 'SADC', 'COMESA', 'PAPSS', 'regional integration', 'freight', 'container*', 'commerce', 'ZLECAf', 'douane*', 'exportation*', 'importation*', 'comércio', 'exportação', 'comercio', 'exportación'] },
  { slug: 'technology', name: 'Technology', color: '#9E5E23',
    keywords: ['tech', 'technology', 'technolog*', 'digital', 'internet', 'broadband', 'telecom*', 'mobile money', 'fintech', 'startup*', 'start-up*', 'software', 'app', 'apps', 'artificial intelligence', 'AI', 'data cent*', 'cyber*', 'satellite', 'innovation', 'e-commerce', 'smartphone*', '5G', 'numérique', 'technologie*', 'intelligence artificielle'] },
  { slug: 'agriculture', name: 'Agriculture & Food', color: '#5E7D2A',
    keywords: ['agricultur*', 'agri*', 'farm*', 'crop*', 'harvest*', 'cocoa', 'coffee', 'tea', 'maize', 'wheat', 'rice', 'cassava', 'livestock', 'cattle', 'fertiliser*', 'fertilizer*', 'irrigation', 'food security', 'food prices', 'fisher*', 'cashew', 'cotton', 'agricole*', 'agriculteur*', 'cacao', 'récolte*', 'élevage', 'sécurité alimentaire'] },
  { slug: 'education', name: 'Education', color: '#7A4E9C',
    keywords: ['education', 'educational', 'school*', 'student*', 'teacher*', 'universit*', 'college*', 'exam*', 'scholarship*', 'curriculum', 'literacy', 'tuition', 'WAEC', 'JAMB', 'KCSE', 'matric', 'éducation', 'école*', 'élève*', 'étudiant*', 'enseignant*', 'baccalauréat', 'educação', 'escola*', 'educación'] },
  { slug: 'tourism', name: 'Tourism & Travel', color: '#1E6B54',
    keywords: ['tourism', 'tourist*', 'travel*', 'visa*', 'hotel*', 'safari*', 'airline*', 'aviation', 'airport*', 'flight*', 'resort*', 'hospitality', 'heritage', 'national park*', 'wildlife', 'gorilla*', 'beach*', 'cruise', 'tourisme', 'touriste*', 'voyage*', 'hôtel*', 'aéroport*', 'compagnie aérienne', 'turismo', 'turista*'] },
  { slug: 'style', name: 'Style & Creative', color: '#B23A6B',
    keywords: ['fashion', 'designer*', 'couture', 'textile*', 'kente', 'ankara', 'wax print', 'runway', 'fashion week', 'music', 'musician*', 'afrobeats', 'amapiano', 'album', 'film*', 'nollywood', 'cinema', 'movie*', 'art', 'artist*', 'gallery', 'exhibition', 'museum*', 'culture', 'cultural', 'festival*', 'literature', 'novel*', 'author*', 'poet*', 'design', 'architect*', 'craft*', 'creative*', 'défilé', 'musique', 'cinéma', 'artiste*', 'festival*', 'patrimoine', 'culturel*'] },
  { slug: 'energy', name: 'Energy & Infrastructure', color: '#E07A1F',
    keywords: ['energy', 'electricity', 'power', 'power plant*', 'grid', 'solar', 'wind', 'hydro*', 'oil', 'gas', 'LNG', 'petroleum', 'refiner*', 'pipeline*', 'mining', 'mines', 'minerals', 'lithium', 'copper', 'gold', 'cobalt', 'infrastructure', 'railway*', 'rail', 'road*', 'bridge*', 'dam', 'construction', 'load shedding', 'load-shedding', 'énergie', 'électricité', 'pétrole', 'pétrolier*', 'gaz', 'solaire', 'minier*', 'infrastructure*', 'chemin de fer', 'petróleo', 'combustible', 'combustível', 'energia', 'energía'] },
  { slug: 'health', name: 'Health', color: '#C23B3B',
    keywords: ['health', 'healthcare', 'hospital*', 'doctor*', 'nurse*', 'disease*', 'outbreak*', 'virus', 'vaccine*', 'vaccination', 'malaria', 'HIV', 'AIDS', 'tuberculosis', 'cholera', 'ebola', 'mpox', 'measles', 'polio', 'maternal', 'medicine*', 'pharma*', 'clinic*', 'WHO', 'patients', 'santé', 'hôpita*', 'maladie*', 'épidémie*', 'paludisme', 'médecin*', 'saúde', 'salud'] },
  { slug: 'climate', name: 'Climate & Environment', color: '#2F7D5B',
    keywords: ['climate', 'climate change', 'environment*', 'drought*', 'flood*', 'flooding', 'rainfall', 'cyclone*', 'deforestation', 'forest*', 'conservation', 'biodiversity', 'pollution', 'carbon', 'emissions', 'renewable*', 'green hydrogen', 'COP30', 'COP31', 'heatwave', 'climat', 'environnement*', 'sécheresse', 'inondation*', 'déforestation'] },
  { slug: 'security', name: 'Security & Justice', color: '#5A5148',
    keywords: ['conflict*', 'war', 'attack*', 'militant*', 'insurgen*', 'jihadist*', 'terror*', 'army', 'military', 'troops', 'soldiers', 'rebel*', 'ceasefire', 'peace talks', 'peacekeep*', 'kidnap*', 'bandit*', 'killed', 'violence', 'refugee*', 'displaced', 'humanitarian', 'conflit*', 'attaque*', 'armée', 'militaire*', 'terroris*', 'rebelle*', 'réfugié*', 'police', 'policía', 'polícia', 'arrest*', 'crime*', 'criminal*', 'murder*', 'prison*', 'jail*', 'sentenced', 'convicted', 'robbery', 'drug*', 'trafficking', 'smuggl*', 'fraud', 'abduct*', 'gang*', 'interpellé*', 'arrêté*', 'meurtre*', 'drogue*', 'condamné*', 'trafic', 'enquête', 'crimin*', 'agression*'] },
  { slug: 'sport', name: 'Sport', color: '#BF532B',
    keywords: ['football', 'soccer', 'AFCON', 'CAN 2025', 'world cup', 'CAF', 'premier league', 'athletics', 'marathon', 'rugby', 'cricket', 'basketball', 'BAL', 'boxing', 'olympic*', 'striker', 'coach', 'super eagles', 'black stars', 'bafana', 'harambee stars', 'lions de la teranga', 'pharaohs', 'atlas lions', 'match', 'tournament', 'championship', 'sport*', 'coupe du monde', 'ballon d’or', "ballon d'or"] },
];

export const TOPIC_BY_SLUG = Object.fromEntries(TOPICS.map((t) => [t.slug, t]));
