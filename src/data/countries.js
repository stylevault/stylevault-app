/**
 * The 54 African countries represented in StyleVault, grouped by African Union region.
 *
 * `terms` are matched case-sensitively as whole words in headlines and summaries
 * (country names in English/French/Portuguese, demonyms, major cities, and a few
 * unambiguous institutions or long-serving figures). `exclude` phrases are removed
 * from the text before matching so that, for example, "Niger Delta" does not tag
 * Niger and "Gulf of Guinea" does not tag Guinea.
 *
 * These lists are the classification rules: edit them freely as coverage grows.
 */
export const COUNTRIES = [
  // ── North Africa ──────────────────────────────────────────────────────────
  { code: 'DZ', name: 'Algeria', region: 'North', capital: 'Algiers',
    terms: ['Algeria', 'Algerian', 'Algérie', 'Algérien', 'Algérienne', 'Algiers', 'Alger', 'Oran', 'Sonatrach', 'Tebboune'] },
  { code: 'EG', name: 'Egypt', region: 'North', capital: 'Cairo',
    terms: ['Egypt', 'Egyptian', 'Égypte', 'Egypte', 'Égyptien', 'Cairo', 'Le Caire', 'Alexandria', 'Giza', 'Suez', 'Sharm el-Sheikh', 'Luxor', 'Aswan', 'Sisi'] },
  { code: 'LY', name: 'Libya', region: 'North', capital: 'Tripoli',
    terms: ['Libya', 'Libyan', 'Libye', 'Libyen', 'Tripoli', 'Benghazi', 'Misrata', 'Haftar', 'Dbeibah'] },
  { code: 'MR', name: 'Mauritania', region: 'North', capital: 'Nouakchott',
    terms: ['Mauritania', 'Mauritanian', 'Mauritanie', 'Mauritanien', 'Nouakchott', 'Nouadhibou', 'Ghazouani'] },
  { code: 'MA', name: 'Morocco', region: 'North', capital: 'Rabat',
    terms: ['Morocco', 'Moroccan', 'Maroc', 'Marocain', 'Marocaine', 'Rabat', 'Casablanca', 'Marrakech', 'Marrakesh', 'Tangier', 'Tanger', 'Fez', 'Fès', 'Agadir', 'Tanger Med'] },
  { code: 'TN', name: 'Tunisia', region: 'North', capital: 'Tunis',
    terms: ['Tunisia', 'Tunisian', 'Tunisie', 'Tunisien', 'Tunisienne', 'Tunis', 'Sfax', 'Sousse'] },

  // ── West Africa ───────────────────────────────────────────────────────────
  { code: 'BJ', name: 'Benin', region: 'West', capital: 'Porto-Novo',
    terms: ['Benin', 'Bénin', 'Beninese', 'Béninois', 'Béninoise', 'Cotonou', 'Porto-Novo', 'Talon'],
    exclude: ['Benin City', 'Bight of Benin'] },
  { code: 'BF', name: 'Burkina Faso', region: 'West', capital: 'Ouagadougou',
    terms: ['Burkina Faso', 'Burkina', 'Burkinabe', 'Burkinabè', 'Ouagadougou', 'Ouaga', 'Bobo-Dioulasso'] },
  { code: 'CV', name: 'Cabo Verde', region: 'West', capital: 'Praia',
    terms: ['Cabo Verde', 'Cape Verde', 'Cap-Vert', 'Cape Verdean', 'Cabo-verdiano', 'Praia', 'Mindelo'] },
  { code: 'CI', name: "Côte d'Ivoire", region: 'West', capital: 'Yamoussoukro',
    terms: ["Côte d'Ivoire", 'Côte d’Ivoire', "Cote d'Ivoire", 'Cote d’Ivoire', 'Ivory Coast', 'Ivorian', 'Ivoirien', 'Ivoirienne', 'Abidjan', 'Yamoussoukro', 'San Pedro', 'Ouattara'] },
  { code: 'GM', name: 'Gambia', region: 'West', capital: 'Banjul',
    terms: ['Gambia', 'Gambian', 'Gambie', 'Banjul', 'Serrekunda'] },
  { code: 'GH', name: 'Ghana', region: 'West', capital: 'Accra',
    terms: ['Ghana', 'Ghanaian', 'Ghanaians', 'Ghanéen', 'Accra', 'Kumasi', 'Tema', 'Takoradi', 'Tamale', 'Mahama', 'cedi'] },
  { code: 'GN', name: 'Guinea', region: 'West', capital: 'Conakry',
    terms: ['Guinea', 'Guinean', 'Guinée', 'Guinéen', 'Guinéenne', 'Conakry', 'Doumbouya', 'Simandou'],
    exclude: ['Guinea-Bissau', 'Guinea Bissau', 'Guinée-Bissau', 'Guiné-Bissau', 'Equatorial Guinea', 'Equatorial Guinean', 'Guinée équatoriale', 'Papua New Guinea', 'New Guinea', 'Gulf of Guinea', 'Golfe de Guinée', 'Bissau-Guinean'] },
  { code: 'GW', name: 'Guinea-Bissau', region: 'West', capital: 'Bissau',
    terms: ['Guinea-Bissau', 'Guinea Bissau', 'Guinée-Bissau', 'Guiné-Bissau', 'Bissau-Guinean', 'Bissau'] },
  { code: 'LR', name: 'Liberia', region: 'West', capital: 'Monrovia',
    terms: ['Liberia', 'Liberian', 'Libéria', 'Monrovia', 'Boakai'] },
  { code: 'ML', name: 'Mali', region: 'West', capital: 'Bamako',
    terms: ['Mali', 'Malian', 'Malien', 'Malienne', 'Bamako', 'Timbuktu', 'Tombouctou', 'Goïta', 'Goita'] },
  { code: 'NE', name: 'Niger', region: 'West', capital: 'Niamey',
    terms: ['Niger', 'Nigérien', 'Nigérienne', 'Nigerien', 'Niamey', 'Agadez', 'Tiani'],
    exclude: ['Niger Delta', 'Niger State', 'River Niger', 'Niger River', 'Niger Basin', 'Niger Bridge', 'Delta du Niger'] },
  { code: 'NG', name: 'Nigeria', region: 'West', capital: 'Abuja',
    terms: ['Nigeria', 'Nigerian', 'Nigerians', 'Nigéria', 'Nigérian', 'Abuja', 'Lagos', 'Kano', 'Ibadan', 'Port Harcourt', 'Enugu', 'Kaduna', 'Benin City', 'Niger Delta', 'Niger State', 'Tinubu', 'Boko Haram', 'NNPC', 'NNPCL', 'Dangote', 'naira'] },
  { code: 'SN', name: 'Senegal', region: 'West', capital: 'Dakar',
    terms: ['Senegal', 'Senegalese', 'Sénégal', 'Sénégalais', 'Sénégalaise', 'Dakar', 'Thiès', 'Saint-Louis', 'Touba', 'Diomaye Faye', 'Sonko'] },
  { code: 'SL', name: 'Sierra Leone', region: 'West', capital: 'Freetown',
    terms: ['Sierra Leone', 'Sierra Leonean', 'Freetown', 'Julius Maada Bio'] },
  { code: 'TG', name: 'Togo', region: 'West', capital: 'Lomé',
    terms: ['Togo', 'Togolese', 'Togolais', 'Togolaise', 'Lomé', 'Lome', 'Gnassingbé'] },

  // ── Central Africa ────────────────────────────────────────────────────────
  { code: 'BI', name: 'Burundi', region: 'Central', capital: 'Gitega',
    terms: ['Burundi', 'Burundian', 'Burundais', 'Bujumbura', 'Gitega', 'Ndayishimiye'] },
  { code: 'CM', name: 'Cameroon', region: 'Central', capital: 'Yaoundé',
    terms: ['Cameroon', 'Cameroonian', 'Cameroun', 'Camerounais', 'Camerounaise', 'Yaoundé', 'Yaounde', 'Douala', 'Biya'] },
  { code: 'CF', name: 'Central African Republic', region: 'Central', capital: 'Bangui',
    terms: ['Central African Republic', 'Centrafrique', 'Centrafricain', 'Centrafricaine', 'Bangui', 'Touadéra', 'Touadera'] },
  { code: 'TD', name: 'Chad', region: 'Central', capital: "N'Djamena",
    terms: ['Chad', 'Chadian', 'Tchad', 'Tchadien', 'Tchadienne', "N'Djamena", 'N’Djamena', 'Ndjamena', 'Déby', 'Deby'],
    exclude: ['Lake Chad', 'Lac Tchad', 'Chad Basin'] },
  { code: 'CG', name: 'Congo', region: 'Central', capital: 'Brazzaville',
    terms: ['Republic of Congo', 'Republic of the Congo', 'Congo-Brazzaville', 'Congo Brazzaville', 'Brazzaville', 'Pointe-Noire', 'Sassou'],
    exclude: ['Democratic Republic of Congo', 'Democratic Republic of the Congo', 'République démocratique du Congo'] },
  { code: 'CD', name: 'DR Congo', region: 'Central', capital: 'Kinshasa',
    terms: ['Democratic Republic of Congo', 'Democratic Republic of the Congo', 'République démocratique du Congo', 'DR Congo', 'DRC', 'RDC', 'RD Congo', 'Congolese', 'Congolais', 'Kabila', 'Kinshasa', 'Goma', 'Bukavu', 'Lubumbashi', 'Kivu', 'Katanga', 'Ituri', 'Tshisekedi', 'Gécamines'] },
  { code: 'GQ', name: 'Equatorial Guinea', region: 'Central', capital: 'Malabo',
    terms: ['Equatorial Guinea', 'Equatorial Guinean', 'Guinée équatoriale', 'Guinea Ecuatorial', 'Malabo', 'Obiang'] },
  { code: 'GA', name: 'Gabon', region: 'Central', capital: 'Libreville',
    terms: ['Gabon', 'Gabonese', 'Gabonais', 'Gabonaise', 'Libreville', 'Port-Gentil', 'Oligui Nguema'] },
  { code: 'ST', name: 'São Tomé and Príncipe', region: 'Central', capital: 'São Tomé',
    terms: ['São Tomé', 'Sao Tome', 'São Tomé e Príncipe', 'Sao Tome and Principe', 'Santomean'] },

  // ── East Africa ───────────────────────────────────────────────────────────
  { code: 'KM', name: 'Comoros', region: 'East', capital: 'Moroni',
    terms: ['Comoros', 'Comorian', 'Comores', 'Comorien', 'Moroni', 'Anjouan', 'Azali'] },
  { code: 'DJ', name: 'Djibouti', region: 'East', capital: 'Djibouti',
    terms: ['Djibouti', 'Djiboutian', 'Djiboutien', 'Guelleh'] },
  { code: 'ER', name: 'Eritrea', region: 'East', capital: 'Asmara',
    terms: ['Eritrea', 'Eritrean', 'Érythrée', 'Asmara', 'Massawa', 'Afwerki'] },
  { code: 'ET', name: 'Ethiopia', region: 'East', capital: 'Addis Ababa',
    terms: ['Ethiopia', 'Ethiopian', 'Ethiopians', 'Éthiopie', 'Éthiopien', 'Addis Ababa', 'Addis Abeba', 'Tigray', 'Amhara', 'Oromia', 'Dire Dawa', 'Abiy Ahmed', 'Abiy', 'birr'] },
  { code: 'KE', name: 'Kenya', region: 'East', capital: 'Nairobi',
    terms: ['Kenya', 'Kenyan', 'Kenyans', 'Kényan', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Ruto', 'Safaricom', 'KCB'] },
  { code: 'MG', name: 'Madagascar', region: 'East', capital: 'Antananarivo',
    terms: ['Madagascar', 'Malagasy', 'Malgache', 'Antananarivo', 'Toamasina'] },
  { code: 'MU', name: 'Mauritius', region: 'East', capital: 'Port Louis',
    terms: ['Mauritius', 'Mauritian', 'Île Maurice', 'île Maurice', 'Mauricien', 'Mauricienne', 'Port Louis', 'Port-Louis'] },
  { code: 'RW', name: 'Rwanda', region: 'East', capital: 'Kigali',
    terms: ['Rwanda', 'Rwandan', 'Rwandans', 'Rwandais', 'Rwandaise', 'Kigali', 'Kagame', 'RDB', 'RwandAir'] },
  { code: 'SC', name: 'Seychelles', region: 'East', capital: 'Victoria',
    terms: ['Seychelles', 'Seychellois', 'Mahé', 'Praslin'] },
  { code: 'SO', name: 'Somalia', region: 'East', capital: 'Mogadishu',
    terms: ['Somalia', 'Somali', 'Somalis', 'Somalie', 'Mogadishu', 'Mogadiscio', 'Hargeisa', 'Somaliland', 'Puntland', 'Kismayo', 'al-Shabaab', 'Al-Shabaab', 'Berbera'] },
  { code: 'SS', name: 'South Sudan', region: 'East', capital: 'Juba',
    terms: ['South Sudan', 'South Sudanese', 'Soudan du Sud', 'Juba', 'Salva Kiir', 'Kiir', 'Machar'] },
  { code: 'SD', name: 'Sudan', region: 'East', capital: 'Khartoum',
    terms: ['Sudan', 'Sudanese', 'Soudan', 'Soudanais', 'Khartoum', 'Omdurman', 'Darfur', 'El Fasher', 'Port Sudan', 'Kordofan', 'Rapid Support Forces', 'Burhan', 'Hemedti'],
    exclude: ['South Sudan', 'South Sudanese', 'Soudan du Sud'] },
  { code: 'TZ', name: 'Tanzania', region: 'East', capital: 'Dodoma',
    terms: ['Tanzania', 'Tanzanian', 'Tanzanians', 'Tanzanie', 'Dar es Salaam', 'Dodoma', 'Zanzibar', 'Arusha', 'Mwanza', 'Serengeti', 'Kilimanjaro', 'Samia Suluhu'] },
  { code: 'UG', name: 'Uganda', region: 'East', capital: 'Kampala',
    terms: ['Uganda', 'Ugandan', 'Ugandans', 'Ouganda', 'Kampala', 'Entebbe', 'Gulu', 'Jinja', 'Museveni'] },

  // ── Southern Africa ───────────────────────────────────────────────────────
  { code: 'AO', name: 'Angola', region: 'Southern', capital: 'Luanda',
    terms: ['Angola', 'Angolan', 'Angolais', 'Angolano', 'Luanda', 'Lobito', 'Benguela', 'Sonangol', 'Lourenço'] },
  { code: 'BW', name: 'Botswana', region: 'Southern', capital: 'Gaborone',
    terms: ['Botswana', 'Motswana', 'Batswana', 'Gaborone', 'Francistown', 'Debswana'] },
  { code: 'SZ', name: 'Eswatini', region: 'Southern', capital: 'Mbabane',
    terms: ['Eswatini', 'Swaziland', 'Swazi', 'Mbabane', 'Manzini', 'Mswati'] },
  { code: 'LS', name: 'Lesotho', region: 'Southern', capital: 'Maseru',
    terms: ['Lesotho', 'Basotho', 'Mosotho', 'Maseru'] },
  { code: 'MW', name: 'Malawi', region: 'Southern', capital: 'Lilongwe',
    terms: ['Malawi', 'Malawian', 'Malawians', 'Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Mutharika', 'Chakwera'] },
  { code: 'MZ', name: 'Mozambique', region: 'Southern', capital: 'Maputo',
    terms: ['Mozambique', 'Mozambican', 'Moçambique', 'Mozambicain', 'Maputo', 'Beira', 'Nampula', 'Cabo Delgado'] },
  { code: 'NA', name: 'Namibia', region: 'Southern', capital: 'Windhoek',
    terms: ['Namibia', 'Namibian', 'Namibians', 'Namibie', 'Windhoek', 'Walvis Bay', 'Swakopmund', 'Nandi-Ndaitwah'] },
  { code: 'ZA', name: 'South Africa', region: 'Southern', capital: 'Pretoria',
    terms: ['South Africa', 'South African', 'South Africans', 'Afrique du Sud', 'Sud-africain', 'Johannesburg', 'Joburg', 'Cape Town', 'Pretoria', 'Durban', 'Soweto', 'Gauteng', 'KwaZulu-Natal', 'Eastern Cape', 'Western Cape', 'Eskom', 'Transnet', 'Ramaphosa', 'JSE', 'rand'] },
  { code: 'ZM', name: 'Zambia', region: 'Southern', capital: 'Lusaka',
    terms: ['Zambia', 'Zambian', 'Zambians', 'Zambie', 'Lusaka', 'Ndola', 'Kitwe', 'Copperbelt', 'Hichilema', 'kwacha'] },
  { code: 'ZW', name: 'Zimbabwe', region: 'Southern', capital: 'Harare',
    terms: ['Zimbabwe', 'Zimbabwean', 'Zimbabweans', 'Harare', 'Bulawayo', 'Mutare', 'Mnangagwa', 'ZANU-PF', 'Zanu-PF'] },
];

export const REGIONS = ['North', 'West', 'Central', 'East', 'Southern'];

export const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
