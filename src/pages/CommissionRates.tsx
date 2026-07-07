import React, { useState, useRef } from 'react';
import { Search, Filter, FileSpreadsheet, Maximize2, Settings, Upload } from 'lucide-react';
import { XMLParser } from 'fast-xml-parser';

interface PricingTier {
  price: number;
  isUnder: boolean;
  commission: number;
  isSelected?: boolean;
}

interface ProductAnalysis {
  id: string;
  image: string;
  name: string;
  category: string;
  modelCode: string;
  beden: string;
  stock: number;
  currentPrice: number;
  supplyCost: number;
  shippingCost: number;
  tiers: PricingTier[];
}

export default function CommissionRates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<ProductAnalysis[]>([
    {
      id: '1',
      image: 'https://cdn.dribbble.com/users/4433560/screenshots/15694294/media/4c7dd8da2b3c2bb0238e8e7a8585090e.png?compress=1&resize=400x300',
      name: 'Melontik Ceviz Açık Gardrop Askılık',
      category: 'Dosya',
      modelCode: 'mlntk-code-9',
      beden: '-',
      stock: 451,
      currentPrice: 24.90,
      supplyCost: 5.00,
      shippingCost: 10.00,
      tiers: [
        { price: 23.84, isUnder: false, commission: 19 },
        { price: 23.83, isUnder: true, commission: 14.7 },
        { price: 21.56, isUnder: true, commission: 11.5 },
        { price: 19.21, isUnder: true, commission: 7.4 },
      ]
    },
    {
      id: '2',
      image: 'https://cdn.dribbble.com/users/4433560/screenshots/15694294/media/4c7dd8da2b3c2bb0238e8e7a8585090e.png?compress=1&resize=400x300',
      name: 'Melontik Ceviz Açık Gardrop Askılık',
      category: 'Çocuk Masal ve Öykü Kitabı',
      modelCode: 'mlntk-code-9',
      beden: '-',
      stock: 14,
      currentPrice: 305.00,
      supplyCost: 180.00,
      shippingCost: 35.00,
      tiers: [
        { price: 122.59, isUnder: false, commission: 10.5 },
        { price: 122.58, isUnder: true, commission: 5.7 },
        { price: 116.26, isUnder: true, commission: 5.7, isSelected: true },
        { price: 108.62, isUnder: true, commission: 2.7 },
      ]
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateProfit = (price: number, commissionRate: number, supplyCost: number, shippingCost: number) => {
    const commissionAmount = price * (commissionRate / 100);
    const netProfit = price - commissionAmount - supplyCost - shippingCost;
    const profitMargin = price > 0 ? (netProfit / price) * 100 : 0;
    return { netProfit, profitMargin };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const result = parser.parse(text);
        
        // Find product array dynamically
        let productList: any[] = [];
        
        // Common XML structures: result.root.urunler.urun, result.Products.Product, etc.
        const searchItems = (obj: any) => {
          if (!obj) return;
          if (Array.isArray(obj)) {
            if (obj.length > 0 && typeof obj[0] === 'object' && ('name' in obj[0] || 'ad' in obj[0] || 'urun_adi' in obj[0] || 'price' in obj[0] || 'fiyat' in obj[0] || 'isim' in obj[0])) {
              productList = obj;
              return;
            }
            obj.forEach(searchItems);
          } else if (typeof obj === 'object') {
            Object.values(obj).forEach(searchItems);
          }
        };

        searchItems(result);

        if (productList.length > 0) {
          const mappedProducts = productList.slice(0, 50).map((item: any, idx: number) => {
            // Extrapolate data dynamically
            const name = item.name || item.ad || item.urun_adi || item.isim || item.title || 'İsimsiz Ürün';
            const price = parseFloat(item.price || item.fiyat || item.satis_fiyati || item.price1 || 0);
            const stock = parseInt(item.stock || item.stok || item.quantity || item.adet || 0);
            const category = item.category || item.kategori || item.kategori_adi || '-';
            const modelCode = item.modelCode || item.model_kodu || item.sku || item.barkod || item['@_id'] || `XML-${idx}`;
            const image = item.image || item.resim || item.resim1 || item.picture || 'https://via.placeholder.com/150';
            
            // Generate some dummy tiers based on price to show functionality
            const tiers = [];
            if (price > 0) {
              tiers.push({ price: price * 0.95, isUnder: false, commission: 15 });
              tiers.push({ price: price * 0.94, isUnder: true, commission: 10 });
              tiers.push({ price: price * 0.85, isUnder: true, commission: 8 });
              tiers.push({ price: price * 0.80, isUnder: true, commission: 5 });
            }

            return {
              id: `xml-${idx}`,
              image,
              name,
              category,
              modelCode,
              beden: item.beden || item.size || '-',
              stock: isNaN(stock) ? 0 : stock,
              currentPrice: isNaN(price) ? 0 : price,
              supplyCost: isNaN(price) ? 0 : price * 0.5, // Varsayılan maliyet %50
              shippingCost: 35.00,
              tiers
            };
          });

          setProducts(mappedProducts);
          alert(`Başarıyla ${mappedProducts.length} ürün yüklendi.`);
        } else {
          alert('XML dosyasında ürün listesi bulunamadı. Yapı desteklenmiyor olabilir.');
        }
      } catch (error) {
        console.error("XML parse error:", error);
        alert('XML dosyası okunurken bir hata oluştu.');
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#ff7a59] rounded-t-xl p-4 flex items-center justify-between ">
        <h1 className="text-xl font-bold text-white tracking-tight">Ürün Komisyon Tarifesi Kârlılık Analizi</h1>
        <div className="flex gap-2">
          <button className="flex items-center justify-center p-2 bg-black/20 hover:bg-black/30 rounded-lg text-white transition-colors" title="Ayarlar">
            <span className="text-xs font-bold px-1">A↑</span>
          </button>
          <button className="flex items-center justify-center px-3 py-2 bg-black/20 hover:bg-black/30 rounded-lg text-white transition-colors">
            <span className="text-xs font-bold">90%</span>
          </button>
          <button className="flex items-center justify-center p-2 bg-black/20 hover:bg-black/30 rounded-lg text-white transition-colors" title="Büyüt">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-4 -mt-2">
        <input 
          type="file" 
          accept=".xml" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-[#111111] border border-[#ff7a59] text-[#ff7a59] text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-[#ff7a59]/5 transition-colors"
        >
          <Upload className="w-4 h-4" />
          XML Yükle
        </button>
        <button className="px-4 py-2 bg-[#111111] border border-[#ff7a59] text-[#ff7a59] text-sm font-medium rounded-lg hover:bg-[#ff7a59]/5 transition-colors">
          Excel Hatalarını Görüntüle
        </button>
        <button className="px-4 py-2 bg-black/60 text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-black transition-colors">
          Toplu Seçim <span className="text-[10px]">▼</span>
        </button>
      </div>

      <div className="bg-[#111111] rounded-xl border border-white/10  overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-black/40">
              <th className="px-4 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 w-16 text-center">Varyantlar</th>
              <th className="px-4 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 w-64">Ürün <span className="text-[#ff7a59] ml-1">↕</span></th>
              <th className="px-4 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-20">Stok <span className="text-[#ff7a59] ml-1">↕</span></th>
              <th className="px-4 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-28">Güncel Fiyat (₺) <span className="text-[#ff7a59] ml-1">↕</span></th>
              <th className="px-2 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 border-l border-white/10 text-center">1. Fiyat Aralığı <span className="text-[#ff7a59] ml-1">↕</span></th>
              <th className="px-2 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 border-l border-white/10 text-center">2. Fiyat Aralığı <span className="text-[#ff7a59] ml-1">↕</span></th>
              <th className="px-2 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 border-l border-white/10 text-center">3. Fiyat Aralığı <span className="text-[#ff7a59] ml-1">↕</span></th>
              <th className="px-2 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 border-l border-white/10 text-center">4. Fiyat Aralığı <span className="text-[#ff7a59] ml-1">↕</span></th>
              <th className="px-4 py-4 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-48">Manuel Fiyat Girişi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-white/5 transition-colors">
                <td className="px-2 py-6 text-center border-r border-white/10 align-middle">
                  <div className="text-[10px] text-zinc-500 font-medium leading-tight">Tek<br/>Varyantlı<br/>Ürün</div>
                </td>
                <td className="px-4 py-4 border-r border-white/10">
                  <div className="flex gap-3 items-start">
                    <div className="w-12 h-12 rounded bg-zinc-800 flex-shrink-0 border border-white/10 overflow-hidden">
                      <img src={product.image} alt="Product" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <a href="#" className="text-sm font-semibold text-[#ff7a59] hover:underline leading-tight mb-1">{product.name}</a>
                      <span className="text-[11px] text-zinc-400">Kategori : {product.category}</span>
                      <span className="text-[11px] text-zinc-400">Model Kodu : {product.modelCode}</span>
                      <span className="text-[11px] text-zinc-400">Beden : {product.beden}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center border-r border-white/10">
                  <span className="text-sm font-medium text-zinc-100">{product.stock}</span>
                </td>
                <td className="px-4 py-4 text-center border-r border-white/10">
                  <span className="text-sm font-bold text-[#ff7a59]">₺{product.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </td>
                
                {/* Tiers rendering */}
                {product.tiers.map((tier, idx) => {
                  const { netProfit, profitMargin } = calculateProfit(tier.price, tier.commission, product.supplyCost, product.shippingCost);
                  const isProfit = netProfit >= 0;
                  
                  return (
                    <td key={idx} className={`px-2 py-4 text-center border-r border-white/10 relative ${tier.isSelected ? 'bg-cyan-50/30' : ''}`}>
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[13px] font-bold text-[#ff7a59]">₺{tier.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[11px] text-zinc-400">{tier.isUnder ? 've altı' : 've üzeri'}</span>
                        </div>
                        <span className="text-[12px] font-medium text-zinc-100">Komisyon {tier.commission}</span>
                        
                        <div className={`px-2 py-1 rounded-full text-[11px] font-bold ${isProfit ? 'bg-green-950/50 text-green-400' : 'bg-red-950/50 text-red-400'}`}>
                          {isProfit ? '₺' : '-₺'}{Math.abs(netProfit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {isProfit ? 'Kâr' : 'Zarar'} ({isProfit ? '' : '-'}{Math.abs(profitMargin).toFixed(2)}%)
                        </div>
                        
                        <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-full border ${tier.isSelected ? 'border-[#ff7a59] bg-[#ff7a59]' : 'border-zinc-700 bg-black group-hover:border-zinc-500'} flex items-center justify-center`}>
                            {tier.isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                          </div>
                          <span className="text-[12px] font-medium text-zinc-400">Seç</span>
                        </label>
                      </div>
                    </td>
                  );
                })}
                
                <td className="px-4 py-4 text-center align-middle">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Manuel fiyat" 
                      className="w-24 px-2 py-1.5 text-xs border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-[#ff7a59] text-zinc-400 placeholder:text-zinc-600 bg-black"
                    />
                    <button className="px-3 py-1.5 bg-black/60 text-white text-xs font-medium rounded-md hover:bg-black transition-colors">
                      Hesapla
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400 flex gap-3 ">
        <Settings className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
        <div>
          <p className="font-semibold mb-1 text-amber-300">API Entegrasyon Notu</p>
          <p className="text-amber-500/80">Bu ekrandaki fiyat baremleri ve indirimli komisyon oranları Trendyol'un <strong>Promosyonlar / İndirimli Komisyon</strong> servislerinden çekilebilir. Doğru kâr/zarar hesaplaması için her ürünün <span className="font-semibold text-amber-300">Maliyet (Alış)</span> ve <span className="font-semibold text-amber-300">Kargo</span> tutarlarının sisteminize eksiksiz girilmiş olması gerekmektedir.</p>
        </div>
      </div>
    </div>
  );
}
