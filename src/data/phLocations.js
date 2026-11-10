// Built-in Philippine places for the applicant location heatmap, so applicants'
// free-text locations ("Pasig City, Metro Manila") can be placed on the map
// without a paid geocoding service. Coordinates are approximate city centres.

export const REGIONS = {
  NCR: { name: 'NCR (Metro Manila)', lat: 14.5995, lng: 121.0, aliases: ['ncr', 'national capital region', 'metro manila', 'mm'] },
  CAR: { name: 'Cordillera (CAR)', lat: 17.0, lng: 120.9, aliases: ['car', 'cordillera', 'cordillera administrative region'] },
  R1: { name: 'Ilocos Region', lat: 16.6, lng: 120.4, aliases: ['region 1', 'region i', 'ilocos region', 'ilocos'] },
  R2: { name: 'Cagayan Valley', lat: 17.0, lng: 121.7, aliases: ['region 2', 'region ii', 'cagayan valley'] },
  R3: { name: 'Central Luzon', lat: 15.3, lng: 120.7, aliases: ['region 3', 'region iii', 'central luzon'] },
  R4A: { name: 'CALABARZON', lat: 14.1, lng: 121.3, aliases: ['region 4a', 'region iv-a', 'region 4-a', 'region iva', 'calabarzon'] },
  MIMAROPA: { name: 'MIMAROPA', lat: 12.4, lng: 121.0, aliases: ['mimaropa', 'region 4b', 'region iv-b', 'southwestern tagalog region'] },
  R5: { name: 'Bicol Region', lat: 13.4, lng: 123.4, aliases: ['region 5', 'region v', 'bicol', 'bicol region'] },
  R6: { name: 'Western Visayas', lat: 11.0, lng: 122.5, aliases: ['region 6', 'region vi', 'western visayas'] },
  NIR: { name: 'Negros Island Region', lat: 10.0, lng: 123.0, aliases: ['nir', 'negros island region', 'negros'] },
  R7: { name: 'Central Visayas', lat: 10.0, lng: 123.8, aliases: ['region 7', 'region vii', 'central visayas'] },
  R8: { name: 'Eastern Visayas', lat: 11.5, lng: 125.0, aliases: ['region 8', 'region viii', 'eastern visayas'] },
  R9: { name: 'Zamboanga Peninsula', lat: 7.8, lng: 122.5, aliases: ['region 9', 'region ix', 'zamboanga peninsula'] },
  R10: { name: 'Northern Mindanao', lat: 8.3, lng: 124.7, aliases: ['region 10', 'region x', 'northern mindanao'] },
  R11: { name: 'Davao Region', lat: 7.1, lng: 125.8, aliases: ['region 11', 'region xi', 'davao region'] },
  R12: { name: 'SOCCSKSARGEN', lat: 6.6, lng: 124.8, aliases: ['region 12', 'region xii', 'soccsksargen'] },
  R13: { name: 'Caraga', lat: 8.9, lng: 125.8, aliases: ['region 13', 'region xiii', 'caraga'] },
  BARMM: { name: 'BARMM', lat: 7.0, lng: 124.3, aliases: ['barmm', 'bangsamoro', 'armm'] },
};

