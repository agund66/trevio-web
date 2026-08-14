// ─── Country constants ────────────────────────────────────────────
// Used for phone number country selection and currency auto-selection.
// Covers ~195 countries with ISO-2 codes, dial codes, typical mobile
// digit lengths, and default currency codes.

export const DEFAULT_COUNTRY_CODE = "IN";

/** Default timezone for new users who haven't set one yet */
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export interface CountryInfo {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
  /** Typical mobile number digit count (without country code) */
  phoneLength: number;
  /** Default currency code for this country (used for auto-selection) */
  defaultCurrency: string;
  /** Default IANA timezone for this country (used for auto-selection) */
  defaultTimezone: string;
}

// ─── Supported countries ──────────────────────────────────────────

export const COUNTRY_CODES: CountryInfo[] = [
  { code: "IN", dialCode: "+91", name: "India", flag: "🇮🇳", phoneLength: 10, defaultCurrency: "INR", defaultTimezone: "Asia/Kolkata" },
  { code: "US", dialCode: "+1", name: "United States", flag: "🇺🇸", phoneLength: 10, defaultCurrency: "USD", defaultTimezone: "America/New_York" },
  { code: "GB", dialCode: "+44", name: "United Kingdom", flag: "🇬🇧", phoneLength: 10, defaultCurrency: "GBP", defaultTimezone: "Europe/London" },
  { code: "AE", dialCode: "+971", name: "United Arab Emirates", flag: "🇦🇪", phoneLength: 9, defaultCurrency: "AED", defaultTimezone: "Asia/Dubai" },
  { code: "SG", dialCode: "+65", name: "Singapore", flag: "🇸🇬", phoneLength: 8, defaultCurrency: "SGD", defaultTimezone: "Asia/Singapore" },
  { code: "AU", dialCode: "+61", name: "Australia", flag: "🇦🇺", phoneLength: 9, defaultCurrency: "AUD", defaultTimezone: "Australia/Sydney" },
  { code: "CA", dialCode: "+1", name: "Canada", flag: "🇨🇦", phoneLength: 10, defaultCurrency: "CAD", defaultTimezone: "America/Toronto" },
  { code: "JP", dialCode: "+81", name: "Japan", flag: "🇯🇵", phoneLength: 10, defaultCurrency: "JPY", defaultTimezone: "Asia/Tokyo" },
  { code: "DE", dialCode: "+49", name: "Germany", flag: "🇩🇪", phoneLength: 10, defaultCurrency: "EUR", defaultTimezone: "Europe/Berlin" },
  { code: "FR", dialCode: "+33", name: "France", flag: "🇫🇷", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Paris" },
  { code: "SA", dialCode: "+966", name: "Saudi Arabia", flag: "🇸🇦", phoneLength: 9, defaultCurrency: "SAR", defaultTimezone: "Asia/Riyadh" },
  { code: "PK", dialCode: "+92", name: "Pakistan", flag: "🇵🇰", phoneLength: 10, defaultCurrency: "PKR", defaultTimezone: "Asia/Karachi" },
  { code: "BD", dialCode: "+880", name: "Bangladesh", flag: "🇧🇩", phoneLength: 10, defaultCurrency: "BDT", defaultTimezone: "Asia/Dhaka" },
  { code: "LK", dialCode: "+94", name: "Sri Lanka", flag: "🇱🇰", phoneLength: 10, defaultCurrency: "LKR", defaultTimezone: "Asia/Colombo" },
  { code: "NP", dialCode: "+977", name: "Nepal", flag: "🇳🇵", phoneLength: 10, defaultCurrency: "NPR", defaultTimezone: "Asia/Kathmandu" },
  { code: "ZA", dialCode: "+27", name: "South Africa", flag: "🇿🇦", phoneLength: 9, defaultCurrency: "ZAR", defaultTimezone: "Africa/Johannesburg" },
  { code: "NG", dialCode: "+234", name: "Nigeria", flag: "🇳🇬", phoneLength: 10, defaultCurrency: "NGN", defaultTimezone: "Africa/Lagos" },
  { code: "KE", dialCode: "+254", name: "Kenya", flag: "🇰🇪", phoneLength: 9, defaultCurrency: "KES", defaultTimezone: "Africa/Nairobi" },
  { code: "IT", dialCode: "+39", name: "Italy", flag: "🇮🇹", phoneLength: 10, defaultCurrency: "EUR", defaultTimezone: "Europe/Rome" },
  { code: "ES", dialCode: "+34", name: "Spain", flag: "🇪🇸", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Madrid" },
  { code: "NL", dialCode: "+31", name: "Netherlands", flag: "🇳🇱", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Amsterdam" },
  { code: "BE", dialCode: "+32", name: "Belgium", flag: "🇧🇪", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Brussels" },
  { code: "AT", dialCode: "+43", name: "Austria", flag: "🇦🇹", phoneLength: 10, defaultCurrency: "EUR", defaultTimezone: "Europe/Vienna" },
  { code: "CH", dialCode: "+41", name: "Switzerland", flag: "🇨🇭", phoneLength: 9, defaultCurrency: "CHF", defaultTimezone: "Europe/Zurich" },
  { code: "SE", dialCode: "+46", name: "Sweden", flag: "🇸🇪", phoneLength: 9, defaultCurrency: "SEK", defaultTimezone: "Europe/Stockholm" },
  { code: "NO", dialCode: "+47", name: "Norway", flag: "🇳🇴", phoneLength: 8, defaultCurrency: "NOK", defaultTimezone: "Europe/Oslo" },
  { code: "DK", dialCode: "+45", name: "Denmark", flag: "🇩🇰", phoneLength: 8, defaultCurrency: "DKK", defaultTimezone: "Europe/Copenhagen" },
  { code: "FI", dialCode: "+358", name: "Finland", flag: "🇫🇮", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Helsinki" },
  { code: "IE", dialCode: "+353", name: "Ireland", flag: "🇮🇪", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Dublin" },
  { code: "PT", dialCode: "+351", name: "Portugal", flag: "🇵🇹", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Lisbon" },
  { code: "GR", dialCode: "+30", name: "Greece", flag: "🇬🇷", phoneLength: 10, defaultCurrency: "EUR", defaultTimezone: "Europe/Athens" },
  { code: "PL", dialCode: "+48", name: "Poland", flag: "🇵🇱", phoneLength: 9, defaultCurrency: "PLN", defaultTimezone: "Europe/Warsaw" },
  { code: "CZ", dialCode: "+420", name: "Czech Republic", flag: "🇨🇿", phoneLength: 9, defaultCurrency: "CZK", defaultTimezone: "Europe/Prague" },
  { code: "HU", dialCode: "+36", name: "Hungary", flag: "🇭🇺", phoneLength: 9, defaultCurrency: "HUF", defaultTimezone: "Europe/Budapest" },
  { code: "RO", dialCode: "+40", name: "Romania", flag: "🇷🇴", phoneLength: 9, defaultCurrency: "RON", defaultTimezone: "Europe/Bucharest" },
  { code: "BG", dialCode: "+359", name: "Bulgaria", flag: "🇧🇬", phoneLength: 9, defaultCurrency: "BGN", defaultTimezone: "Europe/Sofia" },
  { code: "HR", dialCode: "+385", name: "Croatia", flag: "🇭🇷", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Zagreb" },
  { code: "SK", dialCode: "+421", name: "Slovakia", flag: "🇸🇰", phoneLength: 9, defaultCurrency: "EUR", defaultTimezone: "Europe/Bratislava" },
  { code: "SI", dialCode: "+386", name: "Slovenia", flag: "🇸🇮", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Ljubljana" },
  { code: "LT", dialCode: "+370", name: "Lithuania", flag: "🇱🇹", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Vilnius" },
  { code: "LV", dialCode: "+371", name: "Latvia", flag: "🇱🇻", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Riga" },
  { code: "EE", dialCode: "+372", name: "Estonia", flag: "🇪🇪", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Tallinn" },
  { code: "IS", dialCode: "+354", name: "Iceland", flag: "🇮🇸", phoneLength: 7, defaultCurrency: "ISK", defaultTimezone: "Atlantic/Reykjavik" },
  { code: "LU", dialCode: "+352", name: "Luxembourg", flag: "🇱🇺", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Luxembourg" },
  { code: "MT", dialCode: "+356", name: "Malta", flag: "🇲🇹", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Malta" },
  { code: "CY", dialCode: "+357", name: "Cyprus", flag: "🇨🇾", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Asia/Nicosia" },
  { code: "RU", dialCode: "+7", name: "Russia", flag: "🇷🇺", phoneLength: 10, defaultCurrency: "RUB", defaultTimezone: "Europe/Moscow" },
  { code: "UA", dialCode: "+380", name: "Ukraine", flag: "🇺🇦", phoneLength: 9, defaultCurrency: "UAH", defaultTimezone: "Europe/Kyiv" },
  { code: "BY", dialCode: "+375", name: "Belarus", flag: "🇧🇾", phoneLength: 9, defaultCurrency: "BYN", defaultTimezone: "Europe/Minsk" },
  { code: "MD", dialCode: "+373", name: "Moldova", flag: "🇲🇩", phoneLength: 8, defaultCurrency: "MDL", defaultTimezone: "Europe/Chisinau" },
  { code: "RS", dialCode: "+381", name: "Serbia", flag: "🇷🇸", phoneLength: 8, defaultCurrency: "RSD", defaultTimezone: "Europe/Belgrade" },
  { code: "BA", dialCode: "+387", name: "Bosnia and Herzegovina", flag: "🇧🇦", phoneLength: 8, defaultCurrency: "BAM", defaultTimezone: "Europe/Sarajevo" },
  { code: "MK", dialCode: "+389", name: "North Macedonia", flag: "🇲🇰", phoneLength: 8, defaultCurrency: "MKD", defaultTimezone: "Europe/Skopje" },
  { code: "AL", dialCode: "+355", name: "Albania", flag: "🇦🇱", phoneLength: 9, defaultCurrency: "ALL", defaultTimezone: "Europe/Tirane" },
  { code: "ME", dialCode: "+382", name: "Montenegro", flag: "🇲🇪", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Podgorica" },
  { code: "XK", dialCode: "+383", name: "Kosovo", flag: "🇽🇰", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Belgrade" },
  { code: "CN", dialCode: "+86", name: "China", flag: "🇨🇳", phoneLength: 11, defaultCurrency: "CNY", defaultTimezone: "Asia/Shanghai" },
  { code: "HK", dialCode: "+852", name: "Hong Kong", flag: "🇭🇰", phoneLength: 8, defaultCurrency: "HKD", defaultTimezone: "Asia/Hong_Kong" },
  { code: "TW", dialCode: "+886", name: "Taiwan", flag: "🇹🇼", phoneLength: 9, defaultCurrency: "TWD", defaultTimezone: "Asia/Taipei" },
  { code: "KR", dialCode: "+82", name: "South Korea", flag: "🇰🇷", phoneLength: 10, defaultCurrency: "KRW", defaultTimezone: "Asia/Seoul" },
  { code: "KP", dialCode: "+850", name: "North Korea", flag: "🇰🇵", phoneLength: 10, defaultCurrency: "KPW", defaultTimezone: "Asia/Pyongyang" },
  { code: "TH", dialCode: "+66", name: "Thailand", flag: "🇹🇭", phoneLength: 9, defaultCurrency: "THB", defaultTimezone: "Asia/Bangkok" },
  { code: "VN", dialCode: "+84", name: "Vietnam", flag: "🇻🇳", phoneLength: 9, defaultCurrency: "VND", defaultTimezone: "Asia/Ho_Chi_Minh" },
  { code: "MY", dialCode: "+60", name: "Malaysia", flag: "🇲🇾", phoneLength: 9, defaultCurrency: "MYR", defaultTimezone: "Asia/Kuala_Lumpur" },
  { code: "ID", dialCode: "+62", name: "Indonesia", flag: "🇮🇩", phoneLength: 10, defaultCurrency: "IDR", defaultTimezone: "Asia/Jakarta" },
  { code: "PH", dialCode: "+63", name: "Philippines", flag: "🇵🇭", phoneLength: 10, defaultCurrency: "PHP", defaultTimezone: "Asia/Manila" },
  { code: "BN", dialCode: "+673", name: "Brunei", flag: "🇧🇳", phoneLength: 7, defaultCurrency: "BND", defaultTimezone: "Asia/Brunei" },
  { code: "KH", dialCode: "+855", name: "Cambodia", flag: "🇰🇭", phoneLength: 9, defaultCurrency: "KHR", defaultTimezone: "Asia/Phnom_Penh" },
  { code: "LA", dialCode: "+856", name: "Laos", flag: "🇱🇦", phoneLength: 9, defaultCurrency: "LAK", defaultTimezone: "Asia/Vientiane" },
  { code: "MM", dialCode: "+95", name: "Myanmar", flag: "🇲🇲", phoneLength: 9, defaultCurrency: "MMK", defaultTimezone: "Asia/Yangon" },
  { code: "TL", dialCode: "+670", name: "Timor-Leste", flag: "🇹🇱", phoneLength: 8, defaultCurrency: "USD", defaultTimezone: "Asia/Dili" },
  { code: "MO", dialCode: "+853", name: "Macao", flag: "🇲🇴", phoneLength: 8, defaultCurrency: "MOP", defaultTimezone: "Asia/Macau" },
  { code: "AF", dialCode: "+93", name: "Afghanistan", flag: "🇦🇫", phoneLength: 9, defaultCurrency: "AFN", defaultTimezone: "Asia/Kabul" },
  { code: "IR", dialCode: "+98", name: "Iran", flag: "🇮🇷", phoneLength: 10, defaultCurrency: "IRR", defaultTimezone: "Asia/Tehran" },
  { code: "IQ", dialCode: "+964", name: "Iraq", flag: "🇮🇶", phoneLength: 10, defaultCurrency: "IQD", defaultTimezone: "Asia/Baghdad" },
  { code: "SY", dialCode: "+963", name: "Syria", flag: "🇸🇾", phoneLength: 9, defaultCurrency: "SYP", defaultTimezone: "Asia/Damascus" },
  { code: "LB", dialCode: "+961", name: "Lebanon", flag: "🇱🇧", phoneLength: 8, defaultCurrency: "LBP", defaultTimezone: "Asia/Beirut" },
  { code: "JO", dialCode: "+962", name: "Jordan", flag: "🇯🇴", phoneLength: 9, defaultCurrency: "JOD", defaultTimezone: "Asia/Amman" },
  { code: "IL", dialCode: "+972", name: "Israel", flag: "🇮🇱", phoneLength: 9, defaultCurrency: "ILS", defaultTimezone: "Asia/Jerusalem" },
  { code: "PS", dialCode: "+970", name: "Palestine", flag: "🇵🇸", phoneLength: 9, defaultCurrency: "ILS", defaultTimezone: "Asia/Gaza" },
  { code: "YE", dialCode: "+967", name: "Yemen", flag: "🇾🇪", phoneLength: 9, defaultCurrency: "YER", defaultTimezone: "Asia/Aden" },
  { code: "OM", dialCode: "+968", name: "Oman", flag: "🇴🇲", phoneLength: 8, defaultCurrency: "OMR", defaultTimezone: "Asia/Muscat" },
  { code: "QA", dialCode: "+974", name: "Qatar", flag: "🇶🇦", phoneLength: 8, defaultCurrency: "QAR", defaultTimezone: "Asia/Qatar" },
  { code: "KW", dialCode: "+965", name: "Kuwait", flag: "🇰🇼", phoneLength: 8, defaultCurrency: "KWD", defaultTimezone: "Asia/Kuwait" },
  { code: "BH", dialCode: "+973", name: "Bahrain", flag: "🇧🇭", phoneLength: 8, defaultCurrency: "BHD", defaultTimezone: "Asia/Bahrain" },
  { code: "TR", dialCode: "+90", name: "Turkey", flag: "🇹🇷", phoneLength: 10, defaultCurrency: "TRY", defaultTimezone: "Europe/Istanbul" },
  { code: "EG", dialCode: "+20", name: "Egypt", flag: "🇪🇬", phoneLength: 10, defaultCurrency: "EGP", defaultTimezone: "Africa/Cairo" },
  { code: "LY", dialCode: "+218", name: "Libya", flag: "🇱🇾", phoneLength: 9, defaultCurrency: "LYD", defaultTimezone: "Africa/Tripoli" },
  { code: "TN", dialCode: "+216", name: "Tunisia", flag: "🇹🇳", phoneLength: 8, defaultCurrency: "TND", defaultTimezone: "Africa/Tunis" },
  { code: "DZ", dialCode: "+213", name: "Algeria", flag: "🇩🇿", phoneLength: 9, defaultCurrency: "DZD", defaultTimezone: "Africa/Algiers" },
  { code: "MA", dialCode: "+212", name: "Morocco", flag: "🇲🇦", phoneLength: 9, defaultCurrency: "MAD", defaultTimezone: "Africa/Casablanca" },
  { code: "SD", dialCode: "+249", name: "Sudan", flag: "🇸🇩", phoneLength: 9, defaultCurrency: "SDG", defaultTimezone: "Africa/Khartoum" },
  { code: "SS", dialCode: "+211", name: "South Sudan", flag: "🇸🇸", phoneLength: 9, defaultCurrency: "SSP", defaultTimezone: "Africa/Juba" },
  { code: "ET", dialCode: "+251", name: "Ethiopia", flag: "🇪🇹", phoneLength: 9, defaultCurrency: "ETB", defaultTimezone: "Africa/Addis_Ababa" },
  { code: "ER", dialCode: "+291", name: "Eritrea", flag: "🇪🇷", phoneLength: 7, defaultCurrency: "ERN", defaultTimezone: "Africa/Asmara" },
  { code: "DJ", dialCode: "+253", name: "Djibouti", flag: "🇩🇯", phoneLength: 8, defaultCurrency: "DJF", defaultTimezone: "Africa/Djibouti" },
  { code: "SO", dialCode: "+252", name: "Somalia", flag: "🇸🇴", phoneLength: 9, defaultCurrency: "SOS", defaultTimezone: "Africa/Mogadishu" },
  { code: "TZ", dialCode: "+255", name: "Tanzania", flag: "🇹🇿", phoneLength: 9, defaultCurrency: "TZS", defaultTimezone: "Africa/Dar_es_Salaam" },
  { code: "UG", dialCode: "+256", name: "Uganda", flag: "🇺🇬", phoneLength: 9, defaultCurrency: "UGX", defaultTimezone: "Africa/Kampala" },
  { code: "RW", dialCode: "+250", name: "Rwanda", flag: "🇷🇼", phoneLength: 9, defaultCurrency: "RWF", defaultTimezone: "Africa/Kigali" },
  { code: "BI", dialCode: "+257", name: "Burundi", flag: "🇧🇮", phoneLength: 8, defaultCurrency: "BIF", defaultTimezone: "Africa/Bujumbura" },
  { code: "MZ", dialCode: "+258", name: "Mozambique", flag: "🇲🇿", phoneLength: 9, defaultCurrency: "MZN", defaultTimezone: "Africa/Maputo" },
  { code: "ZW", dialCode: "+263", name: "Zimbabwe", flag: "🇿🇼", phoneLength: 9, defaultCurrency: "ZWL", defaultTimezone: "Africa/Harare" },
  { code: "ZM", dialCode: "+260", name: "Zambia", flag: "🇿🇲", phoneLength: 9, defaultCurrency: "ZMW", defaultTimezone: "Africa/Lusaka" },
  { code: "MW", dialCode: "+265", name: "Malawi", flag: "🇲🇼", phoneLength: 9, defaultCurrency: "MWK", defaultTimezone: "Africa/Blantyre" },
  { code: "BW", dialCode: "+267", name: "Botswana", flag: "🇧🇼", phoneLength: 8, defaultCurrency: "BWP", defaultTimezone: "Africa/Gaborone" },
  { code: "NA", dialCode: "+264", name: "Namibia", flag: "🇳🇦", phoneLength: 9, defaultCurrency: "NAD", defaultTimezone: "Africa/Windhoek" },
  { code: "LS", dialCode: "+266", name: "Lesotho", flag: "🇱🇸", phoneLength: 8, defaultCurrency: "LSL", defaultTimezone: "Africa/Maseru" },
  { code: "SZ", dialCode: "+268", name: "Eswatini", flag: "🇸🇿", phoneLength: 8, defaultCurrency: "SZL", defaultTimezone: "Africa/Mbabane" },
  { code: "AO", dialCode: "+244", name: "Angola", flag: "🇦🇴", phoneLength: 9, defaultCurrency: "AOA", defaultTimezone: "Africa/Luanda" },
  { code: "GH", dialCode: "+233", name: "Ghana", flag: "🇬🇭", phoneLength: 9, defaultCurrency: "GHS", defaultTimezone: "Africa/Accra" },
  { code: "CI", dialCode: "+225", name: "Côte d'Ivoire", flag: "🇨🇮", phoneLength: 10, defaultCurrency: "XOF", defaultTimezone: "Africa/Abidjan" },
  { code: "SN", dialCode: "+221", name: "Senegal", flag: "🇸🇳", phoneLength: 9, defaultCurrency: "XOF", defaultTimezone: "Africa/Dakar" },
  { code: "ML", dialCode: "+223", name: "Mali", flag: "🇲🇱", phoneLength: 8, defaultCurrency: "XOF", defaultTimezone: "Africa/Bamako" },
  { code: "BF", dialCode: "+226", name: "Burkina Faso", flag: "🇧🇫", phoneLength: 8, defaultCurrency: "XOF", defaultTimezone: "Africa/Ouagadougou" },
  { code: "NE", dialCode: "+227", name: "Niger", flag: "🇳🇪", phoneLength: 8, defaultCurrency: "XOF", defaultTimezone: "Africa/Niamey" },
  { code: "BJ", dialCode: "+229", name: "Benin", flag: "🇧🇯", phoneLength: 8, defaultCurrency: "XOF", defaultTimezone: "Africa/Porto-Novo" },
  { code: "TG", dialCode: "+228", name: "Togo", flag: "🇹🇬", phoneLength: 8, defaultCurrency: "XOF", defaultTimezone: "Africa/Lome" },
  { code: "GN", dialCode: "+224", name: "Guinea", flag: "🇬🇳", phoneLength: 9, defaultCurrency: "GNF", defaultTimezone: "Africa/Conakry" },
  { code: "SL", dialCode: "+232", name: "Sierra Leone", flag: "🇸🇱", phoneLength: 8, defaultCurrency: "SLL", defaultTimezone: "Africa/Freetown" },
  { code: "LR", dialCode: "+231", name: "Liberia", flag: "🇱🇷", phoneLength: 9, defaultCurrency: "LRD", defaultTimezone: "Africa/Monrovia" },
  { code: "MR", dialCode: "+222", name: "Mauritania", flag: "🇲🇷", phoneLength: 8, defaultCurrency: "MRU", defaultTimezone: "Africa/Nouakchott" },
  { code: "GM", dialCode: "+220", name: "Gambia", flag: "🇬🇲", phoneLength: 7, defaultCurrency: "GMD", defaultTimezone: "Africa/Banjul" },
  { code: "CV", dialCode: "+238", name: "Cape Verde", flag: "🇨🇻", phoneLength: 7, defaultCurrency: "CVE", defaultTimezone: "Atlantic/Cape_Verde" },
  { code: "ST", dialCode: "+239", name: "São Tomé and Príncipe", flag: "🇸🇹", phoneLength: 7, defaultCurrency: "STN", defaultTimezone: "Africa/Sao_Tome" },
  { code: "GW", dialCode: "+245", name: "Guinea-Bissau", flag: "🇬🇼", phoneLength: 9, defaultCurrency: "XOF", defaultTimezone: "Africa/Bissau" },
  { code: "GQ", dialCode: "+240", name: "Equatorial Guinea", flag: "🇬🇶", phoneLength: 9, defaultCurrency: "XAF", defaultTimezone: "Africa/Malabo" },
  { code: "GA", dialCode: "+241", name: "Gabon", flag: "🇬🇦", phoneLength: 8, defaultCurrency: "XAF", defaultTimezone: "Africa/Libreville" },
  { code: "CG", dialCode: "+242", name: "Congo", flag: "🇨🇬", phoneLength: 9, defaultCurrency: "XAF", defaultTimezone: "Africa/Brazzaville" },
  { code: "CD", dialCode: "+243", name: "DR Congo", flag: "🇨🇩", phoneLength: 9, defaultCurrency: "CDF", defaultTimezone: "Africa/Kinshasa" },
  { code: "TD", dialCode: "+235", name: "Chad", flag: "🇹🇩", phoneLength: 8, defaultCurrency: "XAF", defaultTimezone: "Africa/Ndjamena" },
  { code: "CF", dialCode: "+236", name: "Central African Republic", flag: "🇨🇫", phoneLength: 8, defaultCurrency: "XAF", defaultTimezone: "Africa/Bangui" },
  { code: "CM", dialCode: "+237", name: "Cameroon", flag: "🇨🇲", phoneLength: 9, defaultCurrency: "XAF", defaultTimezone: "Africa/Douala" },
  { code: "KM", dialCode: "+269", name: "Comoros", flag: "🇰🇲", phoneLength: 7, defaultCurrency: "KMF", defaultTimezone: "Indian/Comoro" },
  { code: "MG", dialCode: "+261", name: "Madagascar", flag: "🇲🇬", phoneLength: 9, defaultCurrency: "MGA", defaultTimezone: "Indian/Antananarivo" },
  { code: "MU", dialCode: "+230", name: "Mauritius", flag: "🇲🇺", phoneLength: 8, defaultCurrency: "MUR", defaultTimezone: "Indian/Mauritius" },
  { code: "SC", dialCode: "+248", name: "Seychelles", flag: "🇸🇨", phoneLength: 7, defaultCurrency: "SCR", defaultTimezone: "Indian/Mahe" },
  { code: "BR", dialCode: "+55", name: "Brazil", flag: "🇧🇷", phoneLength: 11, defaultCurrency: "BRL", defaultTimezone: "America/Sao_Paulo" },
  { code: "AR", dialCode: "+54", name: "Argentina", flag: "🇦🇷", phoneLength: 10, defaultCurrency: "ARS", defaultTimezone: "America/Argentina/Buenos_Aires" },
  { code: "MX", dialCode: "+52", name: "Mexico", flag: "🇲🇽", phoneLength: 10, defaultCurrency: "MXN", defaultTimezone: "America/Mexico_City" },
  { code: "CO", dialCode: "+57", name: "Colombia", flag: "🇨🇴", phoneLength: 10, defaultCurrency: "COP", defaultTimezone: "America/Bogota" },
  { code: "CL", dialCode: "+56", name: "Chile", flag: "🇨🇱", phoneLength: 9, defaultCurrency: "CLP", defaultTimezone: "America/Santiago" },
  { code: "PE", dialCode: "+51", name: "Peru", flag: "🇵🇪", phoneLength: 9, defaultCurrency: "PEN", defaultTimezone: "America/Lima" },
  { code: "VE", dialCode: "+58", name: "Venezuela", flag: "🇻🇪", phoneLength: 10, defaultCurrency: "VES", defaultTimezone: "America/Caracas" },
  { code: "EC", dialCode: "+593", name: "Ecuador", flag: "🇪🇨", phoneLength: 9, defaultCurrency: "USD", defaultTimezone: "America/Guayaquil" },
  { code: "BO", dialCode: "+591", name: "Bolivia", flag: "🇧🇴", phoneLength: 8, defaultCurrency: "BOB", defaultTimezone: "America/La_Paz" },
  { code: "PY", dialCode: "+595", name: "Paraguay", flag: "🇵🇾", phoneLength: 9, defaultCurrency: "PYG", defaultTimezone: "America/Asuncion" },
  { code: "UY", dialCode: "+598", name: "Uruguay", flag: "🇺🇾", phoneLength: 8, defaultCurrency: "UYU", defaultTimezone: "America/Montevideo" },
  { code: "GY", dialCode: "+592", name: "Guyana", flag: "🇬🇾", phoneLength: 7, defaultCurrency: "GYD", defaultTimezone: "America/Guyana" },
  { code: "SR", dialCode: "+597", name: "Suriname", flag: "🇸🇷", phoneLength: 7, defaultCurrency: "SRD", defaultTimezone: "America/Paramaribo" },
  { code: "CR", dialCode: "+506", name: "Costa Rica", flag: "🇨🇷", phoneLength: 8, defaultCurrency: "CRC", defaultTimezone: "America/Costa_Rica" },
  { code: "PA", dialCode: "+507", name: "Panama", flag: "🇵🇦", phoneLength: 8, defaultCurrency: "USD", defaultTimezone: "America/Panama" },
  { code: "GT", dialCode: "+502", name: "Guatemala", flag: "🇬🇹", phoneLength: 8, defaultCurrency: "GTQ", defaultTimezone: "America/Guatemala" },
  { code: "HN", dialCode: "+504", name: "Honduras", flag: "🇭🇳", phoneLength: 8, defaultCurrency: "HNL", defaultTimezone: "America/Tegucigalpa" },
  { code: "SV", dialCode: "+503", name: "El Salvador", flag: "🇸🇻", phoneLength: 8, defaultCurrency: "USD", defaultTimezone: "America/El_Salvador" },
  { code: "NI", dialCode: "+505", name: "Nicaragua", flag: "🇳🇮", phoneLength: 8, defaultCurrency: "NIO", defaultTimezone: "America/Managua" },
  { code: "CU", dialCode: "+53", name: "Cuba", flag: "🇨🇺", phoneLength: 8, defaultCurrency: "CUP", defaultTimezone: "America/Havana" },
  { code: "DO", dialCode: "+1", name: "Dominican Republic", flag: "🇩🇴", phoneLength: 10, defaultCurrency: "DOP", defaultTimezone: "America/Santo_Domingo" },
  { code: "HT", dialCode: "+509", name: "Haiti", flag: "🇭🇹", phoneLength: 8, defaultCurrency: "HTG", defaultTimezone: "America/Port-au-Prince" },
  { code: "JM", dialCode: "+1", name: "Jamaica", flag: "🇯🇲", phoneLength: 10, defaultCurrency: "JMD", defaultTimezone: "America/Jamaica" },
  { code: "TT", dialCode: "+1", name: "Trinidad and Tobago", flag: "🇹🇹", phoneLength: 10, defaultCurrency: "TTD", defaultTimezone: "America/Port_of_Spain" },
  { code: "BB", dialCode: "+1", name: "Barbados", flag: "🇧🇧", phoneLength: 10, defaultCurrency: "BBD", defaultTimezone: "America/Barbados" },
  { code: "BS", dialCode: "+1", name: "Bahamas", flag: "🇧🇸", phoneLength: 10, defaultCurrency: "BSD", defaultTimezone: "America/Nassau" },
  { code: "GD", dialCode: "+1", name: "Grenada", flag: "🇬🇩", phoneLength: 10, defaultCurrency: "XCD", defaultTimezone: "America/Grenada" },
  { code: "LC", dialCode: "+1", name: "Saint Lucia", flag: "🇱🇨", phoneLength: 10, defaultCurrency: "XCD", defaultTimezone: "America/St_Lucia" },
  { code: "VC", dialCode: "+1", name: "Saint Vincent", flag: "🇻🇨", phoneLength: 10, defaultCurrency: "XCD", defaultTimezone: "America/St_Vincent" },
  { code: "AG", dialCode: "+1", name: "Antigua and Barbuda", flag: "🇦🇬", phoneLength: 10, defaultCurrency: "XCD", defaultTimezone: "America/Antigua" },
  { code: "DM", dialCode: "+1", name: "Dominica", flag: "🇩🇲", phoneLength: 10, defaultCurrency: "XCD", defaultTimezone: "America/Dominica" },
  { code: "KN", dialCode: "+1", name: "Saint Kitts and Nevis", flag: "🇰🇳", phoneLength: 10, defaultCurrency: "XCD", defaultTimezone: "America/St_Kitts" },
  { code: "BZ", dialCode: "+501", name: "Belize", flag: "🇧🇿", phoneLength: 7, defaultCurrency: "BZD", defaultTimezone: "America/Belize" },
  { code: "PR", dialCode: "+1", name: "Puerto Rico", flag: "🇵🇷", phoneLength: 10, defaultCurrency: "USD", defaultTimezone: "America/Puerto_Rico" },
  { code: "NZ", dialCode: "+64", name: "New Zealand", flag: "🇳🇿", phoneLength: 9, defaultCurrency: "NZD", defaultTimezone: "Pacific/Auckland" },
  { code: "FJ", dialCode: "+679", name: "Fiji", flag: "🇫🇯", phoneLength: 7, defaultCurrency: "FJD", defaultTimezone: "Pacific/Fiji" },
  { code: "PG", dialCode: "+675", name: "Papua New Guinea", flag: "🇵🇬", phoneLength: 8, defaultCurrency: "PGK", defaultTimezone: "Pacific/Port_Moresby" },
  { code: "SB", dialCode: "+677", name: "Solomon Islands", flag: "🇸🇧", phoneLength: 7, defaultCurrency: "SBD", defaultTimezone: "Pacific/Guadalcanal" },
  { code: "VU", dialCode: "+678", name: "Vanuatu", flag: "🇻🇺", phoneLength: 7, defaultCurrency: "VUV", defaultTimezone: "Pacific/Efate" },
  { code: "WS", dialCode: "+685", name: "Samoa", flag: "🇼🇸", phoneLength: 7, defaultCurrency: "WST", defaultTimezone: "Pacific/Apia" },
  { code: "TO", dialCode: "+676", name: "Tonga", flag: "🇹🇴", phoneLength: 7, defaultCurrency: "TOP", defaultTimezone: "Pacific/Tongatapu" },
  { code: "KI", dialCode: "+686", name: "Kiribati", flag: "🇰🇮", phoneLength: 5, defaultCurrency: "AUD", defaultTimezone: "Pacific/Tarawa" },
  { code: "TV", dialCode: "+688", name: "Tuvalu", flag: "🇹🇻", phoneLength: 5, defaultCurrency: "AUD", defaultTimezone: "Pacific/Funafuti" },
  { code: "NR", dialCode: "+674", name: "Nauru", flag: "🇳🇷", phoneLength: 7, defaultCurrency: "AUD", defaultTimezone: "Pacific/Nauru" },
  { code: "PW", dialCode: "+680", name: "Palau", flag: "🇵🇼", phoneLength: 7, defaultCurrency: "USD", defaultTimezone: "Pacific/Palau" },
  { code: "MH", dialCode: "+692", name: "Marshall Islands", flag: "🇲🇭", phoneLength: 7, defaultCurrency: "USD", defaultTimezone: "Pacific/Majuro" },
  { code: "FM", dialCode: "+691", name: "Micronesia", flag: "🇫🇲", phoneLength: 7, defaultCurrency: "USD", defaultTimezone: "Pacific/Pohnpei" },
  { code: "CK", dialCode: "+682", name: "Cook Islands", flag: "🇨🇰", phoneLength: 5, defaultCurrency: "NZD", defaultTimezone: "Pacific/Rarotonga" },
  { code: "NU", dialCode: "+683", name: "Niue", flag: "🇳🇺", phoneLength: 4, defaultCurrency: "NZD", defaultTimezone: "Pacific/Niue" },
  { code: "KZ", dialCode: "+7", name: "Kazakhstan", flag: "🇰🇿", phoneLength: 10, defaultCurrency: "KZT", defaultTimezone: "Asia/Almaty" },
  { code: "UZ", dialCode: "+998", name: "Uzbekistan", flag: "🇺🇿", phoneLength: 9, defaultCurrency: "UZS", defaultTimezone: "Asia/Tashkent" },
  { code: "TM", dialCode: "+993", name: "Turkmenistan", flag: "🇹🇲", phoneLength: 8, defaultCurrency: "TMT", defaultTimezone: "Asia/Ashgabat" },
  { code: "KG", dialCode: "+996", name: "Kyrgyzstan", flag: "🇰🇬", phoneLength: 9, defaultCurrency: "KGS", defaultTimezone: "Asia/Bishkek" },
  { code: "TJ", dialCode: "+992", name: "Tajikistan", flag: "🇹🇯", phoneLength: 9, defaultCurrency: "TJS", defaultTimezone: "Asia/Dushanbe" },
  { code: "MN", dialCode: "+976", name: "Mongolia", flag: "🇲🇳", phoneLength: 8, defaultCurrency: "MNT", defaultTimezone: "Asia/Ulaanbaatar" },
  { code: "GE", dialCode: "+995", name: "Georgia", flag: "🇬🇪", phoneLength: 9, defaultCurrency: "GEL", defaultTimezone: "Asia/Tbilisi" },
  { code: "AM", dialCode: "+374", name: "Armenia", flag: "🇦🇲", phoneLength: 9, defaultCurrency: "AMD", defaultTimezone: "Asia/Yerevan" },
  { code: "AZ", dialCode: "+994", name: "Azerbaijan", flag: "🇦🇿", phoneLength: 9, defaultCurrency: "AZN", defaultTimezone: "Asia/Baku" },
  { code: "BT", dialCode: "+975", name: "Bhutan", flag: "🇧🇹", phoneLength: 8, defaultCurrency: "BTN", defaultTimezone: "Asia/Thimphu" },
  { code: "MV", dialCode: "+960", name: "Maldives", flag: "🇲🇻", phoneLength: 7, defaultCurrency: "MVR", defaultTimezone: "Indian/Maldives" },
  { code: "VA", dialCode: "+39", name: "Vatican City", flag: "🇻🇦", phoneLength: 10, defaultCurrency: "EUR", defaultTimezone: "Europe/Vatican" },
  { code: "MC", dialCode: "+377", name: "Monaco", flag: "🇲🇨", phoneLength: 8, defaultCurrency: "EUR", defaultTimezone: "Europe/Monaco" },
  { code: "SM", dialCode: "+378", name: "San Marino", flag: "🇸🇲", phoneLength: 10, defaultCurrency: "EUR", defaultTimezone: "Europe/San_Marino" },
  { code: "AD", dialCode: "+376", name: "Andorra", flag: "🇦🇩", phoneLength: 6, defaultCurrency: "EUR", defaultTimezone: "Europe/Andorra" },
  { code: "LI", dialCode: "+423", name: "Liechtenstein", flag: "🇱🇮", phoneLength: 7, defaultCurrency: "CHF", defaultTimezone: "Europe/Vaduz" },
];

/** Set of all supported country codes for validation */
export const SUPPORTED_COUNTRY_CODES = new Set(COUNTRY_CODES.map((c) => c.code));

/** Check if a country code is supported */
export function isSupportedCountry(code: string): boolean {
  return SUPPORTED_COUNTRY_CODES.has(code);
}

/** Look up a country by its ISO-2 code; falls back to the default country */
export function getCountryByCode(code: string): CountryInfo {
  return COUNTRY_CODES.find((c) => c.code === code) || COUNTRY_CODES[0];
}

/** Get the default currency for a given country code */
export function getCurrencyForCountry(countryCode: string): string {
  return getCountryByCode(countryCode).defaultCurrency;
}

/** Get the default IANA timezone for a given country code */
export function getTimezoneForCountry(countryCode: string): string {
  return getCountryByCode(countryCode).defaultTimezone;
}
