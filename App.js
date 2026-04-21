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
const CARD_BG  = '#272320';   // dark grey card — clearly lighter than BG
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
  const ORN = size;
  const half = ORN / 2;
  const rings = [
    { r: 0.96, op: 0.18 },
    { r: 0.72, op: 0.32 },
    { r: 0.48, op: 0.48 },
    { r: 0.26, op: 0.68 },
  ];
  const midR   = half * 0.48;
  const outerR = half * 0.84;
  const a4  = [0, 90, 180, 270];
  const a8  = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <View style={{ width: ORN, height: ORN, alignItems: 'center', justifyContent: 'center' }}>
      {rings.map(({ r, op }, i) => {
        const d = ORN * r;
        return (
          <View key={i} style={{
            position: 'absolute', width: d, height: d, borderRadius: d / 2,
            borderWidth: 1, borderColor: color, opacity: op,
          }} />
        );
      })}

      {/* Cross + diagonal spokes */}
      <View style={{ position: 'absolute', width: ORN * 0.86, height: 1, backgroundColor: color, opacity: 0.17 }} />
      <View style={{ position: 'absolute', width: 1, height: ORN * 0.86, backgroundColor: color, opacity: 0.17 }} />
      {[45, -45].map(deg => (
        <View key={deg} style={{
          position: 'absolute', width: ORN * 0.86, height: 1,
          backgroundColor: color, opacity: 0.11,
          transform: [{ rotate: `${deg}deg` }],
        }} />
      ))}

      {/* Cardinal dots on middle ring */}
      {a4.map(deg => {
        const rad = deg * Math.PI / 180;
        return (
          <View key={`m${deg}`} style={{
            position: 'absolute', width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: color, opacity: 0.78,
            top: half - 2.5 - Math.sin(rad) * midR,
            left: half - 2.5 + Math.cos(rad) * midR,
          }} />
        );
      })}

      {/* Small ticks on outer ring */}
      {a8.map(deg => {
        const rad = deg * Math.PI / 180;
        return (
          <View key={`o${deg}`} style={{
            position: 'absolute', width: 3, height: 3, borderRadius: 1.5,
            backgroundColor: color, opacity: 0.42,
            top: half - 1.5 - Math.sin(rad) * outerR,
            left: half - 1.5 + Math.cos(rad) * outerR,
          }} />
        );
      })}

      {/* Diamond tips N/S/E/W */}
      {[[0, -1, 0], [0, 1, 0], [-1, 0, 90], [1, 0, 90]].map(([dx, dy, rot], i) => (
        <View key={`d${i}`} style={{
          position: 'absolute', width: 6, height: 6,
          backgroundColor: color, opacity: 0.55,
          transform: [{ rotate: '45deg' }],
          top: half - 3 + dy * half * 0.86,
          left: half - 3 + dx * half * 0.86,
        }} />
      ))}

      {/* Center ✦ */}
      <Text style={{ color, fontSize: 20, opacity: 0.92, fontFamily: FF_POPPINS }}>✦</Text>
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
const CARD_W = Math.min(width - 56, 310);
const CARD_H = Math.min(Math.round(CARD_W * 1.62), height - 230);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [word, setWord]                     = useState(() => nextWord());
  const [theme, setTheme]                   = useState(THEMES[0]);
  const [count, setCount]                   = useState(1);
  const [isLocked, setIsLocked]             = useState(false);
  const [modalVisible, setModalVisible]     = useState(false);
  const [inputText, setInputText]           = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  // Card flip animation
  const flipX  = useRef(new Animated.Value(1)).current;
  const cardY  = useRef(new Animated.Value(0)).current;
  const cardOp = useRef(new Animated.Value(1)).current;
  const busy   = useRef(false);

  // Ambient orb drift
  const orbX = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const orbY = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

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
  }, []);

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
      Animated.timing(flipX,  { toValue: 0, duration: 185, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardY,  { toValue: -20, duration: 165, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 0, duration: 155, useNativeDriver: true }),
    ]).start(() => {
      onMidpoint();
      Animated.parallel([
        Animated.spring(flipX,  { toValue: 1, speed: 14, bounciness: 9, useNativeDriver: true }),
        Animated.spring(cardY,  { toValue: 0, speed: 20, bounciness: 5, useNativeDriver: true }),
        Animated.timing(cardOp, { toValue: 1, duration: 230, useNativeDriver: true }),
      ]).start(() => { busy.current = false; });
    });
  }, [flipX, cardY, cardOp]);

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

  const { accent } = theme;

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
        <Text style={styles.appName}>Picto!</Text>
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

        {/* Card */}
        <TouchableWithoutFeedback onPress={handleTap}>
          <Animated.View
            style={[
              styles.card,
              {
                width: CARD_W,
                height: CARD_H,
                borderColor: accent,
                shadowColor: accent,
                transform: [{ scaleX: flipX }, { translateY: cardY }],
                opacity: cardOp,
              },
            ]}
          >
            {/* Ornament — pixel-centered in card */}
            <View style={styles.ornamentBg} pointerEvents="none">
              <TarotOrnament color={accent} size={CARD_W - 48} />
            </View>

            <View style={[styles.innerFrame, { borderColor: `${accent}30` }]}>

              {/* Top */}
              <View style={styles.cardHead}>
                <View style={[styles.headLine, { backgroundColor: `${accent}40` }]} />
                <Text style={[styles.suitLabel, { color: accent }]}>PICTO</Text>
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
                <View style={[styles.footLine, { backgroundColor: `${accent}35` }]} />
                <Text style={[styles.drawLabel, { color: `${accent}75` }]}>draw  this</Text>
                <Text style={[styles.footGlyph, { color: `${accent}55` }]}>◆</Text>
              </View>

            </View>

            {/* Corner brackets */}
            {[styles.bTL, styles.bTR, styles.bBL, styles.bBR].map((pos, i) => (
              <View key={i} style={[styles.bracket, pos, { borderColor: `${accent}45` }]} />
            ))}

            {/* Locked overlay */}
            {isLocked && (
              <View style={[styles.lockedOverlay, { borderColor: `${accent}35` }]} pointerEvents="none" />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>

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
            <Text style={styles.modalSubtitle}>Type any theme and AI will generate words for it</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Harry Potter, Space, 90s cartoons…"
              placeholderTextColor="#4A4540"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSetTheme}
              returnKeyType="go"
              autoFocus
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
  card: {
    backgroundColor: CARD_BG,
    // Subtle arch top, nearly rectangular — like a real playing card
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 18,
  },
  innerFrame: {
    flex: 1, width: '100%',
    borderWidth: 1, borderRadius: 6,
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 10,
  },

  cardHead: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 10 },
  headLine: { flex: 1, height: 1 },
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
    opacity: 0.12,
  },

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

  cardFoot: { alignItems: 'center', width: '100%', gap: 6 },
  footLine: { width: '70%', height: 1 },
  drawLabel: {
    fontSize: 8, fontFamily: FF_CINZEL,
    letterSpacing: IS_WEB ? 6 : 2, textTransform: 'uppercase',
  },
  footGlyph: { fontSize: 10, fontFamily: FF_POPPINS },

  bracket: { position: 'absolute', width: 13, height: 13 },
  bTL: { top: 27, left: 14, borderTopWidth: 1, borderLeftWidth: 1 },
  bTR: { top: 27, right: 14, borderTopWidth: 1, borderRightWidth: 1 },
  bBL: { bottom: 13, left: 14, borderBottomWidth: 1, borderLeftWidth: 1 },
  bBR: { bottom: 13, right: 14, borderBottomWidth: 1, borderRightWidth: 1 },

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
