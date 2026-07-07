import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings } from '../types';
import { Save, AlertCircle, CheckCircle2, Key, Cpu } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    trendyolSellerId: '',
    trendyolApiKey: '',
    trendyolApiSecret: '',
    geminiApiKey: '',
    defaultCommissionRate: 15,
    barem1Limit: 149.99,
    barem1Price: 39.99,
    barem2Limit: 399.99,
    barem2Price: 59.99,
    cargoBaremUstuPrice: 69.99
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'ayarlar', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AppSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const docRef = doc(db, 'ayarlar', 'global');
      await setDoc(docRef, settings);
      setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Hata: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Bağlantı Ayarları</h2>
        <p className="text-zinc-500 mt-2">API anahtarlarınızı ve entegrasyon bilgilerinizi yönetin.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${message.type === 'success' ? 'bg-emerald-50/50 text-emerald-800 border-emerald-200/50' : 'bg-rose-50/50 text-rose-800 border-rose-200/50'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600" />}
          <div className="font-medium text-sm">{message.text}</div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-[#111111] p-8 rounded-2xl  border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-white">Trendyol API Bilgileri</h3>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Satıcı ID (Seller ID)</label>
              <input
                type="text"
                name="trendyolSellerId"
                value={settings.trendyolSellerId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">API Key</label>
              <input
                type="password"
                name="trendyolApiKey"
                value={settings.trendyolApiKey}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">API Secret</label>
              <input
                type="password"
                name="trendyolApiSecret"
                value={settings.trendyolApiSecret}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] p-8 rounded-2xl  border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-white">Yapay Zeka Ayarları</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Gemini API Key</label>
            <input
              type="password"
              name="geminiApiKey"
              value={settings.geminiApiKey}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
              required
            />
          </div>
        </div>

        <div className="bg-[#111111] p-8 rounded-2xl  border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-white">Finansal Hesaplama Parametreleri</h3>
          </div>
          <p className="text-sm text-zinc-500">Trendyol komisyon ve kargo barem kesintilerini gerçeğe en yakın şekilde hesaplamak için bu alanları güncel tutun.</p>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Varsayılan Komisyon Oranı (%)</label>
              <input
                type="number"
                step="0.01"
                name="defaultCommissionRate"
                value={settings.defaultCommissionRate ?? 15}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">1. Barem Sınırı (örn: 149.99 ₺)</label>
              <input
                type="number"
                step="0.01"
                name="barem1Limit"
                value={settings.barem1Limit ?? 149.99}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">1. Barem Kargo Ücreti (₺)</label>
              <input
                type="number"
                step="0.01"
                name="barem1Price"
                value={settings.barem1Price ?? 39.99}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">2. Barem Sınırı (örn: 399.99 ₺)</label>
              <input
                type="number"
                step="0.01"
                name="barem2Limit"
                value={settings.barem2Limit ?? 399.99}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">2. Barem Kargo Ücreti (₺)</label>
              <input
                type="number"
                step="0.01"
                name="barem2Price"
                value={settings.barem2Price ?? 59.99}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Barem Üstü Kargo (Tam Ücret) (₺)</label>
              <input
                type="number"
                step="0.01"
                name="cargoBaremUstuPrice"
                value={settings.cargoBaremUstuPrice ?? 69.99}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-[#111111] outline-none transition-all text-white font-medium"
                required
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2.5 transition-all  hover:shadow shadow-indigo-600/20 disabled:opacity-70 disabled:hover:shadow-none"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