// [province, region, lat, lng] — coordinates are the provincial capital.
const PROVINCE_ROWS = [
  ['Metro Manila', 'NCR', 14.5995, 120.9842],
  ['Abra', 'CAR', 17.5958, 120.6181], ['Apayao', 'CAR', 18.0236, 121.1842], ['Benguet', 'CAR', 16.4614, 120.5878],
  ['Ifugao', 'CAR', 16.8161, 121.1069], ['Kalinga', 'CAR', 17.4189, 121.4443], ['Mountain Province', 'CAR', 17.0892, 120.9772],
  ['Ilocos Norte', 'R1', 18.1978, 120.5936], ['Ilocos Sur', 'R1', 17.5747, 120.3869], ['La Union', 'R1', 16.6159, 120.3166],
  ['Pangasinan', 'R1', 16.0218, 120.2319],
  ['Batanes', 'R2', 20.4487, 121.9702], ['Cagayan', 'R2', 17.6132, 121.727], ['Isabela', 'R2', 17.1489, 121.8894],
  ['Nueva Vizcaya', 'R2', 16.4847, 121.1497], ['Quirino', 'R2', 16.51, 121.5225],
  ['Aurora', 'R3', 15.7583, 121.5622], ['Bataan', 'R3', 14.6761, 120.5361], ['Bulacan', 'R3', 14.8527, 120.816],
  ['Nueva Ecija', 'R3', 15.5422, 121.0844], ['Pampanga', 'R3', 15.0286, 120.6898], ['Tarlac', 'R3', 15.4802, 120.5979],
  ['Zambales', 'R3', 15.3058, 119.9767],
  ['Batangas', 'R4A', 13.7565, 121.0583], ['Cavite', 'R4A', 14.2814, 120.8669], ['Laguna', 'R4A', 14.2814, 121.4161],
  ['Quezon', 'R4A', 13.9373, 121.617], ['Rizal', 'R4A', 14.5864, 121.176],
  ['Marinduque', 'MIMAROPA', 13.4448, 121.8406], ['Occidental Mindoro', 'MIMAROPA', 12.3528, 121.0672],
  ['Oriental Mindoro', 'MIMAROPA', 13.4115, 121.1803], ['Palawan', 'MIMAROPA', 9.7392, 118.7353], ['Romblon', 'MIMAROPA', 12.5778, 122.2697],
  ['Albay', 'R5', 13.1391, 123.7438], ['Camarines Norte', 'R5', 14.1122, 122.9553], ['Camarines Sur', 'R5', 13.6218, 123.1948],
  ['Catanduanes', 'R5', 13.5806, 124.2306], ['Masbate', 'R5', 12.3686, 123.617], ['Sorsogon', 'R5', 12.9742, 124.0058],
  ['Aklan', 'R6', 11.7064, 122.3675], ['Antique', 'R6', 10.7448, 121.9411], ['Capiz', 'R6', 11.5853, 122.7511],
  ['Guimaras', 'R6', 10.6581, 122.5961], ['Iloilo', 'R6', 10.7202, 122.5621],
  ['Negros Occidental', 'NIR', 10.6765, 122.9509], ['Negros Oriental', 'NIR', 9.3068, 123.3054], ['Siquijor', 'NIR', 9.2147, 123.5153],
  ['Bohol', 'R7', 9.65, 123.85], ['Cebu', 'R7', 10.3157, 123.8854],
  ['Biliran', 'R8', 11.5617, 124.3956], ['Eastern Samar', 'R8', 11.6081, 125.4319], ['Leyte', 'R8', 11.2444, 125.0039],
  ['Northern Samar', 'R8', 12.4994, 124.6381], ['Samar', 'R8', 11.7753, 124.8861], ['Southern Leyte', 'R8', 10.1335, 124.8447],
  ['Zamboanga del Norte', 'R9', 8.5883, 123.3409], ['Zamboanga del Sur', 'R9', 7.8257, 123.437], ['Zamboanga Sibugay', 'R9', 7.7844, 122.5864],
  ['Bukidnon', 'R10', 8.1575, 125.1278], ['Camiguin', 'R10', 9.25, 124.7167], ['Lanao del Norte', 'R10', 8.0730, 123.8919],
  ['Misamis Occidental', 'R10', 8.4859, 123.8048], ['Misamis Oriental', 'R10', 8.4542, 124.6319],
  ['Davao de Oro', 'R11', 7.6078, 125.9664], ['Davao del Norte', 'R11', 7.4478, 125.8078], ['Davao del Sur', 'R11', 6.7497, 125.3572],
  ['Davao Occidental', 'R11', 6.0956, 125.6081], ['Davao Oriental', 'R11', 6.9551, 126.2166],
  ['Cotabato', 'R12', 7.0083, 125.0894], ['Sarangani', 'R12', 6.1023, 125.2903], ['South Cotabato', 'R12', 6.5008, 124.8469],
  ['Sultan Kudarat', 'R12', 6.6297, 124.605],
  ['Agusan del Norte', 'R13', 9.1236, 125.5347], ['Agusan del Sur', 'R13', 8.5167, 125.9667], ['Dinagat Islands', 'R13', 10.0094, 125.5733],
  ['Surigao del Norte', 'R13', 9.7843, 125.4888], ['Surigao del Sur', 'R13', 9.0783, 126.1986],
  ['Basilan', 'BARMM', 6.6503, 122.1306], ['Lanao del Sur', 'BARMM', 8.0034, 124.2839], ['Maguindanao del Norte', 'BARMM', 7.2236, 124.2464],
  ['Maguindanao del Sur', 'BARMM', 6.715, 124.786], ['Sulu', 'BARMM', 6.0522, 121.0022], ['Tawi-Tawi', 'BARMM', 5.0292, 119.7731],
];

