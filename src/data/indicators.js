/**
 * World Bank World Development Indicators shown in every country file.
 * Data: World Bank, licensed CC BY 4.0. https://data.worldbank.org
 */
export const INDICATORS = [
  { code: 'SP.POP.TOTL', label: 'Population', format: 'people' },
  { code: 'NY.GDP.MKTP.CD', label: 'GDP', unit: 'current US$', format: 'usd-big' },
  { code: 'NY.GDP.PCAP.CD', label: 'GDP per person', unit: 'current US$', format: 'usd' },
  { code: 'NY.GDP.MKTP.KD.ZG', label: 'Economic growth', unit: 'annual GDP growth', format: 'pct' },
  { code: 'FP.CPI.TOTL.ZG', label: 'Inflation', unit: 'consumer prices, annual', format: 'pct' },
  { code: 'SP.DYN.LE00.IN', label: 'Life expectancy', unit: 'years at birth', format: 'years' },
  { code: 'SP.URB.TOTL.IN.ZS', label: 'Urban population', unit: 'share of total', format: 'pct' },
  { code: 'IT.NET.USER.ZS', label: 'Internet use', unit: 'share of population', format: 'pct' },
  { code: 'EG.ELC.ACCS.ZS', label: 'Access to electricity', unit: 'share of population', format: 'pct' },
];

export const INDICATOR_YEARS = 15;
