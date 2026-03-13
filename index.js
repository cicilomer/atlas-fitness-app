import { useState, useEffect, useRef } from "react";

// ── 1. Beslenme ve Makro Algoritması ──────────────────────────────────────────
function hesaplaBeslenme(profil) {
  const { kilo, boy, yas, cinsiyet, aktivite } = profil;
  const bmr =
    cinsiyet === "erkek"
      ? 10 * kilo + 6.25 * boy - 5 * yas + 5
      : 10 * kilo + 6.25 * boy - 5 * yas - 161;
  const katsayi = { sedanter: 1.2, hafif: 1.375, orta: 1.55, aktif: 1.725 };
  const tdee = bmr * (katsayi[aktivite] || 1.55);
  const hedefKalori = tdee + 300; 
  return {
    kalori: Math.round(hedefKalori),
    protein: Math.round(kilo * 2.0),
    karb: Math.round((hedefKalori - (kilo * 2 * 4) - (kilo * 0.9 * 9)) / 4),
    yag: Math.round(kilo * 0.9),
  };
}

// ── 2. Sabit Veriler ────────────────────────────────────────────────────────
const BESINLER = [
  { isim: "Yumurta (1 adet)", kalori: 78, protein: 6, karb: 1, yag: 5, emoji: "🥚" },
  { isim: "Tavuk Göğsü (100g)", kalori: 165, protein: 31, karb: 0, yag: 3.6, emoji: "🍗" },
  { isim: "Yulaf (100g)", kalori: 389, protein: 17, karb: 66, yag: 7, emoji: "🥣" },
  { isim: "Muz (1 adet)", kalori: 105, protein: 1, karb: 27, yag: 0.3, emoji: "🍌" },
];

const ANTRENMAN_GUNLERI = [1, 3, 5]; // Salı, Perşembe, Cumartesi

