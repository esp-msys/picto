import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ─── Google Fonts (Web) ───────────────────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Poppins:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(link);
}

const IS_WEB = Platform.OS === 'web';
const FF_CINZEL    = IS_WEB ? 'Cinzel, Georgia, serif' : 'Georgia';
const FF_CORMORANT = IS_WEB ? '"Cormorant Garamond", Georgia, serif' : 'Georgia';
const FF_POPPINS   = IS_WEB ? 'Poppins, -apple-system, sans-serif' : undefined;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BG       = '#0E0C08';   // near-black warm
const CARD_BG  = '#080808';   // deep black card
const TEXT_PRI = '#EDE4D0';   // warm cream
const TEXT_MUT = 'rgba(237,228,208,0.42)';

// ─── Anthropic API ────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

async function generateWordsForTheme(theme) {
  const prompt =
    `Generate exactly 25 simple words or short phrases (2 words max) for a Pictionary-style drawing game with the theme: "${theme}". ` +
    `Each item should be something a person can reasonably draw. ` +
    `Return ONLY a valid JSON array of strings, no explanation, no markdown, no code block. Example: ["word1","word2"]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Anthropic error:', res.status, errText);
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.content[0].text.trim();
  const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(clean);
}

// ─── Word List ────────────────────────────────────────────────────────────────
const DEFAULT_WORDS = [
  'Cat', 'Dog', 'Fish', 'Bird', 'Elephant', 'Lion', 'Tiger', 'Bear',
  'Rabbit', 'Monkey', 'Penguin', 'Giraffe', 'Zebra', 'Shark', 'Dolphin',
  'Butterfly', 'Frog', 'Horse', 'Cow', 'Pig', 'Duck', 'Snake', 'Spider',
  'Crab', 'Octopus', 'Parrot', 'Deer', 'Fox', 'Wolf', 'Kangaroo',
  'Pizza', 'Cake', 'Apple', 'Banana', 'Sushi', 'Burger', 'Taco', 'Ice Cream',
  'Sandwich', 'Donut', 'Cookie', 'Watermelon', 'Strawberry', 'Popcorn',
  'Noodles', 'Egg', 'Carrot', 'Broccoli', 'Cheese', 'Bread', 'Hot Dog',
  'Pineapple', 'Grapes', 'Lemon', 'Mushroom', 'Cupcake', 'Pretzel',
  'Chair', 'Lamp', 'Book', 'Clock', 'Umbrella', 'Camera', 'Guitar',
  'Bicycle', 'Car', 'Boat', 'Airplane', 'Glasses', 'Key', 'Scissors',
  'Ladder', 'Hammer', 'Candle', 'Balloon', 'Kite', 'Suitcase', 'Backpack',
  'Hat', 'Shoe', 'Telescope', 'Compass', 'Drum', 'Piano', 'Trophy',
  'Beach', 'Mountain', 'Forest', 'Castle', 'Farm', 'Island', 'Volcano',
  'Cave', 'Waterfall', 'Desert', 'Jungle', 'Bridge', 'Lighthouse', 'Rainbow',
  'Running', 'Swimming', 'Dancing', 'Sleeping', 'Climbing', 'Fishing',
  'Cooking', 'Jumping', 'Flying', 'Reading', 'Singing', 'Surfing', 'Skating',
  'Star', 'Moon', 'Sun', 'Cloud', 'Lightning', 'Snowman', 'Fire', 'Tree',
  'Flower', 'Diamond', 'Crown', 'Rocket', 'Robot', 'Ghost', 'Wizard',
  'Treasure', 'Map', 'Tornado', 'Igloo', 'Snowflake', 'Cactus', 'Anchor',
];

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES = [
  { accent: '#C9A962' },   // gold
  { accent: '#A0C4D8' },   // silver blue
  { accent: '#C4A0D8' },   // violet
  { accent: '#90CCA8' },   // jade
  { accent: '#D4A878' },   // amber
  { accent: '#90CCCA' },   // teal
  { accent: '#D490A0' },   // rose
  { accent: '#CCC890' },   // chartreuse gold
  { accent: '#9090CC' },   // lavender
  { accent: '#C8B490' },   // champagne
];

// ─── Suggested Themes ─────────────────────────────────────────────────────────
const SUGGESTED_THEMES = [
  'Harry Potter', 'Disney', 'Marvel', 'Star Wars', 'Sports',
  'Food & Cooking', 'Animals', 'Video Games', 'Movies & TV',
  'Science & Space', 'Nature', 'Music', '90s Nostalgia',
  'Halloween', 'Christmas', 'Fairy Tales', 'Travel', 'Superheroes',
];

// ─── localStorage (web only) ───────────────────────────────────────────────────
const FAV_KEY = 'kataga_favorites';
const store = {
  get: () => {
    if (!IS_WEB || typeof localStorage === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  },
  set: (val) => {
    if (!IS_WEB || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(FAV_KEY, JSON.stringify(val)); } catch {}
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
let wordQueue = shuffle(DEFAULT_WORDS);
let activeWordPool = DEFAULT_WORDS;
function nextWord() {
  if (wordQueue.length === 0) wordQueue = shuffle(activeWordPool);
  return wordQueue.shift();
}
function nextTheme(current) {
  const pool = THEMES.filter(t => t.accent !== current.accent);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Ornament ─────────────────────────────────────────────────────────────────
function TarotOrnament({ color, size = 124 }) {
  const ORN  = size;
  const half = ORN / 2;

  // 7 concentric rings — innermost bright, outermost ghost
  const rings = [
    { r: 0.97, op: 0.08, w: 0.5 },
    { r: 0.84, op: 0.14, w: 0.5 },
    { r: 0.70, op: 0.22, w: 1   },
    { r: 0.56, op: 0.32, w: 1   },
    { r: 0.42, op: 0.44, w: 1   },
    { r: 0.28, op: 0.58, w: 1   },
    { r: 0.14, op: 0.75, w: 1   },
  ];

  // 4 major + 4 minor + 8 micro spokes
  const majSpokes = [0, 45, 90, 135];
  const minSpokes = [22.5, 67.5, 112.5, 157.5];

  // 4 rings of dots: 16 / 12 / 8 / 4
  const dotRings = [
    { r: half * 0.84, n: 16, s: 1.8, op: 0.24 },
    { r: half * 0.70, n: 12, s: 2.5, op: 0.32 },
    { r: half * 0.56, n: 8,  s: 3.5, op: 0.46 },
    { r: half * 0.42, n: 4,  s: 3,   op: 0.55 },
  ];

  // Small diamonds on mid ring (8 directions)
  const midDiamR = half * 0.56;
  const a8 = [0, 45, 90, 135, 180, 225, 270, 315];

  // Large pointed diamonds — cardinal N/S/E/W just outside outermost ring
  const bigDiamR = half * 0.94;
  const a4 = [0, 90, 180, 270];

  // Elongated spike tips — thin rectangles at N/S/E/W
  const spikeLen = half * 0.22;

  return (
    <View style={{ width: ORN, height: ORN, alignItems: 'center', justifyContent: 'center' }}>

      {/* Rings */}
      {rings.map(({ r, op, w }, i) => {
        const d = ORN * r;
        return (
          <View key={`r${i}`} style={{
            position: 'absolute', width: d, height: d, borderRadius: d / 2,
            borderWidth: w, borderColor: color, opacity: op,
          }} />
        );
      })}

      {/* Major spokes */}
      {majSpokes.map(deg => (
        <View key={`mj${deg}`} style={{
          position: 'absolute', width: ORN * 0.90, height: 1,
          backgroundColor: color, opacity: 0.18,
          transform: [{ rotate: `${deg}deg` }],
        }} />
      ))}

      {/* Minor spokes */}
      {minSpokes.map(deg => (
        <View key={`mn${deg}`} style={{
          position: 'absolute', width: ORN * 0.68, height: 0.5,
          backgroundColor: color, opacity: 0.09,
          transform: [{ rotate: `${deg}deg` }],
        }} />
      ))}

      {/* Dot rings */}
      {dotRings.flatMap(({ r, n, s, op }) =>
        Array.from({ length: n }, (_, i) => {
          const rad = (i / n) * Math.PI * 2;
          return (
            <View key={`d${r.toFixed(0)}-${i}`} style={{
              position: 'absolute',
              width: s, height: s, borderRadius: s / 2,
              backgroundColor: color, opacity: op,
              top:  half - s / 2 - Math.sin(rad) * r,
              left: half - s / 2 + Math.cos(rad) * r,
            }} />
          );
        })
      )}

      {/* Small diamonds on mid ring — 8 directions */}
      {a8.map(deg => {
        const rad = deg * Math.PI / 180;
        return (
          <View key={`sd${deg}`} style={{
            position: 'absolute', width: 5, height: 5,
            backgroundColor: color, opacity: 0.48,
            transform: [{ rotate: '45deg' }],
            top:  half - 2.5 - Math.sin(rad) * midDiamR,
            left: half - 2.5 + Math.cos(rad) * midDiamR,
          }} />
        );
      })}

      {/* Large cardinal diamonds — N/S/E/W */}
      {a4.map(deg => {
        const rad = deg * Math.PI / 180;
        return (
          <View key={`ld${deg}`} style={{
            position: 'absolute', width: 9, height: 9,
            backgroundColor: color, opacity: 0.68,
            transform: [{ rotate: '45deg' }],
            top:  half - 4.5 - Math.sin(rad) * bigDiamR,
            left: half - 4.5 + Math.cos(rad) * bigDiamR,
          }} />
        );
      })}

      {/* Spike tips beyond cardinal diamonds */}
      {a4.map(deg => {
        const rad = deg * Math.PI / 180;
        const cx  = half + Math.cos(rad) * (bigDiamR + 10);
        const cy  = half - Math.sin(rad) * (bigDiamR + 10);
        const isVertical = deg === 90 || deg === 270;
        return (
          <View key={`sp${deg}`} style={{
            position: 'absolute',
            width:  isVertical ? 1.5 : spikeLen,
            height: isVertical ? spikeLen : 1.5,
            backgroundColor: color, opacity: 0.40,
            top:  cy - (isVertical ? spikeLen / 2 : 0.75),
            left: cx - (isVertical ? 0.75 : spikeLen / 2),
          }} />
        );
      })}

      {/* Center double-star */}
      <Text style={{ position: 'absolute', color, fontSize: 18, opacity: 0.35, fontFamily: FF_POPPINS }}>✦</Text>
      <Text style={{ color, fontSize: 26, opacity: 0.96, fontFamily: FF_POPPINS }}>✦</Text>
    </View>
  );
}

// ─── Mystic Sound ─────────────────────────────────────────────────────────────
function playMysticSound() {
  if (!IS_WEB || typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    master.connect(ctx.destination);

    // Shimmer chord — A minor with slight pitch-bend settle
    [[440, 0], [523.25, 0.06], [659.25, 0.12], [880, 0.19]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.018, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.982, now + delay + 0.45);
      g.gain.setValueAtTime(0,    now + delay);
      g.gain.linearRampToValueAtTime(0.28, now + delay + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.4);
      osc.connect(g); g.connect(master);
      osc.start(now + delay); osc.stop(now + 2);
    });

    // Soft card-swish noise burst
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type  = 'bandpass';
    filt.frequency.setValueAtTime(2200, now);
    filt.frequency.exponentialRampToValueAtTime(600, now + 0.22);
    filt.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.14, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    src.connect(filt); filt.connect(ng); ng.connect(master);
    src.start(now);

    setTimeout(() => ctx.close().catch(() => {}), 2500);
  } catch (_) { /* silently ignore */ }
}

// ─── Magic Particles ──────────────────────────────────────────────────────────
const SPARK_N = 14;
const SPARK_CHARS = ['✦', '✧', '◆', '·', '✦', '✧', '✦', '◆', '·', '✦', '✧', '◆', '✦', '·'];

// Fixed burst directions — evenly spread with small jitter baked in
const SPARK_PROPS = Array.from({ length: SPARK_N }, (_, i) => ({
  angle: (i / SPARK_N) * Math.PI * 2 + (i % 2 === 0 ? 0.18 : -0.18),
  dist:  70 + (i % 4) * 28,           // 70 / 98 / 126 / 154 px
  size:  9  + (i % 3) * 5,            // 9 / 14 / 19 px
  char:  SPARK_CHARS[i],
  delay: Math.floor(i / 4) * 35,      // stagger by groups of 4
}));

// ─── Layout ───────────────────────────────────────────────────────────────────
const { width, height } = Dimensions.get('window');
const CARD_W = Math.min(width - 56, 300);
const CARD_H = Math.min(Math.round(CARD_W * 1.88), height - 180);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [word, setWord]                     = useState(() => nextWord());
  const [theme, setTheme]                   = useState(THEMES[0]);
  const [count, setCount]                   = useState(1);
  const [isLocked, setIsLocked]             = useState(false);
  const [favorites, setFavorites]           = useState(() => store.get());
  const [modalVisible, setModalVisible]     = useState(false);
  const [inputText, setInputText]           = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  // Card flip animation
  const flipRot = useRef(new Animated.Value(0)).current;
  const cardY  = useRef(new Animated.Value(0)).current;
  const cardOp = useRef(new Animated.Value(1)).current;
  const busy   = useRef(false);

  // 3D tilt (hover)
  const tiltX  = useRef(new Animated.Value(0)).current;
  const tiltY  = useRef(new Animated.Value(0)).current;
  const [shineStyle, setShineStyle] = useState({ left: '50%', top: '50%', opacity: 0 });

  // Ambient orb drift
  const orbX = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const orbY = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  // Card float + glow
  const floatY  = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = (val, a, b, dA, dB) =>
      Animated.loop(Animated.sequence([
        Animated.timing(val, { toValue: a,  duration: dA, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(val, { toValue: b,  duration: dB, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(val, { toValue: 0,  duration: (dA + dB) / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));

    drift(orbX[0],  70, -30,  9000, 12000).start();
    drift(orbY[0], -50,  65, 13000,  9000).start();
    drift(orbX[1], -80,  40, 14000, 10000).start();
    drift(orbY[1],  55, -40, 10000, 14000).start();
    drift(orbX[2],  45, -65,  8000, 11000).start();
    drift(orbY[2], -60,  35, 12000,  8000).start();

    // Gentle float
    Animated.loop(Animated.sequence([
      Animated.timing(floatY, { toValue: -7, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(floatY, { toValue:  7, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    // Glow pulse
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  // Gyroscope tilt (mobile)
  useEffect(() => {
    if (!IS_WEB) return;
    let baseB = null, baseG = null;

    const handleOrientation = (e) => {
      const beta  = e.beta  ?? 0;   // front-back tilt, -180..180
      const gamma = e.gamma ?? 0;   // left-right tilt,  -90..90

      if (baseB === null) { baseB = beta;  baseG = gamma; return; }

      const db = Math.max(-30, Math.min(30, beta  - baseB));
      const dg = Math.max(-30, Math.min(30, gamma - baseG));

      // Map ±30° device tilt → ±1 tilt value (same range as mouse hover)
      Animated.spring(tiltX, { toValue:  db / 30, useNativeDriver: false, speed: 30, bounciness: 0 }).start();
      Animated.spring(tiltY, { toValue: dg / 30, useNativeDriver: false, speed: 30, bounciness: 0 }).start();

      // Shine follows tilt direction
      const nx = (dg / 30) * 0.5 + 0.5;
      const ny = (db / 30) * 0.5 + 0.5;
      setShineStyle({ left: `${nx * 100}%`, top: `${ny * 100}%`, opacity: 0.18 });
    };

    const requestAndListen = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm !== 'granted') return;
        } catch { return; }
      }
      window.addEventListener('deviceorientation', handleOrientation);
    };

    requestAndListen();
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [tiltX, tiltY]);

  // Magic effects
  const sparkAnims = useRef(Array.from({ length: SPARK_N }, () => new Animated.Value(0))).current;
  const ringAnim   = useRef(new Animated.Value(0)).current;
  const ring2Anim  = useRef(new Animated.Value(0)).current;

  const triggerMagic = useCallback((accentColor) => {
    // Ring 1 — fast inner burst
    ringAnim.setValue(0);
    Animated.timing(ringAnim, {
      toValue: 1, duration: 550,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Ring 2 — slower outer glow
    ring2Anim.setValue(0);
    Animated.timing(ring2Anim, {
      toValue: 1, duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Sparkles
    sparkAnims.forEach((anim, i) => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 550 + SPARK_PROPS[i].delay,
        delay: SPARK_PROPS[i].delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [sparkAnims, ringAnim, ring2Anim]);

  const animateCard = useCallback((onMidpoint) => {
    if (busy.current) return;
    busy.current = true;

    Animated.parallel([
      Animated.timing(flipRot, { toValue: 1, duration: 185, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardY,   { toValue: -20, duration: 165, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardOp,  { toValue: 0, duration: 155, useNativeDriver: true }),
    ]).start(() => {
      onMidpoint();
      flipRot.setValue(0);
      Animated.parallel([
        Animated.spring(cardY,  { toValue: 0, speed: 20, bounciness: 5, useNativeDriver: true }),
        Animated.timing(cardOp, { toValue: 1, duration: 230, useNativeDriver: true }),
      ]).start(() => { busy.current = false; });
    });
  }, [flipRot, cardY, cardOp]);

  const handleTap = useCallback(() => {
    if (isLocked) return;
    playMysticSound();
    triggerMagic(theme.accent);
    animateCard(() => {
      setWord(nextWord());
      setTheme(t => nextTheme(t));
      setCount(c => c + 1);
    });
  }, [animateCard, triggerMagic, theme, isLocked]);

  const handleCardMouseMove = useCallback((e) => {
    if (!IS_WEB) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;   // 0–1
    const ny = (e.clientY - rect.top)  / rect.height;  // 0–1
    const x = nx - 0.5;  // -0.5 to 0.5
    const y = ny - 0.5;
    Animated.spring(tiltY, { toValue: x * 2, useNativeDriver: false, speed: 30, bounciness: 0 }).start();
    Animated.spring(tiltX, { toValue: y * 2, useNativeDriver: false, speed: 30, bounciness: 0 }).start();
    setShineStyle({ left: `${nx * 100}%`, top: `${ny * 100}%`, opacity: 0.18 });
  }, [tiltX, tiltY]);

  const handleCardMouseLeave = useCallback(() => {
    Animated.spring(tiltX, { toValue: 0, useNativeDriver: false, speed: 8, bounciness: 3 }).start();
    Animated.spring(tiltY, { toValue: 0, useNativeDriver: false, speed: 8, bounciness: 3 }).start();
    setShineStyle(s => ({ ...s, opacity: 0 }));
  }, [tiltX, tiltY]);

  const handleSetTheme = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const words = await generateWordsForTheme(trimmed);
      if (!Array.isArray(words) || words.length === 0) throw new Error('empty');
      activeWordPool = words;
      wordQueue = shuffle(words);
      setActiveCategory(trimmed);
      setModalVisible(false);
      setInputText('');
      animateCard(() => { setWord(nextWord()); setTheme(t => nextTheme(t)); setCount(1); });
    } catch {
      setError('Could not generate words. Check your API key or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearTheme = () => {
    activeWordPool = DEFAULT_WORDS;
    wordQueue = shuffle(DEFAULT_WORDS);
    setActiveCategory(null);
    setModalVisible(false);
    setInputText('');
    setError(null);
    animateCard(() => { setWord(nextWord()); setTheme(t => nextTheme(t)); setCount(1); });
  };

  const saveFavorite = () => {
    if (!activeCategory) return;
    const updated = [...favorites, { name: activeCategory, words: activeWordPool }];
    setFavorites(updated);
    store.set(updated);
  };

  const removeFavorite = (name) => {
    const updated = favorites.filter(f => f.name !== name);
    setFavorites(updated);
    store.set(updated);
  };

  const loadFavorite = (fav) => {
    activeWordPool = fav.words;
    wordQueue = shuffle(fav.words);
    setActiveCategory(fav.name);
    setModalVisible(false);
    setInputText('');
    setError(null);
    animateCard(() => { setWord(nextWord()); setTheme(t => nextTheme(t)); setCount(1); });
  };

  const isFavorited = favorites.some(f => f.name === activeCategory);

  const { accent } = theme;

  // Glow interpolation
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.38] });

  // 3D tilt interpolations (JS driver — separate from native-driver card)
  const tiltRotX = tiltX.interpolate({ inputRange: [-1, 1], outputRange: ['12deg', '-12deg'] });
  const tiltRotY = tiltY.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });

  // Flip — rotateY sweeps to 90deg then card content swaps
  const flipRotY = flipRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  // Ring interpolations
  const ring1Scale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1.6] });
  const ring1Op    = ringAnim.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 0.65, 0.3, 0] });
  const ring2Scale = ring2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 2.2] });
  const ring2Op    = ring2Anim.interpolate({ inputRange: [0, 0.12, 0.55, 1], outputRange: [0, 0.4, 0.15, 0] });

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      {/* ── Ambient glow orbs ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[
          { color: '#C9A455', style: styles.orb0 },
          { color: '#6E8FB5', style: styles.orb1 },
          { color: '#8E72B0', style: styles.orb2 },
        ].map(({ color, style }, i) => (
          <Animated.View
            key={i}
            style={[
              style,
              { backgroundColor: color, transform: [{ translateX: orbX[i] }, { translateY: orbY[i] }] },
              IS_WEB && { filter: `blur(${[120, 100, 90][i]}px)` },
            ]}
          />
        ))}
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.appName}>Kataga!</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.pill, { borderColor: `${accent}50` }]}
            onPress={() => { setError(null); setModalVisible(true); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: accent }]}>
              {activeCategory ? `✦  ${activeCategory}` : '✦  Theme'}
            </Text>
          </TouchableOpacity>
          {activeCategory ? (
            <TouchableOpacity
              style={[styles.pill, { borderColor: `${accent}50` }]}
              onPress={isFavorited ? () => removeFavorite(activeCategory) : saveFavorite}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: isFavorited ? accent : TEXT_MUT }]}>
                {isFavorited ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={[styles.pill, { borderColor: `${accent}50` }]}>
            <Text style={[styles.pillText, { color: accent }]}>#{count}</Text>
          </View>
        </View>
      </View>

      {/* ── Card area ── */}
      <View style={styles.cardArea}>

        {/* Magic particle layer — centered in card area, overflows freely */}
        <View style={styles.magicLayer} pointerEvents="none">

          {/* Ring 1 */}
          <Animated.View style={[
            styles.magicRing,
            { borderColor: accent, transform: [{ scale: ring1Scale }], opacity: ring1Op },
          ]} />

          {/* Ring 2 */}
          <Animated.View style={[
            styles.magicRing,
            { borderColor: accent, transform: [{ scale: ring2Scale }], opacity: ring2Op },
          ]} />

          {/* Sparkles */}
          {SPARK_PROPS.map((sp, i) => {
            const tx = sparkAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(sp.angle) * sp.dist] });
            const ty = sparkAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(sp.angle) * sp.dist] });
            const op = sparkAnims[i].interpolate({ inputRange: [0, 0.12, 0.55, 1], outputRange: [0, 1, 0.7, 0] });
            const sc = sparkAnims[i].interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.1, 1.5, 0.3] });
            return (
              <Animated.Text key={i} style={[
                styles.sparkle,
                { color: accent, fontSize: sp.size, opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] },
              ]}>
                {sp.char}
              </Animated.Text>
            );
          })}
        </View>

        {/* Card glow — floats behind the card */}
        <Animated.View
          style={[styles.cardGlow, {
            backgroundColor: accent,
            opacity: glowOpacity,
            transform: [{ translateY: floatY }],
            ...(IS_WEB && { filter: 'blur(38px)' }),
          }]}
          pointerEvents="none"
        />

        {/* Card — 3D tilt wrapper */}
        <Animated.View
          style={[
            styles.cardTiltWrapper,
            IS_WEB && {
              transform: [
                { perspective: 900 },
                { rotateX: tiltRotX },
                { rotateY: tiltRotY },
              ],
            },
          ]}
          {...(IS_WEB && {
            onMouseMove: handleCardMouseMove,
            onMouseLeave: handleCardMouseLeave,
          })}
        >
        <TouchableWithoutFeedback onPress={handleTap}>
          <Animated.View
            style={[
              styles.card,
              {
                width: CARD_W,
                height: CARD_H,
                borderColor: accent,
                shadowColor: accent,
                transform: [{ rotateY: flipRotY }, { translateY: Animated.add(cardY, floatY) }],
                opacity: cardOp,
              },
            ]}
          >
            {/* Ornament — pixel-centered in card */}
            <View style={styles.ornamentBg} pointerEvents="none">
              <TarotOrnament color={accent} size={CARD_W - 48} />
            </View>

            {/* Side ornaments */}
            {[styles.sideOrnL, styles.sideOrnR].map((pos, si) => (
              <View key={`so${si}`} style={[styles.sideOrn, pos]} pointerEvents="none">
                {['✦','◆','·','◆','✦','◆','·','◆','✦','◆','·','◆','✦'].map((ch, i) => (
                  <Text key={i} style={[styles.sideChar, {
                    color: ch === '✦' ? `${accent}70` : ch === '◆' ? `${accent}48` : `${accent}28`,
                  }]}>{ch}</Text>
                ))}
              </View>
            ))}

            <View style={[styles.innerFrame, { borderColor: `${accent}35` }]}>

              {/* Inner accent border */}
              <View style={[styles.innerBorder, { borderColor: `${accent}14` }]} pointerEvents="none" />

              {/* Top */}
              <View style={styles.cardHead}>
                <View style={[styles.headLine, { backgroundColor: `${accent}40` }]} />
                <Text style={[styles.headGlyph, { color: `${accent}65` }]}>◆</Text>
                <Text style={[styles.suitLabel, { color: accent }]}>KATAGA</Text>
                <Text style={[styles.headGlyph, { color: `${accent}65` }]}>◆</Text>
                <View style={[styles.headLine, { backgroundColor: `${accent}40` }]} />
              </View>

              {/* Word — full space */}
              <View style={styles.wordWrap}>
                <Text style={styles.wordText} adjustsFontSizeToFit numberOfLines={3}>
                  {word}
                </Text>
              </View>

              {/* Bottom */}
              <View style={styles.cardFoot}>
                <View style={styles.footDivider}>
                  <View style={[styles.footLine, { backgroundColor: `${accent}30` }]} />
                  <Text style={[styles.footGlyph, { color: `${accent}55` }]}>✦</Text>
                  <View style={[styles.footLine, { backgroundColor: `${accent}30` }]} />
                </View>
                <Text style={[styles.drawLabel, { color: `${accent}75` }]}>draw  this</Text>
                <View style={styles.footDivider}>
                  <View style={[styles.footLine, { backgroundColor: `${accent}20` }]} />
                  <Text style={[styles.footGlyph, { color: `${accent}40` }]}>◆</Text>
                  <View style={[styles.footLine, { backgroundColor: `${accent}20` }]} />
                </View>
              </View>

            </View>

            {/* Corner brackets */}
            {[styles.bTL, styles.bTR, styles.bBL, styles.bBR].map((pos, i) => (
              <View key={i} style={[styles.bracket, pos, { borderColor: `${accent}55` }]} />
            ))}

            {/* Corner diamonds */}
            {[styles.cdTL, styles.cdTR, styles.cdBL, styles.cdBR].map((pos, i) => (
              <View key={`cd${i}`} style={[styles.cornerDiamond, pos, { backgroundColor: accent }]} />
            ))}

            {/* Glossy sheen — static top-highlight like lacquered card */}
            {IS_WEB && (
              <View
                style={[styles.cardGloss, { borderTopLeftRadius: 27, borderTopRightRadius: 27 }]}
                pointerEvents="none"
              />
            )}

            {/* Locked overlay */}
            {isLocked && (
              <View style={[styles.lockedOverlay, { borderColor: `${accent}35` }]} pointerEvents="none" />
            )}

            {/* 3D shine highlight — follows mouse */}
            {IS_WEB && (
              <View
                style={[styles.cardShine, shineStyle, { filter: 'blur(32px)' }]}
                pointerEvents="none"
              />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
        </Animated.View>

        {/* Lock toggle */}
        <TouchableOpacity
          style={[styles.lockBtn, { borderColor: isLocked ? `${accent}70` : `${accent}28` }]}
          onPress={() => setIsLocked(l => !l)}
          activeOpacity={0.7}
        >
          <Text style={[styles.lockText, { color: isLocked ? accent : TEXT_MUT }]}>
            {isLocked ? '◉  LOCKED' : '◌  LOCK'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerPri}>{isLocked ? 'card locked — tap lock to flip' : 'tap for next word'}</Text>
        <Text style={styles.footerSec}>hide the screen from the guesser!</Text>
      </View>

      {/* ── Theme Modal ── */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={() => !loading && setModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Set a Theme</Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Favorites */}
              {favorites.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>FAVORITES</Text>
                  <View style={styles.chipRow}>
                    {favorites.map(fav => (
                      <View key={fav.name} style={[styles.chip, styles.favChip, { borderColor: `${accent}50` }]}>
                        <TouchableOpacity onPress={() => loadFavorite(fav)}>
                          <Text style={[styles.chipText, { color: accent }]}>★  {fav.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeFavorite(fav.name)} style={styles.chipRemoveBtn}>
                          <Text style={[styles.chipRemoveText, { color: `${accent}70` }]}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Suggested */}
              <Text style={styles.sectionLabel}>SUGGESTED</Text>
              <View style={styles.chipRow}>
                {SUGGESTED_THEMES.map(name => {
                  const saved = favorites.find(f => f.name === name);
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.chip, saved && { borderColor: `${accent}40` }]}
                      onPress={() => saved ? loadFavorite(saved) : setInputText(name)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, saved && { color: accent }]}>
                        {saved ? '★  ' : ''}{name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              placeholder="or type any theme…"
              placeholderTextColor="#4A4540"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSetTheme}
              returnKeyType="go"
              editable={!loading}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: accent }, loading && { opacity: 0.5 }]}
              onPress={handleSetTheme}
              disabled={loading || !inputText.trim()}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={CARD_BG} />
                : <Text style={styles.modalBtnText}>Generate Words  ✦</Text>
              }
            </TouchableOpacity>

            {activeCategory ? (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearTheme} disabled={loading}>
                <Text style={styles.clearBtnText}>Clear theme (use defaults)</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const RING_D = CARD_W * 0.9;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 48 : 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    ...(Platform.OS === 'web' && { minHeight: '100vh' }),
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', width: '100%', maxWidth: 420,
  },
  appName: {
    fontSize: 28, fontFamily: FF_CINZEL, fontWeight: '700',
    color: TEXT_PRI, letterSpacing: IS_WEB ? 4 : 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillText: {
    fontSize: 11, fontFamily: FF_POPPINS, fontWeight: '500',
    letterSpacing: IS_WEB ? 0.8 : 0,
  },

  // ── Ambient orbs ────────────────────────────────────────────────────────────
  orb0: {
    position: 'absolute', borderRadius: 999,
    width: 400, height: 400, top: -120, left: -140,
    opacity: IS_WEB ? 0.52 : 0.07,
  },
  orb1: {
    position: 'absolute', borderRadius: 999,
    width: 320, height: 320, bottom: -80, right: -100,
    opacity: IS_WEB ? 0.46 : 0.06,
  },
  orb2: {
    position: 'absolute', borderRadius: 999,
    width: 270, height: 270, top: height * 0.42, left: -80,
    opacity: IS_WEB ? 0.38 : 0.05,
  },

  // ── Card area & magic ────────────────────────────────────────────────────────
  cardArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  magicLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: CARD_W + 320,
    height: CARD_H + 320,
    // centered over card: shift by half the extra size
    top: -160,
    left: -160,
    ...(IS_WEB && { overflow: 'visible' }),
  },
  magicRing: {
    position: 'absolute',
    width: RING_D,
    height: RING_D,
    borderRadius: RING_D / 2,
    borderWidth: 1.5,
  },
  sparkle: {
    position: 'absolute',
    fontFamily: FF_POPPINS,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  cardGlow: {
    position: 'absolute',
    width: CARD_W + 48,
    height: CARD_H + 48,
    borderRadius: 40,
  },
  cardTiltWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 40%, transparent 100%)',
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
  },
  cardShine: {
    position: 'absolute',
    width: CARD_W * 0.7,
    height: CARD_W * 0.7,
    borderRadius: CARD_W * 0.35,
    marginLeft: -(CARD_W * 0.35),
    marginTop: -(CARD_W * 0.35),
    backgroundColor: '#ffffff',
  },
  card: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.65,
    shadowRadius: 50,
    elevation: 28,
  },
  innerFrame: {
    flex: 1, width: '100%',
    borderWidth: 1, borderRadius: 6,
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 10,
  },
  innerBorder: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 0.5, borderRadius: 4,
  },

  cardHead: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  headLine: { flex: 1, height: 1 },
  headGlyph: { fontSize: 7, fontFamily: FF_POPPINS },
  suitLabel: {
    fontSize: 9, fontFamily: FF_CINZEL, fontWeight: '600',
    letterSpacing: IS_WEB ? 6 : 2,
  },

  ornamentBg: {
    position: 'absolute',
    width: CARD_W - 48,
    height: CARD_W - 48,
    top: (CARD_H - (CARD_W - 48)) / 2,
    left: 24,
    opacity: 0.13,
  },

  // Side ornaments
  sideOrn: {
    position: 'absolute', top: 0, bottom: 0, width: 12,
    alignItems: 'center', justifyContent: 'space-evenly',
  },
  sideOrnL: { left: 3 },
  sideOrnR: { right: 3 },
  sideChar: { fontSize: 6, fontFamily: FF_POPPINS, lineHeight: 8 },

  wordWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  wordText: {
    fontSize: 58,
    fontFamily: FF_CORMORANT,
    fontWeight: IS_WEB ? '600' : 'bold',
    color: TEXT_PRI,
    textAlign: 'center',
    lineHeight: 64,
    letterSpacing: IS_WEB ? -0.5 : 0,
  },

  cardFoot: { alignItems: 'center', width: '100%', gap: 5 },
  footDivider: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  footLine: { flex: 1, height: 1 },
  drawLabel: {
    fontSize: 8, fontFamily: FF_CINZEL,
    letterSpacing: IS_WEB ? 6 : 2, textTransform: 'uppercase',
  },
  footGlyph: { fontSize: 9, fontFamily: FF_POPPINS },

  // Corners — larger brackets + diamond tips
  bracket: { position: 'absolute', width: 24, height: 24 },
  bTL: { top: 22, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  bTR: { top: 22, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  bBL: { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  bBR: { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  cornerDiamond: {
    position: 'absolute', width: 6, height: 6, opacity: 0.60,
    transform: [{ rotate: '45deg' }],
  },
  cdTL: { top: 19, left: 7 },
  cdTR: { top: 19, right: 7 },
  cdBL: { bottom: 7, left: 7 },
  cdBR: { bottom: 7, right: 7 },

  // ── Lock ────────────────────────────────────────────────────────────────────
  lockBtn: {
    marginTop: 16,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 6, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  lockText: {
    fontSize: 9, fontFamily: FF_CINZEL, fontWeight: '600',
    letterSpacing: IS_WEB ? 4 : 1,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: { alignItems: 'center', gap: 6 },
  footerPri: {
    fontSize: 13, fontFamily: FF_POPPINS, fontWeight: '400',
    color: TEXT_MUT, letterSpacing: IS_WEB ? 0.5 : 0,
  },
  footerSec: {
    fontSize: 11, fontFamily: FF_POPPINS,
    color: 'rgba(237,228,208,0.22)', textAlign: 'center',
  },

  // ── Modal ───────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.82)' },
  modalBox: {
    backgroundColor: '#1E1C16',
    borderRadius: 20, padding: 28,
    width: Math.min(width - 48, 400),
    alignItems: 'stretch',
    borderWidth: 1, borderColor: 'rgba(201,169,98,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55, shadowRadius: 30, elevation: 20,
  },
  modalScroll: { maxHeight: 260, marginBottom: 16 },
  sectionLabel: {
    fontSize: 8, fontFamily: FF_CINZEL, fontWeight: '600',
    color: TEXT_MUT, letterSpacing: IS_WEB ? 4 : 1,
    marginTop: 14, marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  favChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: {
    fontSize: 11, fontFamily: FF_POPPINS, fontWeight: '500', color: TEXT_MUT,
  },
  chipRemoveBtn: { paddingLeft: 2 },
  chipRemoveText: { fontSize: 14, lineHeight: 16 },

  modalTitle: {
    fontSize: 22, fontFamily: FF_CINZEL, fontWeight: '700',
    color: TEXT_PRI, marginBottom: 6, letterSpacing: IS_WEB ? 1 : 0,
  },
  modalSubtitle: {
    fontSize: 13, fontFamily: FF_POPPINS,
    color: TEXT_MUT, marginBottom: 20, lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1, borderColor: 'rgba(201,169,98,0.28)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: FF_POPPINS, color: TEXT_PRI,
    marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  errorText: { fontSize: 12, fontFamily: FF_POPPINS, color: '#D47D7D', marginBottom: 10 },
  modalBtn: {
    borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginBottom: 8,
  },
  modalBtnText: {
    fontSize: 14, fontFamily: FF_POPPINS, fontWeight: '700',
    color: BG, letterSpacing: IS_WEB ? 1.2 : 0,
  },
  clearBtn: { alignItems: 'center', paddingVertical: 10 },
  clearBtnText: { fontSize: 12, fontFamily: FF_POPPINS, color: TEXT_MUT },
});
