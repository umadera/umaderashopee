import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, PlusCircle, List, Link as LinkIcon, 
  RefreshCw, Save, Copy, ExternalLink, Wand2, Package, Tag, Download, CheckCircle2, ShoppingBag,
  ClipboardPaste, Trash2 
} from 'lucide-react';

// --- Firebase Setup ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// =========================================================================
// 1. KUNCI RAHASIA FIREBASE ANDA
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDlVgLrBX50GEo8o5ba6blPOXe3ZUfPmX8",
  authDomain: "dropship-master.firebaseapp.com",
  projectId: "dropship-master",
  storageBucket: "dropship-master.firebasestorage.app",
  messagingSenderId: "306233235085",
  appId: "1:306233235085:web:f29ec8ceb137642a3274c4"
};

// =========================================================================
// 2. API KEY GEMINI ANDA
// =========================================================================
const apiKey = "AIzaSyBaP2HUKvmpp-8YbqujhvSUKRBrCzJspdc";

// =========================================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "dropship-master-app";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tambah');
  const [products, setProducts] = useState([]);
  
  // Auth Effect
  useEffect(() => {
    signInAnonymously(auth).catch(error => console.error("Auth error:", error));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch Data Effect
  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dropship_products');
    
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const productData = [];
      snapshot.forEach((doc) => {
        productData.push({ id: doc.id, ...doc.data() });
      });
      productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setProducts(productData);
    }, (error) => {
      console.error("Error fetching products:", error);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6" />
            <h1 className="text-xl font-bold">Dropship Master</h1>
          </div>
          <div className="text-xs bg-blue-700 px-3 py-1 rounded-full opacity-80 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {user ? 'Terhubung (Cloud)' : 'Menghubungkan...'}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex bg-white rounded-xl shadow-sm mb-6 overflow-hidden border border-slate-100">
          <button 
            onClick={() => setActiveTab('tambah')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'tambah' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PlusCircle className="w-5 h-5" /> <span className="hidden sm:inline">Tambah Produk</span>
          </button>
          <button 
            onClick={() => setActiveTab('cari')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'cari' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Search className="w-5 h-5" /> <span className="hidden sm:inline">Cari Kode (Order)</span>
          </button>
          <button 
            onClick={() => setActiveTab('daftar')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'daftar' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List className="w-5 h-5" /> <span className="hidden sm:inline">Daftar Produk</span>
          </button>
        </div>

        {activeTab === 'tambah' && <TabTambahProduk user={user} />}
        {activeTab === 'cari' && <TabCariProduk products={products} />}
        {activeTab === 'daftar' && <TabDaftarProduk products={products} user={user} />}
      </main>
    </div>
  );
}

// ==========================================
// KOMPONEN: TAMBAH PRODUK
// ==========================================
function TabTambahProduk({ user }) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  
  const [draft, setDraft] = useState(null);
  const [marginSetting, setMarginSetting] = useState(10);
  const [selectedImages, setSelectedImages] = useState([]); 
  
  const [sellerStatus, setSellerStatus] = useState("10"); 
  const [isGratisOngkirXtra, setIsGratisOngkirXtra] = useState(false);
  const [isCashbackXtra, setIsCashbackXtra] = useState(false);

  const titleRef = useRef(null);
  const descRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = descRef.current.scrollHeight + 'px';
    }
  }, [draft?.sellTitle, draft?.sellDescription]);

  const showNotification = (message, type = 'error') => {
    const msg = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-green-600' : type === 'warning' ? 'bg-orange-500' : 'bg-red-600';
    msg.className = `fixed top-4 right-4 ${bgClass} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-[9999] animate-bounce`;
    msg.innerHTML = message;
    document.body.appendChild(msg);
    setTimeout(() => document.body.removeChild(msg), 4000);
  };

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error("Clipboard diblokir");
      }
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      showNotification("Data berhasil di-paste!", "success");
    } catch (err) {
      const textarea = document.getElementById('data-input');
      if (textarea) textarea.focus();
      showNotification("Sistem memblokir paste otomatis. Silakan klik kotak lalu tekan Ctrl+V.", "warning");
    }
  };

  const handleClear = () => {
    if (window.confirm("Yakin ingin membersihkan semua data ini?")) {
      setInputValue('');
      setDraft(null);
      setSelectedImages([]);
    }
  };

  const handleProcessInput = () => {
    const input = inputValue.trim();
    if (!input) {
      showNotification("Harap masukkan Link atau Paste data dari Ekstensi!");
      return;
    }
    
    setIsLoading(true);

    if (input.startsWith('{')) {
      try {
        const data = JSON.parse(input);
        if (data && data.isFromExtension) {
          setDraft({
            supplierUrl: data.url || '',
            originalTitle: data.title || '',
            originalDescription: data.desc || '',
            originalPrice: data.price || 0,
            sellTitle: data.title || '', 
            sellDescription: data.desc || '', 
            sellPrice: data.sellPrice || 0,
            images: data.images || []
          });
          setMarginSetting(data.margin || 7);
          setSelectedImages(data.images || []); 
          showNotification("Berhasil membaca data dari Ekstensi!", "success");
          setIsLoading(false);
          return;
        } else {
          throw new Error("Format JSON bukan dari Ekstensi");
        }
      } catch (e) {
        showNotification("Format data Ekstensi tidak valid. Silakan Salin ulang.");
        setIsLoading(false);
        return;
      }
    }

    if (input.startsWith('http')) {
      let extractedTitle = "Produk Sample";
      try {
        const urlObj = new URL(input);
        const pathSegments = urlObj.pathname.split('/');
        const slug = pathSegments[1]; 
        if (slug) {
          const titlePart = slug.split('-i.')[0];
          extractedTitle = decodeURIComponent(titlePart).replace(/-/g, ' ');
        }
      } catch (e) {}

      setTimeout(() => {
        const dummyPrice = Math.floor(Math.random() * 150000) + 50000;
        const dummyImages = [
          `https://placehold.co/300x300/e2e8f0/475569?text=Foto+Simulasi+1`,
          `https://placehold.co/300x300/e2e8f0/475569?text=Foto+Simulasi+2`
        ];
        setDraft({
          supplierUrl: input,
          originalTitle: extractedTitle || "Produk Sample",
          originalDescription: `Ready Stok ya kak!!\n\nProduk ${extractedTitle} kualitas terbaik.\nSilakan diorder sebelum kehabisan.`,
          originalPrice: dummyPrice,
          sellTitle: extractedTitle || "Produk Sample", 
          sellDescription: `Ready Stok ya kak!!\n\nProduk ${extractedTitle} kualitas terbaik.\nSilakan diorder sebelum kehabisan.`, 
          sellPrice: Math.round(dummyPrice + (dummyPrice * marginSetting / 100)),
          images: dummyImages
        });
        setSelectedImages(dummyImages); 
        showNotification("Berhasil menarik simulasi data dari URL", "success");
        setIsLoading(false);
      }, 1500);
      return;
    }

    showNotification("Input tidak dikenali. Masukkan URL valid atau paste kode Ekstensi.");
    setIsLoading(false);
  };

  const handleOptimizeAI = async () => {
    if (!draft) return;
    setIsAiLoading(true);
    try {
      const prompt = `
      Anda adalah seorang Expert Copywriter khusus marketplace Shopee.
      Tugas Anda adalah mengoptimasi data produk dari supplier ini agar siap di-reupload.

      Data Asli:
      - Judul Asli: "${draft.originalTitle}"
      - Deskripsi Asli: "${draft.originalDescription}"
      - Harga Modal: Rp ${draft.originalPrice}

      Instruksi Detail:
      1. JUDUL: Maksimal 100 karakter, memancing klik, SEO-friendly.
      2. DESKRIPSI (SANGAT PENTING): Tulis ulang menggunakan teknik copywriting. Anda WAJIB memisahkan setiap paragraf atau daftar spesifikasi dengan ENTER (baris baru). JANGAN menumpuk teks menjadi satu paragraf panjang. Di dalam JSON, gunakan format "\\n\\n" untuk baris baru. Hapus semua no WA/link/identitas penjual asli.
      3. HARGA: Berikan angka harga jual dengan strategi "Harga Psikologis" (margin 15-25%).
      4. ALASAN HARGA: Satu kalimat singkat.

      Balas HANYA dengan format JSON persis seperti ini:
      {
        "judul_shopee": "...",
        "deskripsi_menarik": "Paragraf Pertama...\\n\\nParagraf Kedua...\\n\\nSpesifikasi:\\n- Bahan: Katun\\n- Ukuran: L",
        "harga_rekomendasi": 99000,
        "alasan_harga": "..."
      }
      `;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              judul_shopee: { type: "STRING" },
              deskripsi_menarik: { type: "STRING" },
              harga_rekomendasi: { type: "NUMBER" },
              alasan_harga: { type: "STRING" }
            }
          }
        }
      };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const textResult = await res.text();
      const result = JSON.parse(textResult);

      const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        const cleanText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanText);
        
        setDraft(prev => ({
          ...prev,
          sellTitle: aiData.judul_shopee || prev.sellTitle,
          sellDescription: aiData.deskripsi_menarik || prev.sellDescription,
          sellPrice: aiData.harga_rekomendasi || prev.sellPrice,
          aiPriceReason: aiData.alasan_harga || ''
        }));
      } else {
        throw new Error("Format balasan AI tidak valid");
      }
    } catch (error) {
      console.error("AI Error:", error);
      showNotification("Gagal menghubungi AI. Pastikan API Key Gemini benar.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleMarginChange = (e) => {
    const newMargin = parseInt(e.target.value);
    setMarginSetting(newMargin);
    if (draft) {
      setDraft(prev => ({
        ...prev,
        sellPrice: Math.round(prev.originalPrice + (prev.originalPrice * newMargin / 100)),
        aiPriceReason: null
      }));
    }
  };

  useEffect(() => {
    if (draft) {
      setDraft(prev => ({
        ...prev,
        sellPrice: Math.round(prev.originalPrice + (prev.originalPrice * marginSetting / 100))
      }));
    }
  }, [marginSetting]);

  const handleSave = async () => {
    if (!user || !draft) return;
    setIsSaving(true);
    try {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const productCode = `DS-${randomNum}`;
      
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dropship_products', productCode);
      await setDoc(docRef, {
        code: productCode,
        supplierUrl: draft.supplierUrl,
        originalTitle: draft.originalTitle,
        title: draft.sellTitle || draft.originalTitle,
        description: draft.sellDescription || draft.originalDescription,
        originalPrice: draft.originalPrice,
        sellPrice: draft.sellPrice,
        marginPercentage: marginSetting,
        images: selectedImages, 
        createdAt: new Date().toISOString()
      });
      
      setDraft(null);
      setInputValue('');
      setSelectedImages([]);
      showNotification(`Produk tersimpan dengan kode: ${productCode}`, "success");

    } catch (error) {
      console.error("Save error:", error);
      showNotification("Gagal menyimpan produk. Pastikan konfigurasi Firebase benar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadImage = (url) => window.open(url, '_blank');

  const toggleImageSelection = (imgUrl) => {
    setSelectedImages(prev => 
      prev.includes(imgUrl) ? prev.filter(url => url !== imgUrl) : [...prev, imgUrl]
    );
  };

  const handleDownloadAllImages = async () => {
    if (!selectedImages || selectedImages.length === 0) return;
    setIsDownloadingAll(true);
    showNotification("Mempersiapkan unduhan gambar...", "success");

    for (let i = 0; i < selectedImages.length; i++) {
      try {
        const response = await fetch(selectedImages[i]);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Foto-Produk-${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        window.open(selectedImages[i], '_blank');
      }
    }
    setIsDownloadingAll(false);
    showNotification("Selesai memproses foto terpilih!", "success");
  };

  const handleCopyText = (text, type) => {
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showNotification(`${type} disalin!`, "success");
    } catch (err) {
      showNotification(`Gagal menyalin ${type}.`);
    }
    document.body.removeChild(textArea);
  };

  const hitungPotonganShopee = () => {
    if (!draft) return { totalPotongan: 0, bersih: 0, rincian: [] };
    
    const hargaJual = draft.sellPrice;
    let totalPotongan = 0;
    let rincian = [];

    const adminRate = parseFloat(sellerStatus);
    if (adminRate > 0) {
      const adminFee = Math.round(hargaJual * (adminRate / 100));
      totalPotongan += adminFee;
      rincian.push({ nama: `Admin (${adminRate}%)`, nilai: adminFee });
    }

    if (isGratisOngkirXtra) {
      const ongkirFee = Math.min(Math.round(hargaJual * 0.04), 10000);
      totalPotongan += ongkirFee;
      rincian.push({ nama: 'Bebas Ongkir Xtra', nilai: ongkirFee });
    }

    if (isCashbackXtra) {
      const cashbackFee = Math.min(Math.round(hargaJual * 0.014), 10000);
      totalPotongan += cashbackFee;
      rincian.push({ nama: 'Cashback Xtra', nilai: cashbackFee });
    }

    const bersih = hargaJual - draft.originalPrice - totalPotongan;
    return { totalPotongan, bersih, rincian };
  };

  const { totalPotongan, bersih, rincian } = hitungPotonganShopee();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800">
          <LinkIcon className="w-5 h-5 text-blue-500" /> 1. Input Data Produk
        </h2>
        
        <div className="flex flex-col gap-4">
          <textarea 
            id="data-input"
            placeholder="Paste Link URL Shopee DI SINI... &#10;ATAU paste data JSON dari Ekstensi DI SINI..." 
            className="w-full border-2 border-dashed border-indigo-200 p-4 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all resize-none text-sm font-mono text-slate-600 bg-slate-50 min-h-[100px]"
            rows="3"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          ></textarea>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <button 
              onClick={handlePaste}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <ClipboardPaste className="w-5 h-5" /> Paste
            </button>
            <button 
              onClick={handleClear}
              disabled={!inputValue && !draft}
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50 px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Trash2 className="w-5 h-5" /> Clear
            </button>
            <button 
              onClick={handleProcessInput}
              disabled={isLoading || !inputValue}
              className="flex-1 bg-slate-800 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Ekstrak & Proses Data'}
            </button>
          </div>
        </div>
      </div>

      {draft && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fadeIn">
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <Tag className="w-5 h-5 text-purple-500" /> 2. Rapihkan & Simpan
            </h2>
            <button 
              onClick={handleOptimizeAI}
              disabled={isAiLoading}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-md disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              ✨ Rapihkan dengan AI
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-slate-700">Judul Produk (Toko Anda)</label>
                  <button onClick={() => handleCopyText(draft.sellTitle, 'Judul')} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors flex items-center gap-1 text-xs font-semibold">
                    <Copy className="w-4 h-4" /> Salin
                  </button>
                </div>
                <textarea 
                  ref={titleRef}
                  className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none overflow-hidden bg-white"
                  rows="2"
                  value={draft.sellTitle}
                  onChange={(e) => setDraft({...draft, sellTitle: e.target.value})}
                ></textarea>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-slate-700">Deskripsi Bersih</label>
                  <button onClick={() => handleCopyText(draft.sellDescription, 'Deskripsi')} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors flex items-center gap-1 text-xs font-semibold">
                    <Copy className="w-4 h-4" /> Salin
                  </button>
                </div>
                <textarea 
                  ref={descRef}
                  className="w-full border border-slate-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono resize-none overflow-hidden min-h-[300px] leading-relaxed bg-white"
                  value={draft.sellDescription}
                  onChange={(e) => setDraft({...draft, sellDescription: e.target.value})}
                ></textarea>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-4 text-sm flex items-center gap-2">Kalkulator Keuntungan</h3>
                
                <div className="flex justify-between items-center text-sm text-slate-600 mb-4">
                  <span className="font-medium">Harga Modal Asli:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-400">Rp</span>
                    <input 
                      type="number"
                      value={draft.originalPrice}
                      onChange={(e) => {
                        const newPrice = parseInt(e.target.value) || 0;
                        setDraft({...draft, originalPrice: newPrice, sellPrice: Math.round(newPrice + (newPrice * marginSetting / 100)), aiPriceReason: null});
                      }}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-right text-slate-700 font-mono font-bold w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {draft.aiPriceReason && (
                  <div className="bg-purple-100/50 p-3 rounded-lg border border-purple-200 mb-4 text-xs">
                    <strong className="text-purple-800 flex items-center gap-1 mb-1"><Wand2 className="w-3 h-3"/> Analisis Harga AI:</strong>
                    <p className="text-purple-700">{draft.aiPriceReason}</p>
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="flex justify-between text-sm text-slate-600 mb-2">
                    <span className="font-medium">Atur Margin (%):</span>
                    <span className="font-bold text-blue-700">{marginSetting}%</span>
                  </label>
                  <input type="range" min="1" max="100" value={marginSetting} onChange={handleMarginChange} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>

                <div className="flex justify-between items-center text-lg font-bold text-slate-800 pt-4 border-t border-blue-200">
                  <span>Harga Jual Anda:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-400 font-medium">Rp</span>
                    <input 
                      type="number"
                      value={draft.sellPrice}
                      onChange={(e) => setDraft({...draft, sellPrice: parseInt(e.target.value) || 0, aiPriceReason: null})}
                      className="bg-white border-2 border-green-300 rounded-lg px-3 py-1.5 text-right text-green-700 font-bold w-32 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-2xl border border-orange-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 text-orange-700 font-bold text-sm mb-4">
                  <ShoppingBag className="w-5 h-5" /> <span>Potongan Shopee (Kategori A)</span>
                </div>

                <div className="space-y-4 mb-5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Status Toko Anda:</label>
                    <select value={sellerStatus} onChange={(e) => setSellerStatus(e.target.value)} className="w-full bg-white border border-orange-300 rounded-lg p-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="0">Non-Star Baru (&lt; 50 Pesanan) - Gratis 0%</option>
                      <option value="10">Non-Star / Star / Star+ - 10%</option>
                      <option value="11.7">Shopee Mall - 11.7%</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2.5 bg-white/60 p-3 rounded-lg border border-orange-100">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                      <input type="checkbox" checked={isGratisOngkirXtra} onChange={(e) => setIsGratisOngkirXtra(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"/>
                      <span>Gratis Ongkir Xtra <span className="text-orange-600 font-bold">(4% - Max 10rb)</span></span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                      <input type="checkbox" checked={isCashbackXtra} onChange={(e) => setIsCashbackXtra(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"/>
                      <span>Cashback Xtra <span className="text-orange-600 font-bold">(1.4% - Max 10rb)</span></span>
                    </label>
                  </div>
                </div>

                <div className="mb-4 space-y-1.5">
                  {rincian.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs text-slate-600 font-medium">
                      <span>{item.nama}:</span><span className="font-mono text-red-500">- Rp {item.nilai.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-orange-200 border-dashed">
                    <span className="text-slate-800 font-bold">Total Potongan Shopee:</span>
                    <span className="font-mono text-red-600 font-bold">- Rp {totalPotongan.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-lg font-bold pt-4 border-t border-orange-300 mt-2">
                  <span className="text-slate-800">Keuntungan Bersih:</span>
                  <span className={bersih > 0 ? "text-green-700 font-mono bg-green-200/60 px-3 py-1 rounded-lg" : "text-red-600 font-mono bg-red-100 px-3 py-1 rounded-lg"}>
                    Rp {bersih.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="block text-sm font-bold text-slate-700">Foto Produk HD</label>
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-bold border border-slate-200">
                    {selectedImages.length} dari {draft.images.length} Dipilih
                  </span>
                </div>
                
                {draft.images.length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">Tidak ada foto.</div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {draft.images.map((img, idx) => {
                      const isSelected = selectedImages.includes(img);
                      return (
                        <div key={idx} onClick={() => toggleImageSelection(img)} className={`relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-square ${isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-slate-200'}`}>
                          <img src={img} alt="Foto" className="w-full h-full object-cover" />
                          <div className={`absolute top-1.5 right-1.5 p-1 rounded-full text-white transition-colors shadow-sm ${isSelected ? 'bg-blue-500' : 'bg-slate-800/20'}`}><CheckCircle2 className="w-4 h-4" /></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3">
            <button onClick={handleDownloadAllImages} disabled={isDownloadingAll || selectedImages.length === 0} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-bold hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center gap-2">
              {isDownloadingAll ? <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> : <Download className="w-5 h-5 text-blue-600" />}
              <span>Unduh ({selectedImages.length})</span>
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan & Generate Kode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// KOMPONEN: CARI PRODUK
// ==========================================
function TabCariProduk({ products }) {
  const [searchCode, setSearchCode] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const query = searchCode.trim().toUpperCase();
    const result = products.find(p => p.code === query);
    setFoundProduct(result || null);
    setSearched(true);
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Link disalin!");
    } catch (err) {}
    document.body.removeChild(textArea);
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input type="text" placeholder="Ketik kode (DS-XXXX)..." value={searchCode} onChange={(e) => setSearchCode(e.target.value)} className="flex-1 border-2 border-blue-200 p-4 rounded-xl text-lg text-center uppercase tracking-wider focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none" />
        <button type="submit" className="bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"><Search className="w-5 h-5" /> Cari</button>
      </form>

      {searched && !foundProduct && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">Kode tidak ditemukan.</div>
      )}

      {foundProduct && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="bg-green-500 text-white p-4 flex justify-between items-center">
            <span className="font-mono font-bold text-xl">{foundProduct.code}</span>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{foundProduct.title}</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={foundProduct.supplierUrl} target="_blank" rel="noreferrer" className="flex-1 bg-orange-500 text-white py-3.5 rounded-xl font-bold text-center flex items-center justify-center gap-2 hover:bg-orange-600"><ExternalLink className="w-5 h-5" /> Buka Link Penjual</a>
              <button onClick={() => copyToClipboard(foundProduct.supplierUrl)} className="bg-slate-100 text-slate-700 py-3.5 px-6 rounded-xl font-bold hover:bg-slate-200 flex items-center justify-center gap-2"><Copy className="w-5 h-5" /> Copy Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// KOMPONEN: DAFTAR PRODUK
// ==========================================
function TabDaftarProduk({ products, user }) {
  const handleDelete = async (id, code) => {
    if(window.confirm(`Yakin hapus kode ${code}?`)) {
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'dropship_products', id));
      } catch (e) {}
    }
  };

  if (products.length === 0) return <div className="text-center py-20 bg-white rounded-xl">Belum ada produk.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {products.map((product) => (
        <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
          <div className="w-24 h-24 shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
             {product.images?.[0] ? <img src={product.images[0]} alt="img" className="w-full h-full object-cover" /> : <Package />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <span className="bg-slate-800 text-white text-xs font-mono font-bold px-2.5 py-1 rounded">{product.code}</span>
              <button onClick={() => handleDelete(product.id, product.code)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold">Hapus</button>
            </div>
            <h3 className="text-sm font-bold text-slate-700 truncate">{product.title}</h3>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
              <div><span className="block text-[10px] text-slate-400">Modal</span><span className="text-sm font-semibold">Rp {product.originalPrice?.toLocaleString()}</span></div>
              <div className="text-right"><span className="block text-[10px] text-blue-500">Jual</span><span className="text-sm font-bold text-green-600">Rp {product.sellPrice?.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}