const PROVINCE_ALIASES = {
  'Metro Manila': ['metro manila', 'ncr', 'national capital region', 'manila metro'],
  'Davao de Oro': ['compostela valley'],
  'Cotabato': ['north cotabato'],
  'Maguindanao del Norte': ['maguindanao'],
  'Mountain Province': ['mt province', 'mountain province'],
  'Samar': ['western samar'],
};

// [city, province, lat, lng, extra aliases]
const CITY_ROWS = [
  // NCR
  ['Manila', 'Metro Manila', 14.5995, 120.9842, ['city of manila', 'manila city', 'tondo', 'sampaloc', 'ermita', 'malate', 'binondo', 'santa ana', 'sta ana', 'paco']],
  ['Quezon City', 'Metro Manila', 14.676, 121.0437, ['qc', 'q.c.', 'cubao', 'diliman', 'novaliches', 'fairview']],
  ['Caloocan', 'Metro Manila', 14.6507, 120.9668], ['Las Piñas', 'Metro Manila', 14.4445, 120.9939],
  ['Makati', 'Metro Manila', 14.5547, 121.0244], ['Malabon', 'Metro Manila', 14.6681, 120.9658],
  ['Mandaluyong', 'Metro Manila', 14.5794, 121.0359], ['Marikina', 'Metro Manila', 14.6507, 121.1029],
  ['Muntinlupa', 'Metro Manila', 14.4081, 121.0415, ['alabang']], ['Navotas', 'Metro Manila', 14.6667, 120.9417],
  ['Parañaque', 'Metro Manila', 14.4793, 121.0198], ['Pasay', 'Metro Manila', 14.5378, 121.0014],
  ['Pasig', 'Metro Manila', 14.5764, 121.0851, ['ortigas']], ['San Juan', 'Metro Manila', 14.6019, 121.0355],
  ['Taguig', 'Metro Manila', 14.5176, 121.0509, ['bgc', 'bonifacio global city', 'fort bonifacio']],
  ['Valenzuela', 'Metro Manila', 14.7011, 120.983], ['Pateros', 'Metro Manila', 14.5446, 121.0687],
  // CALABARZON
  ['Antipolo', 'Rizal', 14.5864, 121.176], ['Cainta', 'Rizal', 14.5786, 121.1222], ['Taytay', 'Rizal', 14.5574, 121.1324],
  ['San Mateo', 'Rizal', 14.6983, 121.1217], ['Rodriguez', 'Rizal', 14.76, 121.11, ['montalban']], ['Binangonan', 'Rizal', 14.4651, 121.1925],
  ['Calamba', 'Laguna', 14.2117, 121.1653], ['Santa Rosa', 'Laguna', 14.3122, 121.1114, ['sta rosa']], ['Biñan', 'Laguna', 14.3425, 121.0814],
  ['San Pedro', 'Laguna', 14.3595, 121.0473], ['Cabuyao', 'Laguna', 14.2786, 121.125], ['San Pablo', 'Laguna', 14.0683, 121.3256],
  ['Los Baños', 'Laguna', 14.1699, 121.2441], ['Santa Cruz', 'Laguna', 14.2814, 121.4161, ['sta cruz']],
  ['Bacoor', 'Cavite', 14.459, 120.929], ['Imus', 'Cavite', 14.4297, 120.9367], ['Dasmariñas', 'Cavite', 14.3294, 120.9367],
  ['General Trias', 'Cavite', 14.3869, 120.8817, ['gen trias']], ['Cavite City', 'Cavite', 14.4791, 120.897], ['Tagaytay', 'Cavite', 14.1153, 120.9621],
  ['Trece Martires', 'Cavite', 14.2814, 120.8669], ['Kawit', 'Cavite', 14.4447, 120.9042], ['Silang', 'Cavite', 14.2306, 120.975],
  ['Carmona', 'Cavite', 14.3132, 121.0576], ['Rosario', 'Cavite', 14.4139, 120.855],
  ['Batangas City', 'Batangas', 13.7565, 121.0583], ['Lipa', 'Batangas', 13.9411, 121.1631], ['Tanauan', 'Batangas', 14.0863, 121.1497],
  ['Santo Tomas', 'Batangas', 14.1079, 121.1416, ['sto tomas']], ['Nasugbu', 'Batangas', 14.0722, 120.6328],
  ['Lucena', 'Quezon', 13.9373, 121.617], ['Tayabas', 'Quezon', 14.0259, 121.5929],
  // Central Luzon
  ['San Fernando (Pampanga)', 'Pampanga', 15.0286, 120.6898, ['city of san fernando pampanga']], ['Angeles', 'Pampanga', 15.145, 120.5887, ['clark']],
  ['Mabalacat', 'Pampanga', 15.2216, 120.5736],
  ['Malolos', 'Bulacan', 14.8527, 120.816], ['Meycauayan', 'Bulacan', 14.7369, 120.9608], ['San Jose del Monte', 'Bulacan', 14.8139, 121.0453, ['sjdm']],
  ['Marilao', 'Bulacan', 14.7581, 120.9481], ['Baliuag', 'Bulacan', 14.9547, 120.897, ['baliwag']], ['Santa Maria', 'Bulacan', 14.8186, 120.9561, ['sta maria']],
  ['Olongapo', 'Zambales', 14.8292, 120.2828], ['Subic', 'Zambales', 14.877, 120.234], ['Iba', 'Zambales', 15.3058, 119.9767],
  ['Tarlac City', 'Tarlac', 15.4802, 120.5979], ['Cabanatuan', 'Nueva Ecija', 15.4865, 120.9675], ['Palayan', 'Nueva Ecija', 15.5422, 121.0844],
  ['San Jose (Nueva Ecija)', 'Nueva Ecija', 15.7911, 120.9925], ['Gapan', 'Nueva Ecija', 15.3072, 120.9464],
  ['Balanga', 'Bataan', 14.6761, 120.5361], ['Mariveles', 'Bataan', 14.4333, 120.4833], ['Baler', 'Aurora', 15.7583, 121.5622],
  // Ilocos
  ['Laoag', 'Ilocos Norte', 18.1978, 120.5936], ['Batac', 'Ilocos Norte', 18.0554, 120.5649], ['Vigan', 'Ilocos Sur', 17.5747, 120.3869],
  ['Candon', 'Ilocos Sur', 17.1947, 120.4517], ['San Fernando (La Union)', 'La Union', 16.6159, 120.3166, ['city of san fernando la union']],
  ['Dagupan', 'Pangasinan', 16.0433, 120.3339], ['San Carlos (Pangasinan)', 'Pangasinan', 15.9281, 120.3489], ['Urdaneta', 'Pangasinan', 15.9761, 120.5711],
  ['Alaminos', 'Pangasinan', 16.1553, 119.9806], ['Lingayen', 'Pangasinan', 16.0218, 120.2319],
  // CAR
  ['Baguio', 'Benguet', 16.4023, 120.596], ['La Trinidad', 'Benguet', 16.4614, 120.5878], ['Tabuk', 'Kalinga', 17.4189, 121.4443], ['Bangued', 'Abra', 17.5958, 120.6181],
  // Cagayan Valley
  ['Tuguegarao', 'Cagayan', 17.6132, 121.727], ['Ilagan', 'Isabela', 17.1489, 121.8894], ['Santiago', 'Isabela', 16.6881, 121.5487],
  ['Cauayan', 'Isabela', 16.9273, 121.771], ['Bayombong', 'Nueva Vizcaya', 16.4847, 121.1497],
  // MIMAROPA
  ['Puerto Princesa', 'Palawan', 9.7392, 118.7353], ['Calapan', 'Oriental Mindoro', 13.4115, 121.1803],
  ['San Jose (Occidental Mindoro)', 'Occidental Mindoro', 12.3528, 121.0672], ['Boac', 'Marinduque', 13.4448, 121.8406],
  // Bicol
  ['Legazpi', 'Albay', 13.1391, 123.7438, ['legaspi']], ['Tabaco', 'Albay', 13.3592, 123.7322], ['Ligao', 'Albay', 13.2167, 123.5222],
  ['Naga (Camarines Sur)', 'Camarines Sur', 13.6218, 123.1948, ['naga camarines sur']], ['Iriga', 'Camarines Sur', 13.4214, 123.4122],
  ['Sorsogon City', 'Sorsogon', 12.9742, 124.0058], ['Masbate City', 'Masbate', 12.3686, 123.617], ['Daet', 'Camarines Norte', 14.1122, 122.9553],
  ['Virac', 'Catanduanes', 13.5806, 124.2306],
  // Western Visayas
  ['Iloilo City', 'Iloilo', 10.7202, 122.5621], ['Passi', 'Iloilo', 11.1081, 122.6411], ['Roxas City', 'Capiz', 11.5853, 122.7511],
  ['Kalibo', 'Aklan', 11.7064, 122.3675, ['boracay']], ['San Jose de Buenavista', 'Antique', 10.7448, 121.9411], ['Jordan', 'Guimaras', 10.6581, 122.5961],
  // Negros Island Region
  ['Bacolod', 'Negros Occidental', 10.6765, 122.9509], ['Silay', 'Negros Occidental', 10.8, 122.9667],
  ['Talisay (Negros Occidental)', 'Negros Occidental', 10.7372, 122.9672], ['Kabankalan', 'Negros Occidental', 9.9833, 122.8167],
  ['Dumaguete', 'Negros Oriental', 9.3068, 123.3054], ['Bais', 'Negros Oriental', 9.5907, 123.1214],
  // Central Visayas
  ['Cebu City', 'Cebu', 10.3157, 123.8854], ['Mandaue', 'Cebu', 10.3236, 123.9223], ['Lapu-Lapu', 'Cebu', 10.3103, 123.9494, ['lapulapu', 'mactan']],
  ['Talisay (Cebu)', 'Cebu', 10.2447, 123.8494], ['Danao', 'Cebu', 10.5203, 124.0272], ['Toledo', 'Cebu', 10.3773, 123.6386],
  ['Carcar', 'Cebu', 10.1061, 123.6403], ['Naga (Cebu)', 'Cebu', 10.2083, 123.7583], ['Minglanilla', 'Cebu', 10.245, 123.7964],
  ['Consolacion', 'Cebu', 10.3766, 123.9573], ['Liloan', 'Cebu', 10.399, 123.999], ['Tagbilaran', 'Bohol', 9.65, 123.85],
  // Eastern Visayas
  ['Tacloban', 'Leyte', 11.2444, 125.0039], ['Ormoc', 'Leyte', 11.0064, 124.6075], ['Calbayog', 'Samar', 12.0672, 124.6042],
  ['Catbalogan', 'Samar', 11.7753, 124.8861], ['Borongan', 'Eastern Samar', 11.6081, 125.4319], ['Maasin', 'Southern Leyte', 10.1335, 124.8447],
  ['Catarman', 'Northern Samar', 12.4994, 124.6381], ['Naval', 'Biliran', 11.5617, 124.3956],
  // Zamboanga Peninsula
  ['Zamboanga City', 'Zamboanga del Sur', 6.9214, 122.079], ['Dipolog', 'Zamboanga del Norte', 8.5883, 123.3409],
  ['Dapitan', 'Zamboanga del Norte', 8.6549, 123.4243], ['Pagadian', 'Zamboanga del Sur', 7.8257, 123.437], ['Ipil', 'Zamboanga Sibugay', 7.7844, 122.5864],
  // Northern Mindanao
  ['Cagayan de Oro', 'Misamis Oriental', 8.4542, 124.6319, ['cdo']], ['Iligan', 'Lanao del Norte', 8.228, 124.2452],
  ['Valencia', 'Bukidnon', 7.9064, 125.0942], ['Malaybalay', 'Bukidnon', 8.1575, 125.1278], ['Ozamiz', 'Misamis Occidental', 8.1481, 123.8411, ['ozamis']],
  ['Oroquieta', 'Misamis Occidental', 8.4859, 123.8048], ['Gingoog', 'Misamis Oriental', 8.8233, 125.1011], ['El Salvador', 'Misamis Oriental', 8.5631, 124.5219],
  ['Mambajao', 'Camiguin', 9.25, 124.7167],
  // Davao
  ['Davao City', 'Davao del Sur', 7.1907, 125.4553], ['Tagum', 'Davao del Norte', 7.4478, 125.8078], ['Panabo', 'Davao del Norte', 7.3081, 125.6842],
  ['Samal', 'Davao del Norte', 7.0731, 125.7092, ['island garden city of samal', 'igacos']], ['Digos', 'Davao del Sur', 6.7497, 125.3572],
  ['Mati', 'Davao Oriental', 6.9551, 126.2166], ['Nabunturan', 'Davao de Oro', 7.6078, 125.9664],
  // SOCCSKSARGEN
  ['General Santos', 'South Cotabato', 6.1164, 125.1716, ['gensan', 'gen santos']], ['Koronadal', 'South Cotabato', 6.5008, 124.8469, ['marbel']],
  ['Kidapawan', 'Cotabato', 7.0083, 125.0894], ['Tacurong', 'Sultan Kudarat', 6.6925, 124.6764], ['Isulan', 'Sultan Kudarat', 6.6297, 124.605],
  ['Alabel', 'Sarangani', 6.1023, 125.2903],
  // Caraga
  ['Butuan', 'Agusan del Norte', 8.9475, 125.5406], ['Cabadbaran', 'Agusan del Norte', 9.1236, 125.5347], ['Bayugan', 'Agusan del Sur', 8.7144, 125.7511],
  ['Surigao City', 'Surigao del Norte', 9.7843, 125.4888], ['Tandag', 'Surigao del Sur', 9.0783, 126.1986], ['Bislig', 'Surigao del Sur', 8.2153, 126.3164],
  // BARMM
  ['Cotabato City', 'Maguindanao del Norte', 7.2236, 124.2464], ['Marawi', 'Lanao del Sur', 8.0034, 124.2839],
  ['Lamitan', 'Basilan', 6.6503, 122.1306], ['Jolo', 'Sulu', 6.0522, 121.0022], ['Bongao', 'Tawi-Tawi', 5.0292, 119.7731],
];

