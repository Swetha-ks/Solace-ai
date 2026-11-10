import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PHRASES from './phrases';

export const LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'kn', native: 'ಕನ್ನಡ' },
  { code: 'ta', native: 'தமிழ்' },
  { code: 'es', native: 'Español' },
];

const STRINGS = {
  en: {
    quietPlace: 'a quiet place',
    welcomeEyebrow: 'YOUR SPACE, ALWAYS OPEN',
    welcomeHi: 'Hi,',
    welcomeFriend: 'best friend.',
    welcomeSub:
      'You don’t have to carry today alone. Tell me what it felt like — the heavy parts, the quiet parts, all of it.',
    welcomeTap: 'TAP TO COME IN',
    welcomeFootnote: 'No account needed to start. Just you and me.',
    languageTitle: 'Choose your language',
    languageSub: 'Solace will speak with you in this language.',
    navHome: 'Haven',
    navBreathe: 'Breathe',
    navYou: 'You',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    greetingAwake: 'Still awake',
    homeFriend: 'friend.',
    homeSub: 'However today went, you don’t have to hold it on your own.',
    noteEyebrow: 'A NOTE FROM SOLACE',
    noteSub: 'no rush, no agenda',
    noteText:
      "I'm here, with no rush. Tell me what today felt like - or we can just sit in the quiet together.",
    noteAction: 'Start a conversation',
    ritualEyebrow: 'A TINY RITUAL FOR TODAY',
    ritualDone: 'Kept for today',
    ritualMark: 'I did this',
  },
  hi: {
    quietPlace: 'एक शांत जगह',
    welcomeEyebrow: 'आपकी जगह, हमेशा खुली',
    welcomeHi: 'नमस्ते,',
    welcomeFriend: 'प्यारे दोस्त।',
    welcomeSub:
      'आज का दिन अकेले उठाना नहीं है। मुझे बताइए कैसा लगा — भारी हिस्से, शांत हिस्से, सब कुछ।',
    welcomeTap: 'अंदर आने के लिए टैप करें',
    welcomeFootnote: 'शुरू करने के लिए खाते की ज़रूरत नहीं। बस आप और मैं।',
    languageTitle: 'अपनी भाषा चुनें',
    languageSub: 'सोलेस आपसे इसी भाषा में बात करेगा।',
    navHome: 'घर',
    navBreathe: 'साँस',
    navYou: 'आप',
    greetingMorning: 'सुप्रभात',
    greetingAfternoon: 'नमस्ते',
    greetingEvening: 'शुभ संध्या',
    greetingAwake: 'अभी भी जागे हैं',
    homeFriend: 'दोस्त।',
    homeSub: 'आज कैसा भी रहा हो, इसे अकेले नहीं उठाना है।',
    noteEyebrow: 'सोलेस की एक बात',
    noteSub: 'कोई जल्दी नहीं, कोई एजेंडा नहीं',
    noteText:
      'मैं यहाँ हूँ, बिना जल्दी के। बताइए आज कैसा लगा - या हम चुपचाप साथ बैठ सकते हैं।',
    noteAction: 'बात शुरू करें',
    ritualEyebrow: 'आज का छोटा अनुष्ठान',
    ritualDone: 'आज के लिए रखा',
    ritualMark: 'मैंने कर लिया',
  },
  kn: {
    quietPlace: 'ಶಾಂತ ಜಾಗ',
    welcomeEyebrow: 'ನಿಮ್ಮ ಜಾಗ, ಯಾವಾಗಲೂ ತೆರೆದಿದೆ',
    welcomeHi: 'ನಮಸ್ಕಾರ,',
    welcomeFriend: 'ಆತ್ಮೀಯ ಗೆಳೆಯ.',
    welcomeSub:
      'ಇಂದಿನ ದಿನವನ್ನು ಒಂಟಿಯಾಗಿ ಹೊರಬೇಕಿಲ್ಲ. ಹೇಗನಿಸಿತು ಎಂದು ಹೇಳಿ — ಭಾರವಾದ ಭಾಗಗಳು, ಶಾಂತ ಭಾಗಗಳು, ಎಲ್ಲವೂ.',
    welcomeTap: 'ಒಳಗೆ ಬರಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    welcomeFootnote: 'ಪ್ರಾರಂಭಿಸಲು ಖಾತೆ ಬೇಕಿಲ್ಲ. ನೀವು ಮತ್ತು ನಾನು ಮಾತ್ರ.',
    languageTitle: 'ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ',
    languageSub: 'ಸೋಲೇಸ್ ನಿಮ್ಮೊಂದಿಗೆ ಈ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡುತ್ತದೆ.',
    navHome: 'ನೆಲೆ',
    navBreathe: 'ಉಸಿರು',
    navYou: 'ನೀವು',
    greetingMorning: 'ಶುಭೋದಯ',
    greetingAfternoon: 'ನಮಸ್ಕಾರ',
    greetingEvening: 'ಶುಭ ಸಂಜೆ',
    greetingAwake: 'ಇನ್ನೂ ಎಚ್ಚರ',
    homeFriend: 'ಗೆಳೆಯ.',
    homeSub: 'ಇಂದು ಹೇಗೇ ಇರಲಿ, ಅದನ್ನು ಒಂಟಿಯಾಗಿ ಹೊರಬೇಕಿಲ್ಲ.',
    noteEyebrow: 'ಸೋಲೇಸ್‌ನ ಒಂದು ಮಾತು',
    noteSub: 'ಯಾವುದೇ ಆತುರವಿಲ್ಲ, ಯಾವುದೇ ಯೋಜನೆಯಿಲ್ಲ',
    noteText:
      'ನಾನು ಇಲ್ಲಿದ್ದೇನೆ, ಆತುರವಿಲ್ಲದೆ. ಇಂದು ಹೇಗನಿಸಿತು ಹೇಳಿ - ಅಥವಾ ನಾವು ಮೌನದಲ್ಲಿ ಜೊತೆಯಾಗಿ ಕುಳಿತುಕೊಳ್ಳಬಹುದು.',
    noteAction: 'ಮಾತು ಪ್ರಾರಂಭಿಸಿ',
    ritualEyebrow: 'ಇಂದಿನ ಸಣ್ಣ ಆಚರಣೆ',
    ritualDone: 'ಇಂದಿಗೆ ಉಳಿಸಲಾಗಿದೆ',
    ritualMark: 'ನಾನು ಇದನ್ನು ಮಾಡಿದೆ',
  },
  ta: {
    quietPlace: 'ஒரு அமைதியான இடம்',
    welcomeEyebrow: 'உங்கள் இடம், எப்போதும் திறந்திருக்கும்',
    welcomeHi: 'வணக்கம்,',
    welcomeFriend: 'அன்பான நண்பரே.',
    welcomeSub:
      'இன்றைய நாளை தனியாக சுமக்க வேண்டியதில்லை. எப்படி உணர்ந்தீர்கள் என்று சொல்லுங்கள் — கனமான பகுதிகள், அமைதியான பகுதிகள், எல்லாம்.',
    welcomeTap: 'உள்ளே வர தட்டுங்கள்',
    welcomeFootnote: 'தொடங்க கணக்கு தேவையில்லை. நீங்களும் நானும் மட்டும்.',
    languageTitle: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    languageSub: 'சோலேஸ் இந்த மொழியில் உங்களுடன் பேசும்.',
    navHome: 'இல்லம்',
    navBreathe: 'மூச்சு',
    navYou: 'நீங்கள்',
    greetingMorning: 'காலை வணக்கம்',
    greetingAfternoon: 'மதிய வணக்கம்',
    greetingEvening: 'மாலை வணக்கம்',
    greetingAwake: 'இன்னும் விழித்திருக்கிறீர்கள்',
    homeFriend: 'நண்பரே.',
    homeSub: 'இன்று எப்படி இருந்தாலும், அதை தனியாக சுமக்க வேண்டியதில்லை.',
    noteEyebrow: 'சோலேஸின் ஒரு குறிப்பு',
    noteSub: 'அவசரமில்லை, எந்த நிர்ப்பந்தமும் இல்லை',
    noteText:
      'நான் இங்கே இருக்கிறேன், அவசரமின்றி. இன்று எப்படி உணர்ந்தீர்கள் என்று சொல்லுங்கள் - அல்லது நாம் அமைதியாக ஒன்றாக அமரலாம்.',
    noteAction: 'உரையாடலைத் தொடங்குங்கள்',
    ritualEyebrow: 'இன்றைய சிறு சடங்கு',
    ritualDone: 'இன்றைக்கு வைக்கப்பட்டது',
    ritualMark: 'நான் இதைச் செய்தேன்',
  },
  es: {
    quietPlace: 'un lugar tranquilo',
    welcomeEyebrow: 'TU ESPACIO, SIEMPRE ABIERTO',
    welcomeHi: 'Hola,',
    welcomeFriend: 'mejor amigo.',
    welcomeSub:
      'No tienes que cargar con hoy a solas. Cuéntame cómo se sintió: las partes pesadas, las partes tranquilas, todo.',
    welcomeTap: 'TOCA PARA ENTRAR',
    welcomeFootnote: 'No necesitas cuenta para empezar. Solo tú y yo.',
    languageTitle: 'Elige tu idioma',
    languageSub: 'Solace hablará contigo en este idioma.',
    navHome: 'Hogar',
    navBreathe: 'Respira',
    navYou: 'Tú',
    greetingMorning: 'Buenos días',
    greetingAfternoon: 'Buenas tardes',
    greetingEvening: 'Buenas noches',
    greetingAwake: 'Aún despierto',
    homeFriend: 'amigo.',
    homeSub: 'Sea como haya sido hoy, no tienes que sostenerlo solo.',
    noteEyebrow: 'UNA NOTA DE SOLACE',
    noteSub: 'sin prisa, sin agenda',
    noteText:
      'Estoy aquí, sin prisa. Cuéntame cómo se sintió hoy, o podemos quedarnos en silencio juntos.',
    noteAction: 'Empezar una conversación',
    ritualEyebrow: 'UN PEQUEÑO RITUAL PARA HOY',
    ritualDone: 'Guardado para hoy',
    ritualMark: 'Lo hice',
  },
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => STRINGS.en[key] ?? key,
  tr: (text) => text,
});

// Non-hook access for the API layer.
let currentLanguage = 'en';

/**
 * Looks up a whole English UI phrase in the generated phrase table.
 * Unknown strings fall back to English, so the app always stays readable.
 */
export function translatePhrase(text, lang = currentLanguage) {
  if (typeof text !== 'string' || !text.trim() || lang === 'en') return text;
  const table = PHRASES[lang];
  if (!table) return text;
  return table[text.trim()] || text;
}

// Non-hook translate for code that runs outside a component.
export function trNow(text) {
  return translatePhrase(text, currentLanguage);
}

export function getLanguage() {
  return currentLanguage;
}

export function languageName(code) {
  return LANGUAGES.find((item) => item.code === code)?.native || 'English';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@solace_language');
        if (mounted && saved && STRINGS[saved]) {
          currentLanguage = saved;
          setLanguageState(saved);
        }
      } catch (e) {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = (code) => {
    if (!STRINGS[code]) return;
    currentLanguage = code;
    setLanguageState(code);
    AsyncStorage.setItem('@solace_language', code).catch(() => {});
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key) => STRINGS[language]?.[key] ?? STRINGS.en[key] ?? key,
      tr: (text) => translatePhrase(text, language),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
