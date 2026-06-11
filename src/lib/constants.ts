export const MUSIC_GENRES = [
  'Akustik', 'Metal', 'Rock', 'Blues', 'Caz', 'Pop', 'Elektronik',
  'R&B', 'Rap', 'Klasik', 'Etnik', 'Fasıl', 'Türkü', 'Arabesk',
]

export const STAGE_GENRES = [
  'Stand-Up', 'Doğaçlama', 'Tiyatro', 'Alternatif Sahne',
]

export const ALL_GENRES = [...MUSIC_GENRES, ...STAGE_GENRES]

export const GENRE_COLORS: Record<string, string> = {
  Akustik:           '#9CA3AF',
  Metal:             '#6B7280',
  Rock:              '#e86042',
  Blues:             '#3B82F6',
  Caz:               '#8f88d4',
  Pop:               '#5ba4cf',
  Elektronik:        '#a78bfa',
  'R&B':             '#EC4899',
  Rap:               '#F97316',
  Klasik:            '#8B5CF6',
  Etnik:             '#10B981',
  Fasıl:             '#F59E0B',
  Türkü:             '#1D9E75',
  Arabesk:           '#EF4444',
  'Stand-Up':        '#d4a820',
  Doğaçlama:         '#14B8A6',
  Tiyatro:           '#DB2777',
  'Alternatif Sahne':'#6366F1',
}

export function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] ?? '#D4537E'
}

export const INSTRUMENT_OPTIONS = [
  'Gitar', 'Bas', 'Davul', 'Klavye', 'Keman', 'Vokal', 'Saz', 'Flüt', 'Trompet', 'Ud'
]

export const DANCE_OPTIONS = [
  'Salsa', 'Tango', 'Bale', 'Hip-Hop', 'Vals', 'Foxtrot', 'Zumba', 'Flamenco', 'Zeybek', 'Modern Dans', 'Bachata', 'Oryantal'
]

export const VENUE_TYPES: { key: string; tr: string; en: string }[] = [
  { key: 'pub',          tr: 'Pub',                       en: 'Pub' },
  { key: 'turku_bar',    tr: 'Türkü Bar',                 en: 'Turkish Folk Bar' },
  { key: 'live_music',   tr: 'Canlı Müzik',               en: 'Live Music Venue' },
  { key: 'bookstore',    tr: 'Kitabevi',                  en: 'Bookstore' },
  { key: 'theater',      tr: 'Tiyatro',                   en: 'Theater' },
  { key: 'cafe',         tr: 'Kafe',                      en: 'Cafe' },
  { key: 'studio',       tr: 'Prova / Kayıt Stüdyosu',   en: 'Rehearsal / Recording Studio' },
  { key: 'dance_studio', tr: 'Dans Stüdyosu',             en: 'Dance Studio' },
  { key: 'music_school', tr: 'Müzik Dersanesi',           en: 'Music School' },
  { key: 'other',        tr: 'Diğer',                     en: 'Other' },
]

export const CITY_OPTIONS = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Eskişehir', 'Adana', 'Kayseri'
]

export const DISTRICTS_BY_CITY: Record<string, string[]> = {
  İstanbul: ['Adalar','Arnavutköy','Ataşehir','Avcılar','Bağcılar','Bahçelievler','Bakırköy','Başakşehir','Bayrampaşa','Beşiktaş','Beykoz','Beylikdüzü','Beyoğlu','Büyükçekmece','Çatalca','Çekmeköy','Esenler','Esenyurt','Eyüpsultan','Fatih','Gaziosmanpaşa','Güngören','Kadıköy','Kağıthane','Kartal','Küçükçekmece','Maltepe','Pendik','Sancaktepe','Sarıyer','Silivri','Sultanbeyli','Sultangazi','Şile','Şişli','Tuzla','Ümraniye','Üsküdar','Zeytinburnu'],
  Ankara: ['Altındağ','Ayaş','Bala','Beypazarı','Çamlıdere','Çankaya','Çubuk','Elmadağ','Etimesgut','Evren','Gölbaşı','Güdül','Haymana','Kahramankazan','Kalecik','Keçiören','Kızılcahamam','Mamak','Nallıhan','Polatlı','Pursaklar','Sincan','Şereflikoçhisar','Yenimahalle'],
  İzmir: ['Aliağa','Balçova','Bayındır','Bayraklı','Bergama','Beydağ','Bornova','Buca','Çeşme','Çiğli','Dikili','Foça','Gaziemir','Güzelbahçe','Karabağlar','Karaburun','Karşıyaka','Kemalpaşa','Kınık','Kiraz','Konak','Menderes','Menemen','Narlıdere','Ödemiş','Seferihisar','Selçuk','Tire','Torbalı','Urla'],
  Bursa: ['Büyükorhan','Gemlik','Gürsu','Harmancık','İnegöl','İznik','Karacabey','Keles','Kestel','Mudanya','Mustafakemalpaşa','Nilüfer','Orhaneli','Orhangazi','Osmangazi','Yenişehir','Yıldırım'],
  Antalya: ['Akseki','Aksu','Alanya','Demre','Döşemealtı','Elmalı','Finike','Gazipaşa','Gündoğmuş','İbradı','Kaş','Kemer','Kepez','Konyaaltı','Korkuteli','Kumluca','Manavgat','Muratpaşa','Serik'],
  Eskişehir: ['Alpu','Beylikova','Çifteler','Günyüzü','Han','İnönü','Mahmudiye','Mihalgazi','Mihalıççık','Odunpazarı','Sarıcakaya','Seyitgazi','Sivrihisar','Tepebaşı'],
  Adana: ['Aladağ','Ceyhan','Çukurova','Feke','İmamoğlu','Karaisalı','Karataş','Kozan','Pozantı','Saimbeyli','Sarıçam','Seyhan','Tufanbeyli','Yumurtalık','Yüreğir'],
  Kayseri: ['Akkışla','Bünyan','Develi','Felahiye','Hacılar','İncesu','Kocasinan','Melikgazi','Özvatan','Pınarbaşı','Sarıoğlan','Sarız','Talas','Tomarza','Yahyalı','Yeşilhisar'],
}
