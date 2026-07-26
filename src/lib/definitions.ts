export const puskeswanList = [
  'Puskeswan Budong-Budong',
  'Puskeswan Karossa',
  'Puskeswan Pangale',
  'Puskeswan Tobadak',
  'Puskeswan Topoyo',
];

export const karossaDesaList = [
    "Benggaulu",
    "Kadaila",
    "Karossa",
    "Kayucalla",
    "Kambunong",
    "Lara",
    "Lembah Hopo",
    "Salubiro",
    "Sanjango",
    "Sukamaju",
    "Tasoskko",
    "Mora IV",
    "UPT Lara III",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const budongBudongDesaList = [
    "Babana",
    "Barakkang",
    "Kire",
    "Lumu",
    "Pasapa",
    "Salumanurung",
    "Tinali",
    "Bojo",
    "Lembah Hada",
    "Salogatta",
    "Potantanakayyang",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const pangaleDesaList = [
    "Kombiling",
    "Kuo",
    "Lamba-lamba",
    "Lemo-Lemo",
    "Pangale",
    "Polo Camba",
    "Polo Lereng",
    "Polo Pangale",
    "Sartanamaju",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const tobadakDesaList = [
    "Bambadaru",
    "Batu Parigi",
    "Mahahe",
    "Polongaan",
    "Saluadak",
    "Sejati",
    "Sulobaja",
    "Tobadak",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const topoyoDesaList = [
    "Desa Bambamanurug",
    "Desa Budong-Budong",
    "Desa Kabubu",
    "Desa Pangalloang",
    "Desa Paraili",
    "Desa Salule'bo",
    "Desa Salupangkang",
    "Desa Salupangkang IV",
    "Desa Sinabatta",
    "Desa Tabolang",
    "Desa Tangkau",
    "Desa Tappilina",
    "Desa Topoyo",
    "Desa Tumbu",
    "Desa Waeputeh",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const budongBudongOfficerList = [
    "Anshari Saleh",
    "Hadi",
    "Nur Fauzi",
    "Rahman",
    "Suprapto",
    "Tadi Sole",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const karossaOfficerList = [
    "Asri Rasyid",
    "Basuki",
    "drh. Stephani",
    "Hasaruddin",
    "Nasaruddin",
    "Adiatman",
    "Surianca",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const pangaleOfficerList = [
    "Andri",
    "drh. Ketut Elok",
    "Jarwo",
    "Jawaril",
    "Kamarudin",
    "Kamaruddin",
    "Mansyur",
    "Sugeng",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const tobadakOfficerList = [
    "Aser M",
    "drh. Ishak",
    "Endang",
    "Feliks S",
    "Jupry",
    "Madalena",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});

export const topoyoOfficerList = [
    "Alfons B",
    "drh. Iqbal Djamil",
    "Fitriani",
    "Haslim",
    "Rizky A",
    "Lainnya",
].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
});


export const livestockTypes = [
  'Sapi Bali',
  'Sapi Madura',
  'Sapi Limosin',
  'Sapi Simental',
  'Babi',
  'Anjing Lokal',
  'Anjing Ras',
  'Kucing Lokal',
  'Kucing Persia',
  'Ayam',
  'Lainnya',
];

export const genderOptions = [
  'Jantan',
  'Betina',
];

export const ageUnits = [
  'Minggu',
  'Bulan',
  'Tahun',
];

export const dosageUnits = [
  'ml',
  'mg',
  'g',
  'Bolus',
  'Kaplet',
  'Lainnya',
];

export const vaccinationPrograms = [
    'Rabies',
    'Jembrana',
    'Hog Cholera',
    'PMK (Penyakit Mulut dan Kuku)',
    'ASF (African Swine Fever)',
    'AI (Avian Influenza)',
    'ND (Newcastle Disease)',
    'Lainnya',
  ];

export const vaccineLists: Record<string, string[]> = {
    'Rabies': ['Neo Rabivet', 'Rabisin', 'Lainnya'],
    'Jembrana': ['JD-Vet', 'Lainnya'],
    'Hog Cholera': ['Himmvac Hog Cholera', 'Lainnya'],
    'PMK (Penyakit Mulut dan Kuku)': ['Aphthovet', 'Lainnya'],
    'ASF (African Swine Fever)': ['Serum ASF', 'Lainnya'],
    'AI (Avian Influenza)': ['Medivac AI', 'Lainnya'],
    'ND (Newcastle Disease)': ['Medivac ND', 'Lainnya'],
};

export const caseStatusOptions = [
  'Sembuh',
  'Tidak Sembuh',
  'Mati',
];