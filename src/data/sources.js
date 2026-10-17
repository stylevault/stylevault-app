/**
 * Pilot source list. Every feed below responded with valid RSS/Atom items when
 * the list was built (October 2026). `country` is the publisher's home country
 * (null = pan-African or international desk); it nudges classification but never
 * overrides what the article is actually about.
 *
 * `kind` is what a source publishes: news (default), analysis (long-form commentary),
 * research (think tanks, survey and data organisations) or official (UN and other
 * public bodies). `scope: 'global'` marks sources that also cover other continents;
 * their stories are only kept when they concern an African country.
 *
 * All sources start with permission_status 'unreviewed'. Before public launch,
 * check each publisher's terms for feed reuse and record the outcome in the
 * `sources` table (permission_status / permission_notes). Sources marked
 * 'denied' are never collected.
 */
export const SOURCES = [
  // Research institutions, think tanks and official bodies
  { slug: 'africa-at-lse', name: 'Africa at LSE', homepage: 'https://blogs.lse.ac.uk/africaatlse/', feed: 'https://blogs.lse.ac.uk/africaatlse/feed/', country: null, lang: 'en', kind: 'analysis' },
  { slug: 'saiia', name: 'South African Institute of International Affairs', homepage: 'https://saiia.org.za', feed: 'https://saiia.org.za/feed/', country: null, lang: 'en', kind: 'research' },
  { slug: 'afrobarometer', name: 'Afrobarometer', homepage: 'https://www.afrobarometer.org', feed: 'https://www.afrobarometer.org/feed/', country: null, lang: 'en', kind: 'research' },
  { slug: 'mo-ibrahim', name: 'Mo Ibrahim Foundation', homepage: 'https://mo.ibrahim.foundation', feed: 'https://mo.ibrahim.foundation/rss.xml', country: null, lang: 'en', kind: 'research' },
  { slug: 'policy-center-new-south', name: 'Policy Center for the New South', homepage: 'https://www.policycenter.ma', feed: 'https://www.policycenter.ma/rss.xml', country: null, lang: 'en', kind: 'research' },
  { slug: 'africa-research-institute', name: 'Africa Research Institute', homepage: 'https://www.africaresearchinstitute.org', feed: 'https://www.africaresearchinstitute.org/feed/', country: null, lang: 'en', kind: 'research' },
  { slug: 'research-ict-africa', name: 'Research ICT Africa', homepage: 'https://researchictafrica.net', feed: 'https://researchictafrica.net/feed/', country: null, lang: 'en', kind: 'research' },
  { slug: 'crisis-group', name: 'International Crisis Group', homepage: 'https://www.crisisgroup.org/africa', feed: 'https://www.crisisgroup.org/rss.xml', country: null, lang: 'en', kind: 'research', scope: 'global' },
  { slug: 'uneca', name: 'UN Economic Commission for Africa', homepage: 'https://www.uneca.org', feed: 'https://www.uneca.org/rss.xml', country: null, lang: 'en', kind: 'official' },
  { slug: 'un-news-africa', name: 'UN News: Africa', homepage: 'https://news.un.org/en/news/region/africa', feed: 'https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml', country: null, lang: 'en', kind: 'official' },
  { slug: 'who-africa', name: 'WHO Regional Office for Africa', homepage: 'https://www.afro.who.int', feed: 'https://www.afro.who.int/rss.xml', country: null, lang: 'en', kind: 'official' },
  { slug: 'le-monde-africa', name: 'Le Monde Africa', homepage: 'https://www.lemonde.fr/en/le-monde-africa/', feed: 'https://www.lemonde.fr/en/le-monde-africa/rss_full.xml', country: null, lang: 'en' },
  { slug: 'rfi-africa-en', name: 'RFI Africa', homepage: 'https://www.rfi.fr/en/africa/', feed: 'https://www.rfi.fr/en/africa/rss', country: null, lang: 'en' },

  // Pan-African & international Africa desks
  { slug: 'bbc-africa', name: 'BBC News Africa', homepage: 'https://www.bbc.com/news/world/africa', feed: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', country: null, lang: 'en' },
  { slug: 'africanews', name: 'Africanews', homepage: 'https://www.africanews.com', feed: 'https://www.africanews.com/feed/rss', country: null, lang: 'en' },
  { slug: 'conversation-africa', name: 'The Conversation Africa', homepage: 'https://theconversation.com/africa', feed: 'https://theconversation.com/africa/articles.atom', country: null, lang: 'en', kind: 'analysis' },
  { slug: 'africa-report', name: 'The Africa Report', homepage: 'https://www.theafricareport.com', feed: 'https://www.theafricareport.com/feed/', country: null, lang: 'en', kind: 'analysis' },
  { slug: 'african-business', name: 'African Business', homepage: 'https://african.business', feed: 'https://african.business/feed/', country: null, lang: 'en', kind: 'analysis' },
  { slug: 'how-we-made-it', name: 'How We Made It In Africa', homepage: 'https://www.howwemadeitinafrica.com', feed: 'https://www.howwemadeitinafrica.com/feed/', country: null, lang: 'en', kind: 'analysis' },
  { slug: 'african-arguments', name: 'African Arguments', homepage: 'https://africanarguments.org', feed: 'https://www.africanarguments.org/feed/', country: null, lang: 'en', kind: 'analysis' },
  { slug: 'voa-africa', name: 'VOA Africa', homepage: 'https://www.voaafrica.com', feed: 'https://www.voaafrica.com/api/', country: null, lang: 'en' },
  { slug: 'techcabal', name: 'TechCabal', homepage: 'https://techcabal.com', feed: 'https://techcabal.com/feed/', country: null, lang: 'en' },
  { slug: 'disrupt-africa', name: 'Disrupt Africa', homepage: 'https://disrupt-africa.com', feed: 'https://disrupt-africa.com/feed/', country: null, lang: 'en' },
  { slug: 'weetracker', name: 'WeeTracker', homepage: 'https://weetracker.com', feed: 'https://weetracker.com/feed/', country: null, lang: 'en' },
  { slug: 'rias-colony', name: "Ria's Colony", homepage: 'https://riascolony.org/blog', feed: 'https://riascolony.org/blog', country: null, lang: 'en', kind: 'analysis' },
  { slug: 'jeune-afrique', name: 'Jeune Afrique', homepage: 'https://www.jeuneafrique.com', feed: 'https://www.jeuneafrique.com/feed/', country: null, lang: 'fr' },
  { slug: 'rfi-afrique', name: 'RFI Afrique', homepage: 'https://www.rfi.fr/fr/afrique/', feed: 'https://www.rfi.fr/fr/afrique/rss', country: null, lang: 'fr' },

  // North Africa
  { slug: 'tsa-algerie', name: 'TSA Algérie', homepage: 'https://www.tsa-algerie.com', feed: 'https://www.tsa-algerie.com/feed/', country: 'DZ', lang: 'fr' },
  { slug: 'egypt-independent', name: 'Egypt Independent', homepage: 'https://egyptindependent.com', feed: 'https://egyptindependent.com/feed/', country: 'EG', lang: 'en' },
  { slug: 'daily-news-egypt', name: 'Daily News Egypt', homepage: 'https://www.dailynewsegypt.com', feed: 'https://www.dailynewsegypt.com/feed/', country: 'EG', lang: 'en' },
  { slug: 'libya-herald', name: 'Libya Herald', homepage: 'https://libyaherald.com', feed: 'https://libyaherald.com/feed/', country: 'LY', lang: 'en' },
  { slug: 'hespress-en', name: 'Hespress English', homepage: 'https://en.hespress.com', feed: 'https://en.hespress.com/feed', country: 'MA', lang: 'en' },
  { slug: 'la-presse-tn', name: 'La Presse de Tunisie', homepage: 'https://lapresse.tn', feed: 'https://lapresse.tn/feed/', country: 'TN', lang: 'fr' },
  { slug: 'mosaique-fm', name: 'Mosaïque FM', homepage: 'https://www.mosaiquefm.net', feed: 'https://www.mosaiquefm.net/fr/rss', country: 'TN', lang: 'fr' },

  // West Africa
  { slug: '24h-au-benin', name: '24 Heures au Bénin', homepage: 'https://www.24haubenin.info', feed: 'https://www.24haubenin.info/spip.php?page=backend', country: 'BJ', lang: 'fr' },
  { slug: 'la-nouvelle-tribune', name: 'La Nouvelle Tribune', homepage: 'https://www.lanouvelletribune.info', feed: 'https://www.lanouvelletribune.info/feed/', country: 'BJ', lang: 'fr' },
  { slug: 'lefaso-net', name: 'Lefaso.net', homepage: 'https://lefaso.net', feed: 'https://lefaso.net/spip.php?page=backend', country: 'BF', lang: 'fr' },
  { slug: 'le-pays-bf', name: 'Le Pays', homepage: 'https://www.lepays.bf', feed: 'https://www.lepays.bf/feed/', country: 'BF', lang: 'fr' },
  { slug: 'linfodrome', name: "L'Infodrome", homepage: 'https://www.linfodrome.com', feed: 'https://www.linfodrome.com/rss', country: 'CI', lang: 'fr' },
  { slug: 'foroyaa', name: 'Foroyaa', homepage: 'https://www.foroyaa.net', feed: 'https://www.foroyaa.net/feed/', country: 'GM', lang: 'en' },
  { slug: 'myjoyonline', name: 'MyJoyOnline', homepage: 'https://www.myjoyonline.com', feed: 'https://www.myjoyonline.com/feed/', country: 'GH', lang: 'en' },
  { slug: 'graphic-online', name: 'Graphic Online', homepage: 'https://www.graphic.com.gh', feed: 'https://www.graphic.com.gh/news.feed?type=rss', country: 'GH', lang: 'en' },
  { slug: 'ghanaian-times', name: 'Ghanaian Times', homepage: 'https://www.ghanaiantimes.com.gh', feed: 'https://www.ghanaiantimes.com.gh/feed/', country: 'GH', lang: 'en' },
  { slug: 'guineenews', name: 'Guinéenews', homepage: 'https://guineenews.org', feed: 'https://guineenews.org/feed/', country: 'GN', lang: 'fr' },
  { slug: 'frontpage-africa', name: 'FrontPage Africa', homepage: 'https://frontpageafricaonline.com', feed: 'https://frontpageafricaonline.com/feed/', country: 'LR', lang: 'en' },
  { slug: 'new-dawn-liberia', name: 'The New Dawn', homepage: 'https://thenewdawnliberia.com', feed: 'https://thenewdawnliberia.com/feed/', country: 'LR', lang: 'en' },
  { slug: 'premium-times', name: 'Premium Times', homepage: 'https://www.premiumtimesng.com', feed: 'https://www.premiumtimesng.com/feed', country: 'NG', lang: 'en' },
  { slug: 'nairametrics', name: 'Nairametrics', homepage: 'https://nairametrics.com', feed: 'https://nairametrics.com/feed/', country: 'NG', lang: 'en' },
  { slug: 'businessday-ng', name: 'BusinessDay', homepage: 'https://businessday.ng', feed: 'https://businessday.ng/feed/', country: 'NG', lang: 'en' },
  { slug: 'punch', name: 'Punch', homepage: 'https://punchng.com', feed: 'https://punchng.com/feed/', country: 'NG', lang: 'en' },
  { slug: 'vanguard', name: 'Vanguard', homepage: 'https://www.vanguardngr.com', feed: 'https://www.vanguardngr.com/feed/', country: 'NG', lang: 'en' },
  { slug: 'seneweb', name: 'Seneweb', homepage: 'https://www.seneweb.com', feed: 'https://www.seneweb.com/feed/', country: 'SN', lang: 'fr' },
  { slug: 'aps-senegal', name: 'Agence de Presse Sénégalaise', homepage: 'https://www.aps.sn', feed: 'https://www.aps.sn/feed/', country: 'SN', lang: 'fr' },
  { slug: 'le-quotidien-sn', name: 'Le Quotidien', homepage: 'https://www.lequotidien.sn', feed: 'https://www.lequotidien.sn/feed/', country: 'SN', lang: 'fr' },
  { slug: 'sierraloaded', name: 'Sierraloaded', homepage: 'https://www.sierraloaded.sl', feed: 'https://www.sierraloaded.sl/feed/', country: 'SL', lang: 'en' },

  // Central Africa
  { slug: 'iwacu', name: 'Iwacu', homepage: 'https://www.iwacu-burundi.org', feed: 'https://www.iwacu-burundi.org/feed/', country: 'BI', lang: 'fr' },
  { slug: 'journal-du-cameroun', name: 'Journal du Cameroun', homepage: 'https://www.journalducameroun.com', feed: 'https://www.journalducameroun.com/feed/', country: 'CM', lang: 'fr' },
  { slug: 'corbeau-news', name: 'Corbeau News Centrafrique', homepage: 'https://corbeaunews-centrafrique.org', feed: 'https://corbeaunews-centrafrique.org/feed/', country: 'CF', lang: 'fr' },
  { slug: 'adiac-congo', name: 'Les Dépêches de Brazzaville', homepage: 'https://www.adiac-congo.com', feed: 'https://www.adiac-congo.com/rss.xml', country: 'CG', lang: 'fr' },
  { slug: 'actualite-cd', name: 'Actualite.cd', homepage: 'https://www.actualite.cd', feed: 'https://www.actualite.cd/feed', country: 'CD', lang: 'fr' },
  { slug: 'radio-okapi', name: 'Radio Okapi', homepage: 'https://www.radiookapi.net', feed: 'https://www.radiookapi.net/rss.xml', country: 'CD', lang: 'fr' },
  { slug: 'ahora-eg', name: 'Ahora EG', homepage: 'https://ahoraeg.com', feed: 'https://ahoraeg.com/feed/', country: 'GQ', lang: 'es' },
  { slug: 'gabonreview', name: 'Gabonreview', homepage: 'https://www.gabonreview.com', feed: 'https://www.gabonreview.com/feed/', country: 'GA', lang: 'fr' },
  { slug: 'tela-non', name: 'Téla Nón', homepage: 'https://www.telanon.info', feed: 'https://www.telanon.info/feed/', country: 'ST', lang: 'pt' },

  // East Africa
  { slug: 'shabait', name: 'Shabait', homepage: 'https://shabait.com', feed: 'https://shabait.com/feed/', country: 'ER', lang: 'en' },
  { slug: 'reporter-ethiopia', name: 'The Reporter Ethiopia', homepage: 'https://www.thereporterethiopia.com', feed: 'https://www.thereporterethiopia.com/feed/', country: 'ET', lang: 'en' },
  { slug: 'ethiopia-observer', name: 'Ethiopia Observer', homepage: 'https://www.ethiopiaobserver.com', feed: 'https://www.ethiopiaobserver.com/feed/', country: 'ET', lang: 'en' },
  { slug: 'capital-fm-kenya', name: 'Capital FM Kenya', homepage: 'https://www.capitalfm.co.ke', feed: 'https://www.capitalfm.co.ke/news/feed/', country: 'KE', lang: 'en' },
  { slug: 'the-standard-ke', name: 'The Standard', homepage: 'https://www.standardmedia.co.ke', feed: 'https://www.standardmedia.co.ke/rss/headlines.php', country: 'KE', lang: 'en' },
  { slug: 'kenyans-co-ke', name: 'Kenyans.co.ke', homepage: 'https://www.kenyans.co.ke', feed: 'https://www.kenyans.co.ke/feeds/news', country: 'KE', lang: 'en' },
  { slug: 'madagascar-tribune', name: 'Madagascar Tribune', homepage: 'https://www.madagascar-tribune.com', feed: 'https://www.madagascar-tribune.com/spip.php?page=backend', country: 'MG', lang: 'fr' },
  { slug: 'defimedia', name: 'Defimedia', homepage: 'https://defimedia.info', feed: 'https://defimedia.info/rss.xml', country: 'MU', lang: 'fr' },
  { slug: 'le-mauricien', name: 'Le Mauricien', homepage: 'https://www.lemauricien.com', feed: 'https://www.lemauricien.com/feed/', country: 'MU', lang: 'fr' },
  { slug: 'kt-press', name: 'KT Press', homepage: 'https://www.ktpress.rw', feed: 'https://www.ktpress.rw/feed/', country: 'RW', lang: 'en' },
  { slug: 'somali-guardian', name: 'Somali Guardian', homepage: 'https://www.somaliguardian.com', feed: 'https://www.somaliguardian.com/feed/', country: 'SO', lang: 'en' },
  { slug: 'radio-dalsan', name: 'Radio Dalsan', homepage: 'https://www.radiodalsan.com', feed: 'https://www.radiodalsan.com/feed', country: 'SO', lang: 'en' },
  { slug: 'radio-tamazuj', name: 'Radio Tamazuj', homepage: 'https://www.radiotamazuj.org', feed: 'https://www.radiotamazuj.org/en/rss', country: 'SS', lang: 'en' },
  { slug: 'eye-radio', name: 'Eye Radio', homepage: 'https://eyeradio.org', feed: 'https://eyeradio.org/feed/', country: 'SS', lang: 'en' },
  { slug: 'sudans-post', name: 'Sudans Post', homepage: 'https://www.sudanspost.com', feed: 'https://www.sudanspost.com/feed/', country: 'SS', lang: 'en' },
  { slug: 'dabanga', name: 'Dabanga', homepage: 'https://www.dabangasudan.org/en', feed: 'https://www.dabangasudan.org/en/feed', country: 'SD', lang: 'en' },
  { slug: 'daily-news-tz', name: 'Daily News', homepage: 'https://www.dailynews.co.tz', feed: 'https://www.dailynews.co.tz/feed/', country: 'TZ', lang: 'en' },
  { slug: 'nile-post', name: 'Nile Post', homepage: 'https://nilepost.co.ug', feed: 'https://nilepost.co.ug/feed/', country: 'UG', lang: 'en' },
  { slug: 'the-independent-ug', name: 'The Independent Uganda', homepage: 'https://www.independent.co.ug', feed: 'https://www.independent.co.ug/feed/', country: 'UG', lang: 'en' },
  { slug: 'observer-ug', name: 'The Observer', homepage: 'https://observer.ug', feed: 'https://observer.ug/feed', country: 'UG', lang: 'en' },

  // Southern Africa
  { slug: 'sunday-standard-bw', name: 'Sunday Standard', homepage: 'https://www.sundaystandard.info', feed: 'https://www.sundaystandard.info/feed/', country: 'BW', lang: 'en' },
  { slug: 'times-of-eswatini', name: 'Times of Eswatini', homepage: 'https://www.times.co.sz', feed: 'https://www.times.co.sz/feed/', country: 'SZ', lang: 'en' },
  { slug: 'nyasa-times', name: 'Nyasa Times', homepage: 'https://www.nyasatimes.com', feed: 'https://www.nyasatimes.com/feed/', country: 'MW', lang: 'en' },
  { slug: 'malawi24', name: 'Malawi24', homepage: 'https://malawi24.com', feed: 'https://www.malawi24.com/feed/', country: 'MW', lang: 'en' },
  { slug: 'club-of-mozambique', name: 'Club of Mozambique', homepage: 'https://clubofmozambique.com', feed: 'https://clubofmozambique.com/feed/', country: 'MZ', lang: 'en' },
  { slug: 'the-namibian', name: 'The Namibian', homepage: 'https://www.namibian.com.na', feed: 'https://www.namibian.com.na/feed/', country: 'NA', lang: 'en' },
  { slug: 'new-era', name: 'New Era', homepage: 'https://neweralive.na', feed: 'https://neweralive.na/feed/', country: 'NA', lang: 'en' },
  { slug: 'daily-maverick', name: 'Daily Maverick', homepage: 'https://www.dailymaverick.co.za', feed: 'https://www.dailymaverick.co.za/dmrss/', country: 'ZA', lang: 'en' },
  { slug: 'iol', name: 'IOL', homepage: 'https://www.iol.co.za', feed: 'https://www.iol.co.za/rss', country: 'ZA', lang: 'en' },
  { slug: 'moneyweb', name: 'Moneyweb', homepage: 'https://www.moneyweb.co.za', feed: 'https://www.moneyweb.co.za/feed/', country: 'ZA', lang: 'en' },
  { slug: 'lusaka-times', name: 'Lusaka Times', homepage: 'https://www.lusakatimes.com', feed: 'https://www.lusakatimes.com/feed/', country: 'ZM', lang: 'en' },
  { slug: 'mwebantu', name: 'Mwebantu', homepage: 'https://www.mwebantu.com', feed: 'https://www.mwebantu.com/feed/', country: 'ZM', lang: 'en' },
  { slug: 'newzimbabwe', name: 'NewZimbabwe', homepage: 'https://www.newzimbabwe.com', feed: 'https://www.newzimbabwe.com/feed/', country: 'ZW', lang: 'en' },
  { slug: 'newsday-zw', name: 'NewsDay', homepage: 'https://www.newsday.co.zw', feed: 'https://www.newsday.co.zw/feed/', country: 'ZW', lang: 'en' },
];