/* ------------------------------------------------------------------ matching */

/** Lowercase, drop accents, punctuation and postal codes. "Parañaque City 1700" -> "paranaque city". */
export function normalizePlace(value = '') {
  return String(value)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bsto\.?\s/g, 'sto ').replace(/\bsta\.?\s/g, 'sta ').replace(/\bgen\.?\s/g, 'gen ')
    .replace(/[.()#]/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/\bphilippines\b|\bphils?\b|\bph\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const baseName = (name) => name.replace(/\s*\(.*\)$/, ''); // "Naga (Cebu)" -> "Naga"

export const PROVINCES = Object.fromEntries(PROVINCE_ROWS.map(([name, region, lat, lng]) => [name, { name, region, lat, lng }]));
export const CITIES = CITY_ROWS.map(([name, province, lat, lng, aliases = []]) => ({
  name, province, region: PROVINCES[province].region, lat, lng, aliases,
}));

// Lookup tables: normalised text -> place.
const cityIndex = new Map();
const provinceIndex = new Map();
const regionIndex = new Map();
const provinceNames = new Set(PROVINCE_ROWS.map(([name]) => normalizePlace(name)));

for (const city of CITIES) {
  const plain = normalizePlace(baseName(city.name)); // "quezon city", "makati", "naga"
  const keys = new Set([plain, ...city.aliases.map(normalizePlace)]);
  const withoutCity = plain.replace(/\s+city$/, '');
  // "Makati" <-> "Makati City" both work, but "Quezon" stays the province, not Quezon City.
  if (!provinceNames.has(withoutCity)) keys.add(withoutCity);
  keys.add(`${withoutCity} city`);
  keys.add(`city of ${withoutCity}`);
  // Names shared by several cities ("San Fernando", "Naga") need the province to tell them apart.
  const ambiguous = CITIES.filter((other) => baseName(other.name) === baseName(city.name)).length > 1;
  for (const key of keys) {
    if (ambiguous) cityIndex.set(`${key}|${normalizePlace(city.province)}`, city);
    else if (!cityIndex.has(key)) cityIndex.set(key, city);
  }
  if (ambiguous) cityIndex.set(normalizePlace(city.name), city); // "naga cebu" style
}
for (const [name] of PROVINCE_ROWS) {
  for (const key of [name, ...(PROVINCE_ALIASES[name] || [])]) provinceIndex.set(normalizePlace(key), PROVINCES[name]);
  provinceIndex.set(`${normalizePlace(name)} province`, PROVINCES[name]);
}
for (const [code, region] of Object.entries(REGIONS)) {
  for (const key of region.aliases) regionIndex.set(normalizePlace(key), code);
}
const searchKeys = [...cityIndex.keys()].filter((key) => !key.includes('|') && key.length >= 4).sort((a, b) => b.length - a.length);

const cityResult = (city) => ({ level: 'city', city: city.name, province: city.province, region: city.region, lat: city.lat, lng: city.lng });
const provinceResult = (province) => ({ level: 'province', city: null, province: province.name, region: province.region, lat: province.lat, lng: province.lng });

/**
 * Resolve a free-text location. Returns { level, city, province, region, lat, lng }
 * or null when it cannot be placed (e.g. abroad or a typo).
 */
export function resolveLocation(text) {
  const normalized = normalizePlace(text);
  if (!normalized) return null;
  const parts = normalized.split(/\s*[,/;|]\s*|\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  const provincePart = parts.map((part) => provinceIndex.get(part)).find(Boolean);
  const provinceKey = provincePart ? normalizePlace(provincePart.name) : '';

  // 1. A comma-separated part that is a city (most specific first).
  for (const part of parts) {
    const city = (provinceKey && cityIndex.get(`${part}|${provinceKey}`)) || cityIndex.get(part);
    if (city) return cityResult(city);
  }
  // 2. A province ("Laguna", "Cebu").
  if (provincePart) return provinceResult(provincePart);
  // 3. A city name anywhere in the text ("near BGC Taguig").
  const padded = ` ${normalized} `;
  const found = searchKeys.find((key) => padded.includes(` ${key} `));
  if (found) return cityResult(cityIndex.get(found));
  // 4. A region ("NCR", "Central Luzon").
  for (const part of parts) {
    const code = regionIndex.get(part);
    if (code) return { level: 'region', city: null, province: null, region: code, lat: REGIONS[code].lat, lng: REGIONS[code].lng };
  }
  return null;
}
