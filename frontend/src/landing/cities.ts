// Where each city sits on the cleaned India map (public/map/india.webp), as fractions of its width
// and height. Nineteen come from the dots drawn on the original artwork; Coimbatore, Madurai,
// Dharmapuri, Surat and Visakhapatnam were placed from their latitude and longitude with a projection
// fitted to the drawn cities (frontend/scripts/clean_map.py documents the crop). `side` puts the name
// left of the dot where neighbours are close.

export interface MapCity {
  code: string;
  name: string;
  x: number;
  y: number;
  side?: 'left';
}

// Original artwork pixels -> fractions of the cleaned crop (offset 24,151; size 1000 x 1170).
const at = (x: number, y: number) => ({ x: +((x - 24) / 1000).toFixed(4), y: +((y - 151) / 1170).toFixed(4) });

export const CITIES: MapCity[] = [
  { code: 'IN-JK-SXR', name: 'Srinagar', ...at(310, 280) },
  { code: 'IN-JK-JMU', name: 'Jammu', ...at(310, 322) },
  { code: 'IN-CH-CHD', name: 'Chandigarh', ...at(347, 397) },
  { code: 'IN-DL-NCR', name: 'Delhi NCR', ...at(370, 482) },
  { code: 'IN-RJ-JAI', name: 'Jaipur', ...at(313, 556), side: 'left' },
  { code: 'IN-UP-LKO', name: 'Lucknow', ...at(504, 573) },
  { code: 'IN-AS-GUW', name: 'Guwahati', ...at(856, 621) },
  { code: 'IN-BR-PAT', name: 'Patna', ...at(645, 638) },
  { code: 'IN-GJ-AMD', name: 'Ahmedabad', ...at(172, 683) },
  { code: 'IN-MP-BPL', name: 'Bhopal', ...at(379, 707) },
  { code: 'IN-WB-KOL', name: 'Kolkata', ...at(758, 738) },
  { code: 'IN-GJ-SRT', name: 'Surat', ...at(210, 764), side: 'left' },
  { code: 'IN-MH-NAG', name: 'Nagpur', ...at(439, 797) },
  { code: 'IN-MH-MUM', name: 'Mumbai', ...at(230, 839), side: 'left' },
  { code: 'IN-MH-PUN', name: 'Pune', ...at(263, 889) },
  { code: 'IN-TG-HYD', name: 'Hyderabad', ...at(412, 928) },
  { code: 'IN-AP-VSK', name: 'Visakhapatnam', ...at(581, 938) },
  { code: 'IN-KA-BLR', name: 'Bengaluru', ...at(362, 1096), side: 'left' },
  { code: 'IN-TN-CHN', name: 'Chennai', ...at(489, 1115) },
  { code: 'IN-TN-DPI', name: 'Dharmapuri', ...at(396, 1131) },
  { code: 'IN-TN-CBE', name: 'Coimbatore', ...at(357, 1166), side: 'left' },
  { code: 'IN-TN-MDU', name: 'Madurai', ...at(400, 1209) },
  { code: 'IN-KL-TVM', name: 'Thiruvananthapuram', ...at(365, 1245), side: 'left' },
  { code: 'IN-AN-IXZ', name: 'Port Blair', ...at(889, 1103) },
];
