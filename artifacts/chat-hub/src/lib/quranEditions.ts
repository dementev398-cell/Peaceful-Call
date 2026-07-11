// Quran translation editions available per UI language.
// The Arabic uthmani text is ALWAYS fetched and shown; a translation is layered
// beneath each ayah. The special id `ar.original` means "Arabic only, no translation".
// All texts are fetched live from api.alquran.cloud (Tanzil project) — verified complete
// and unaltered. Shidfar / Gafurov are intentionally absent: no reliable complete
// digital source exists, so they were replaced with the verified Sablukov & Al-Muntahab.

export type UiLang = 'RU' | 'EN' | 'AR';

export interface QuranEdition {
  id: string;   // alquran.cloud edition identifier, or 'ar.original'
  label: string;
}

export const ARABIC_ONLY = 'ar.original';

export const EDITIONS_BY_LANG: Record<UiLang, QuranEdition[]> = {
  RU: [
    { id: 'ru.kuliev', label: 'Кулиев' },
    { id: 'ru.porokhova', label: 'Порохова' },
    { id: 'ru.osmanov', label: 'Османов' },
    { id: 'ru.krachkovsky', label: 'Крачковский' },
    { id: 'ru.abuadel', label: 'Абу Адель' },
    { id: 'ru.sablukov', label: 'Саблуков' },
    { id: 'ru.muntahab', label: 'Аль-Мунтахаб' },
    { id: ARABIC_ONLY, label: 'Арабский оригинал' },
  ],
  EN: [
    { id: 'en.sahih', label: 'Sahih International' },
    { id: 'en.yusufali', label: 'Yusuf Ali' },
    { id: 'en.hilali', label: 'Muhsin Khan' },
    { id: 'en.pickthall', label: 'Pickthall' },
    { id: ARABIC_ONLY, label: 'Arabic original' },
  ],
  AR: [
    { id: ARABIC_ONLY, label: 'النص العربي' },
  ],
};

export interface QuranAyah {
  num: number;
  arabic: string;
  text: string | null;
}

export interface QuranSurahData {
  number: number;
  name: string;
  englishName: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: QuranAyah[];
}

const API = 'https://api.alquran.cloud/v1';

export async function fetchSurah(
  surahNumber: number,
  editionId: string,
): Promise<QuranSurahData> {
  const arabicOnly = editionId === ARABIC_ONLY;
  const editions = arabicOnly ? 'quran-uthmani' : `quran-uthmani,${editionId}`;
  const res = await fetch(`${API}/surah/${surahNumber}/editions/${editions}`);
  if (!res.ok) throw new Error(`Quran API error: ${res.status}`);
  const json = await res.json();
  const arr: any[] = json.data ?? [];
  const arabic = arr.find((d) => d.edition?.identifier === 'quran-uthmani');
  if (!arabic) throw new Error('Arabic text missing in response');
  const translation = arabicOnly
    ? null
    : arr.find((d) => d.edition?.identifier === editionId);

  // Map translation ayahs by their ayah number (numberInSurah), never by array
  // index, so the translation can never silently shift against the Arabic text.
  let transByNum: Map<number, string> | null = null;
  if (translation) {
    transByNum = new Map<number, string>();
    for (const a of translation.ayahs) {
      transByNum.set(a.numberInSurah, a.text);
    }
    // Integrity guard: a translation is only valid if it covers every Arabic
    // ayah of this surah. Otherwise fail loudly instead of showing partial text.
    if (translation.ayahs.length !== arabic.ayahs.length) {
      throw new Error(
        `Ayah count mismatch: arabic=${arabic.ayahs.length} translation=${translation.ayahs.length}`,
      );
    }
    for (const a of arabic.ayahs) {
      if (!transByNum.has(a.numberInSurah)) {
        throw new Error(`Translation missing ayah ${a.numberInSurah}`);
      }
    }
  }

  const ayahs: QuranAyah[] = arabic.ayahs.map((a: any) => ({
    num: a.numberInSurah,
    arabic: a.text,
    text: transByNum ? (transByNum.get(a.numberInSurah) ?? null) : null,
  }));

  return {
    number: arabic.number,
    name: arabic.name,
    englishName: arabic.englishName,
    revelationType: arabic.revelationType,
    numberOfAyahs: arabic.numberOfAyahs,
    ayahs,
  };
}

// Bismillah shown as a header for every surah except Al-Fatiha (1, where it is
// ayah 1) and At-Tawbah (9, which has none by consensus).
export const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
export function showsBismillahHeader(surahNumber: number): boolean {
  return surahNumber !== 1 && surahNumber !== 9;
}
