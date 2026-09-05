import { enDict } from './en.js';
import { frDict } from './fr.js';
import { deDict } from './de.js';
import { esDict } from './es.js';
import { roDict } from './ro.js';
import { jaDict } from './ja.js';
import { arDict } from './ar.js';
import type { SupportedLocale, TranslationDictionary } from '../types.js';

export { enDict, frDict, deDict, esDict, roDict, jaDict, arDict };

export const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  en: enDict,
  fr: frDict,
  de: deDict,
  es: esDict,
  ro: roDict,
  ja: jaDict,
  ar: arDict,
};