// ── 3. Ana Uygulama ──────────────────────────────────────────────────────────
export default function AtlasApp() {
  const [ekran, setEkran] = useState("onboarding");
  const [profil, setProfil] = useState({ isim: "", yas: 22, boy: 182, kilo: 65, cinsiyet: "erkek", aktivite: "orta" });
  const [makro, setMakro] = useState(null);
  const [gunLog, setGunLog] = useState({ protein: 0, karb: 0, yag: 0, kalori: 0 });
  const [mesajlar, setMesajlar] = useState([]);
  const [input, setInput] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const mesajSonu = useRef(null);

  // Verileri Tarayıcıya Kaydetme (Kalıcılık)
  useEffect(() => {
    const savedProfil = localStorage.getItem("atlas_profil");
    if (savedProfil) {
      const p = JSON.parse(savedProfil);
      setProfil(p);
      setMakro(hesaplaBeslenme(p));
      setEkran("dashboard");
    }
  }, []);

  useEffect(() => {
    if (mesajSonu.current) mesajSonu.current.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar]);

  // ATLAS AI SOHBET (GROQ MOTORU)
  async function atlasSor(mesaj) {
    if (!mesaj.trim() || yukleniyor) return;
    const yeniMesajlar = [...mesajlar, { rol: "kullanici", metin: mesaj }];
    setMesajlar(yeniMesajlar);
    setInput("");
    setYukleniyor(true);

    const sistemPrompt = `Sen Atlas'sın. Uzman fitness koçusun. Kullanıcı: ${profil.isim}, Hedef: ${makro?.kalori}kcal. Bugün alınan: ${gunLog.kalori}kcal. Kısa, bilimsel ve motive edici ol.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY || ''}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: sistemPrompt },
            ...yeniMesajlar.slice(-6).map(m => ({ 
              role: m.rol === "atlas" ? "assistant" : "user", 
              content: m.metin 
            }))
          ]
        })
      });
      const data = await res.json();
      const cevap = data.choices?.[0]?.message?.content || "Şu an sisteme bağlanamıyorum.";
      setMesajlar(prev => [...prev, { rol: "atlas", metin: cevap }]);
    } catch {
      setMesajlar(prev => [...prev, { rol: "atlas", metin: "Sinyal zayıf, ama disiplin tam! 💪" }]);
    }
    setYukleniyor(false);
  }

  const basla = () => {
    if(!profil.isim) return alert("Lütfen ismini gir.");
    const m = hesaplaBeslenme(profil);
    setMakro(m);
    localStorage.setItem("atlas_profil", JSON.stringify(profil));
    setEkran("dashboard");
  };

  if (ekran === "onboarding") {
    return (
      <div style={s.root}>
        <div style={s.onboardCard}>
          <div style={s.atlasLogo}>⚡ ATLAS v1.0</div>
          <input style={s.input} placeholder="İsmin" value={profil.isim} onChange={e => setProfil({...profil, isim: e.target.value})} />
          <div style={{display:'flex', gap:10}}>
            <input style={s.input} type="number" placeholder="Kilo" value={profil.kilo} onChange={e => setProfil({...profil, kilo: +e.target.value})} />
            <input style={s.input} type="number" placeholder="Boy" value={profil.boy} onChange={e => setProfil({...profil, boy: +e.target.value})} />
          </div>
          <button style={s.btnAna} onClick={basla}>SİSTEMİ BAŞLAT</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.headerIsim}>{profil.isim} ⚡</div>
        <button style={s.resetBtn} onClick={() => {localStorage.clear(); window.location.reload();}}>Sıfırla</button>
      </div>

      <div style={s.icerik}>
        {ekran === "dashboard" ? (
          <>
            <div style={s.kart}>
              <div style={s.kartBaslik}>📊 GÜNLÜK KALORİ</div>
              <div style={s.kaloriBuyuk}>
                <span style={{ color: "#b8f243", fontSize: 40, fontWeight: 900 }}>{gunLog.kalori}</span>
                <span style={{ color: "#444" }}> / {makro?.kalori} kcal</span>
              </div>
            </div>

            <div style={s.kart}>
              <div style={s.kartBaslik}>🥗 HIZLI EKLE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {BESINLER.map((b, i) => (
                  <button key={i} style={s.besinBtn} onClick={() => setGunLog(prev => ({
                    ...prev, kalori: prev.kalori + b.kalori
                  }))}>
                    {b.emoji} {b.isim.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={s.chatWrapper}>
            <div style={s.sohbetAlan}>
              {mesajlar.map((m, i) => (
                <div key={i} style={m.rol === 'atlas' ? s.atlasMesaj : s.kullaniciMesaj}>{m.metin}</div>
              ))}
              {yukleniyor && <div style={s.atlasMesaj}>Atlas düşünüyor...</div>}
              <div ref={mesajSonu} />
            </div>
            <div style={{display:'flex', gap:5}}>
              <input style={s.input} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && atlasSor(input)} placeholder="Sor..." />
              <button style={s.gondBtn} onClick={() => atlasSor(input)}>{'>'}</button>
            </div>
          </div>
        )}
      </div>

      <div style={s.altNav}>
        <button style={{...s.navBtn, color: ekran === 'dashboard' ? '#b8f243' : '#444'}} onClick={() => setEkran("dashboard")}>🏠</button>
        <button style={{...s.navBtn, color: ekran === 'atlas' ? '#b8f243' : '#444'}} onClick={() => setEkran("atlas")}>⚡</button>
      </div>
    </div>
  );
}

const s = {
  root: { maxWidth: 420, margin: "0 auto", height: "100vh", background: "#050505", color: "#eee", fontFamily: "monospace", display:'flex', flexDirection:'column' },
  onboardCard: { padding: 40, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center', height: '100%' },
  atlasLogo: { fontSize: 32, fontWeight: 900, color: "#b8f243", textAlign: 'center' },
  header: { padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background:'#0a0a0a' },
  headerIsim: { fontSize: 20, fontWeight: 900 },
  resetBtn: { background: 'none', border: 'none', color: '#333', fontSize: 10 },
  icerik: { flex: 1, padding: 20, overflowY: 'auto' },
  kart: { background: "#0f0f0f", borderRadius: 16, padding: 16, marginBottom: 12, border: '1px solid #1a1a1a' },
  kartBaslik: { fontSize: 10, color: '#555', marginBottom: 10 },
  kaloriBuyuk: { marginBottom: 12 },
  besinBtn: { background: '#151515', border: '1px solid #222', padding: 12, borderRadius: 12, color: '#ccc' },
  chatWrapper: { display: 'flex', flexDirection: 'column', height: '100%' },
  sohbetAlan: { flex: 1, overflowY: 'auto' },
  atlasMesaj: { background: '#111', padding: 12, borderRadius: 12, marginBottom: 10, borderLeft: '3px solid #b8f243' },
  kullaniciMesaj: { background: '#b8f243', color: '#000', padding: 12, borderRadius: 12, marginBottom: 10, alignSelf: 'flex-end', marginLeft: '10%' },
  altNav: { height: 70, display: 'flex', background: '#0a0a0a', borderTop: '1px solid #111' },
  navBtn: { flex: 1, background: 'none', border: 'none', fontSize: 24 },
  input: { background: '#111', border: '1px solid #222', padding: 14, color: '#fff', borderRadius: 12, width: '100%' },
  btnAna: { background: '#b8f243', color: '#000', border: 'none', padding: 16, borderRadius: 12, fontWeight: 900 },
  gondBtn: { background: '#b8f243', border: 'none', borderRadius: 12, padding: '0 20px', fontWeight: 900 }
};
