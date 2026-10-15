/**
 * Reference facts for each country file. Figures that change (population, GDP,
 * inflation…) are NOT kept here: they are fetched from the World Bank and shown
 * with their year and source. These are slower-moving facts.
 *
 * `languages` lists the main languages in official or wide national use (not an
 * exhaustive or legal list). `blocs` are African Union-recognised regional economic
 * communities plus the Alliance of Sahel States (AES). Review periodically:
 * memberships change.
 */
export const BLOCS = {
  AMU: 'Arab Maghreb Union',
  'CEN-SAD': 'Community of Sahel-Saharan States',
  COMESA: 'Common Market for Eastern and Southern Africa',
  EAC: 'East African Community',
  ECCAS: 'Economic Community of Central African States',
  ECOWAS: 'Economic Community of West African States',
  IGAD: 'Intergovernmental Authority on Development',
  SADC: 'Southern African Development Community',
  AES: 'Alliance of Sahel States',
};

export const COUNTRY_FACTS = {
  DZ: { iso3: 'DZA', languages: 'Arabic, Tamazight; French widely used', currency: 'Algerian dinar (DZD)', blocs: ['AMU', 'CEN-SAD'] },
  EG: { iso3: 'EGY', languages: 'Arabic', currency: 'Egyptian pound (EGP)', blocs: ['COMESA', 'CEN-SAD'] },
  LY: { iso3: 'LBY', languages: 'Arabic', currency: 'Libyan dinar (LYD)', blocs: ['AMU', 'COMESA', 'CEN-SAD'] },
  MR: { iso3: 'MRT', languages: 'Arabic; French, Pulaar, Soninke, Wolof', currency: 'Ouguiya (MRU)', blocs: ['AMU', 'CEN-SAD'] },
  MA: { iso3: 'MAR', languages: 'Arabic, Tamazight; French widely used', currency: 'Moroccan dirham (MAD)', blocs: ['AMU', 'CEN-SAD'] },
  TN: { iso3: 'TUN', languages: 'Arabic; French widely used', currency: 'Tunisian dinar (TND)', blocs: ['AMU', 'COMESA', 'CEN-SAD'] },

  BJ: { iso3: 'BEN', languages: 'French; Fon, Yoruba and other national languages', currency: 'West African CFA franc (XOF)', blocs: ['ECOWAS', 'CEN-SAD'] },
  BF: { iso3: 'BFA', languages: 'Mooré, Dioula, Fulfulde and other national languages; French', currency: 'West African CFA franc (XOF)', blocs: ['AES', 'CEN-SAD'] },
  CV: { iso3: 'CPV', languages: 'Portuguese, Cape Verdean Creole', currency: 'Cape Verdean escudo (CVE)', blocs: ['ECOWAS'] },
  CI: { iso3: 'CIV', languages: 'French; Dioula, Baoulé and other national languages', currency: 'West African CFA franc (XOF)', blocs: ['ECOWAS', 'CEN-SAD'] },
  GM: { iso3: 'GMB', languages: 'English; Mandinka, Wolof, Fula', currency: 'Dalasi (GMD)', blocs: ['ECOWAS', 'CEN-SAD'] },
  GH: { iso3: 'GHA', languages: 'English; Akan, Ewe, Dagbani, Ga and others', currency: 'Ghanaian cedi (GHS)', blocs: ['ECOWAS', 'CEN-SAD'] },
  GN: { iso3: 'GIN', languages: 'French; Pular, Malinké, Soussou', currency: 'Guinean franc (GNF)', blocs: ['ECOWAS', 'CEN-SAD'] },
  GW: { iso3: 'GNB', languages: 'Portuguese, Guinea-Bissau Creole', currency: 'West African CFA franc (XOF)', blocs: ['ECOWAS', 'CEN-SAD'] },
  LR: { iso3: 'LBR', languages: 'English; Liberian English and indigenous languages', currency: 'Liberian dollar (LRD)', blocs: ['ECOWAS', 'CEN-SAD'] },
  ML: { iso3: 'MLI', languages: 'Bambara and other national languages; French', currency: 'West African CFA franc (XOF)', blocs: ['AES', 'CEN-SAD'] },
  NE: { iso3: 'NER', languages: 'Hausa, Zarma and other national languages; French', currency: 'West African CFA franc (XOF)', blocs: ['AES', 'CEN-SAD'] },
  NG: { iso3: 'NGA', languages: 'English; Hausa, Yoruba, Igbo and 500+ others', currency: 'Naira (NGN)', blocs: ['ECOWAS', 'CEN-SAD'] },
  SN: { iso3: 'SEN', languages: 'French, Wolof; Pulaar, Serer and others', currency: 'West African CFA franc (XOF)', blocs: ['ECOWAS', 'CEN-SAD'] },
  SL: { iso3: 'SLE', languages: 'English, Krio; Mende, Temne', currency: 'Leone (SLE)', blocs: ['ECOWAS', 'CEN-SAD'] },
  TG: { iso3: 'TGO', languages: 'French; Ewe, Kabiyè', currency: 'West African CFA franc (XOF)', blocs: ['ECOWAS', 'CEN-SAD'] },

  BI: { iso3: 'BDI', languages: 'Kirundi, French, English', currency: 'Burundian franc (BIF)', blocs: ['EAC', 'COMESA', 'ECCAS'] },
  CM: { iso3: 'CMR', languages: 'French, English; 200+ national languages', currency: 'Central African CFA franc (XAF)', blocs: ['ECCAS'] },
  CF: { iso3: 'CAF', languages: 'French, Sango', currency: 'Central African CFA franc (XAF)', blocs: ['ECCAS', 'CEN-SAD'] },
  TD: { iso3: 'TCD', languages: 'French, Arabic', currency: 'Central African CFA franc (XAF)', blocs: ['ECCAS', 'CEN-SAD'] },
  CG: { iso3: 'COG', languages: 'French; Lingala, Kituba', currency: 'Central African CFA franc (XAF)', blocs: ['ECCAS'] },
  CD: { iso3: 'COD', languages: 'French; Lingala, Swahili, Kikongo, Tshiluba', currency: 'Congolese franc (CDF)', blocs: ['SADC', 'COMESA', 'ECCAS', 'EAC'] },
  GQ: { iso3: 'GNQ', languages: 'Spanish, French, Portuguese; Fang, Bubi', currency: 'Central African CFA franc (XAF)', blocs: ['ECCAS'] },
  GA: { iso3: 'GAB', languages: 'French; Fang and other national languages', currency: 'Central African CFA franc (XAF)', blocs: ['ECCAS'] },
  ST: { iso3: 'STP', languages: 'Portuguese; Forro and other creoles', currency: 'Dobra (STN)', blocs: ['ECCAS'] },

  KM: { iso3: 'COM', languages: 'Comorian, Arabic, French', currency: 'Comorian franc (KMF)', blocs: ['SADC', 'COMESA', 'CEN-SAD'] },
  DJ: { iso3: 'DJI', languages: 'French, Arabic; Somali, Afar', currency: 'Djiboutian franc (DJF)', blocs: ['IGAD', 'COMESA', 'CEN-SAD'] },
  ER: { iso3: 'ERI', languages: 'Tigrinya, Arabic, English and other national languages', currency: 'Nakfa (ERN)', blocs: ['COMESA', 'CEN-SAD'] },
  ET: { iso3: 'ETH', languages: 'Amharic, Afaan Oromo, Tigrinya, Somali, Afar', currency: 'Ethiopian birr (ETB)', blocs: ['IGAD', 'COMESA'] },
  KE: { iso3: 'KEN', languages: 'Swahili, English', currency: 'Kenyan shilling (KES)', blocs: ['EAC', 'COMESA', 'IGAD', 'CEN-SAD'] },
  MG: { iso3: 'MDG', languages: 'Malagasy, French', currency: 'Malagasy ariary (MGA)', blocs: ['SADC', 'COMESA'] },
  MU: { iso3: 'MUS', languages: 'English, French, Mauritian Creole', currency: 'Mauritian rupee (MUR)', blocs: ['SADC', 'COMESA'] },
  RW: { iso3: 'RWA', languages: 'Kinyarwanda, English, French, Swahili', currency: 'Rwandan franc (RWF)', blocs: ['EAC', 'COMESA', 'ECCAS'] },
  SC: { iso3: 'SYC', languages: 'Seychellois Creole, English, French', currency: 'Seychellois rupee (SCR)', blocs: ['SADC', 'COMESA'] },
  SO: { iso3: 'SOM', languages: 'Somali, Arabic', currency: 'Somali shilling (SOS)', blocs: ['IGAD', 'EAC', 'COMESA', 'CEN-SAD'] },
  SS: { iso3: 'SSD', languages: 'English; Juba Arabic, Dinka, Nuer and others', currency: 'South Sudanese pound (SSP)', blocs: ['EAC', 'IGAD'] },
  SD: { iso3: 'SDN', languages: 'Arabic, English', currency: 'Sudanese pound (SDG)', blocs: ['IGAD', 'COMESA', 'CEN-SAD'] },
  TZ: { iso3: 'TZA', languages: 'Swahili, English', currency: 'Tanzanian shilling (TZS)', blocs: ['EAC', 'SADC'] },
  UG: { iso3: 'UGA', languages: 'English, Swahili; Luganda and others', currency: 'Ugandan shilling (UGX)', blocs: ['EAC', 'COMESA', 'IGAD'] },

  AO: { iso3: 'AGO', languages: 'Portuguese; Umbundu, Kimbundu, Kikongo', currency: 'Kwanza (AOA)', blocs: ['SADC', 'ECCAS'] },
  BW: { iso3: 'BWA', languages: 'English, Setswana', currency: 'Pula (BWP)', blocs: ['SADC'] },
  SZ: { iso3: 'SWZ', languages: 'siSwati, English', currency: 'Lilangeni (SZL)', blocs: ['SADC', 'COMESA'] },
  LS: { iso3: 'LSO', languages: 'Sesotho, English', currency: 'Loti (LSL)', blocs: ['SADC'] },
  MW: { iso3: 'MWI', languages: 'English, Chichewa', currency: 'Malawian kwacha (MWK)', blocs: ['SADC', 'COMESA'] },
  MZ: { iso3: 'MOZ', languages: 'Portuguese; Emakhuwa, Xichangana and others', currency: 'Metical (MZN)', blocs: ['SADC'] },
  NA: { iso3: 'NAM', languages: 'English; Oshiwambo, Afrikaans, Otjiherero and others', currency: 'Namibian dollar (NAD)', blocs: ['SADC'] },
  ZA: { iso3: 'ZAF', languages: '12 official languages incl. isiZulu, isiXhosa, Afrikaans, English', currency: 'South African rand (ZAR)', blocs: ['SADC'] },
  ZM: { iso3: 'ZMB', languages: 'English; Bemba, Nyanja, Tonga and others', currency: 'Zambian kwacha (ZMW)', blocs: ['SADC', 'COMESA'] },
  ZW: { iso3: 'ZWE', languages: 'English, Shona, Ndebele and 13 others', currency: 'Zimbabwe Gold (ZiG); US dollar widely used', blocs: ['SADC', 'COMESA'] },
};
