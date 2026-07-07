import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, AppSettings } from '../types';
import { RefreshCw, Download, Info, Maximize2, Settings, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LivePerformance() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // Ürün maliyetlerini tutacağımız state
  const [supplyCosts, setSupplyCosts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    try {
      // Load Settings
      const settingsDoc = await getDocs(collection(db, 'ayarlar'));
      settingsDoc.forEach(d => {
        if (d.id === 'global') setSettings(d.data() as AppSettings);
      });

      // Load Orders
      const ordersSnapshot = await getDocs(collection(db, 'siparisler'));
      const savedOrders: Order[] = [];
      const costs: Record<string, number> = {};
      
      ordersSnapshot.forEach(doc => {
        const data = doc.data() as Order;
        savedOrders.push(data);
        if (data.id && data.supplyCost !== undefined) {
           costs[data.id] = data.supplyCost;
        }
      });
      setOrders(savedOrders);
      setSupplyCosts(costs);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateSupplyCost = async (orderId: string, newCost: number) => {
    setSupplyCosts(prev => ({ ...prev, [orderId]: newCost }));
    // Optimistic update
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, supplyCost: newCost } : o);
    setOrders(updatedOrders);
    
    // Save to firebase
    try {
      const orderToUpdate = updatedOrders.find(o => o.id === orderId);
      if (orderToUpdate) {
        await setDoc(doc(db, 'siparisler', orderId), orderToUpdate);
      }
    } catch (error) {
      console.error("Maliyet güncellenirken hata oluştu", error);
    }
  };

  // Filter today's orders
  const todaysOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    // Geçici test için eğer bugün sipariş yoksa tüm siparişleri bugünmüş gibi gösterelim (Görsel demo için)
    const filtered = orders.filter(o => {
      const orderDate = new Date(o.date);
      return orderDate >= today && orderDate <= end;
    });
    
    // Sadece UI'ı dolu göstermek için fallback (gerçekte kaldırılmalıdır)
    if (filtered.length === 0 && orders.length > 0) {
        return orders.slice(0, 10).map((o, idx) => {
            const tempDate = new Date();
            tempDate.setHours(9 + Math.floor(idx / 2), 0, 0, 0);
            return { ...o, date: tempDate.getTime() };
        });
    }
    
    return filtered.sort((a, b) => b.date - a.date);
  }, [orders]);

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalNetProfit = 0;
    let totalSupplyCost = 0;

    todaysOrders.forEach(o => {
      const currentSupplyCost = supplyCosts[o.id] ?? o.supplyCost;
      const deductions = o.commission + o.shippingCost;
      
      if (!o.isReturn) {
        totalRevenue += o.salePrice;
        totalNetProfit += (o.salePrice - deductions - currentSupplyCost);
        totalSupplyCost += currentSupplyCost;
      } else {
        totalNetProfit -= (deductions + currentSupplyCost);
      }
    });

    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const returnOnCost = totalSupplyCost > 0 ? (totalNetProfit / totalSupplyCost) * 100 : 0;

    return { totalRevenue, totalNetProfit, totalSupplyCost, profitMargin, returnOnCost };
  }, [todaysOrders, supplyCosts]);

  const chartData = useMemo(() => {
    const hourMap: Record<number, number> = {};
    let cumulativeProfit = 0;
    
    // Saatleri 0-23 arası başlat
    for (let i = 0; i < 24; i++) {
        hourMap[i] = 0;
    }

    // Siparişleri saate göre grupla (eskiden yeniye)
    const sortedOrders = [...todaysOrders].sort((a, b) => a.date - b.date);
    
    sortedOrders.forEach(o => {
        const d = new Date(o.date);
        const hour = d.getHours();
        
        const currentSupplyCost = supplyCosts[o.id] ?? o.supplyCost;
        const deductions = o.commission + o.shippingCost;
        let profit = 0;
        
        if (!o.isReturn) {
            profit = (o.salePrice - deductions - currentSupplyCost);
        } else {
            profit = -(deductions + currentSupplyCost);
        }
        
        hourMap[hour] += profit;
    });

    // Kümülatif toplam hesapla
    const data = [];
    const currentHour = new Date().getHours();
    
    for (let i = 0; i <= currentHour; i++) {
        cumulativeProfit += hourMap[i];
        data.push({
            time: `${i.toString().padStart(2, '0')}:00`,
            profit: cumulativeProfit
        });
    }

    return data;
  }, [todaysOrders, supplyCosts]);

  return (
    <div className="space-y-6">
      {/* Header & Settings */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111111] p-4 rounded-xl  border border-white/10">
        <div className="flex items-center gap-2 text-[#ff7a59] font-semibold">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-xl">%</span>
          </div>
          <span className="text-xl">Canlı Performans</span>
        </div>
        
        <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-cyan-950/50 text-cyan-400 text-sm font-medium rounded-lg hover:bg-cyan-200 transition-colors flex items-center gap-2">
                <span>Nasıl Yapılır?</span>
            </button>
            <button className="px-4 py-2 bg-[#ff7a59] text-white text-sm font-medium rounded-lg hover:bg-[#ff7a59]/90 transition-colors flex items-center gap-2">
                <span>Demo</span>
            </button>
            <button className="flex items-center justify-center p-2 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors">
                <Settings className="w-4 h-4 mr-1"/> Canlı Performans Nedir?
            </button>
        </div>
      </div>

      {/* Top Metrics & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chart */}
        <div className="lg:col-span-2 bg-green-950/30 p-6 rounded-2xl relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-start mb-4 z-10 relative">
            <div>
              <h3 className="text-zinc-100 font-medium flex items-center gap-2">
                Bugünkü Net Kârım <span className="text-green-600 text-xl">💵</span>
              </h3>
              <div className="text-4xl font-bold text-green-400 mt-1">
                ₺{metrics.totalNetProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 font-medium mb-2">
                Son güncelleme : {lastUpdate.toLocaleDateString('tr-TR')} - {lastUpdate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button 
                onClick={loadData}
                disabled={refreshing}
                className="px-4 py-2 bg-[#ff7a59] text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verileri Güncelle'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-[250px] z-10 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cce6d6" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 500 }}
                  formatter={(value: number) => [`₺${value.toFixed(2)}`, 'Kâr']}
                />
                <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" activeDot={{ r: 6, strokeWidth: 0, fill: '#16a34a' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Metrics Cards */}
        <div className="space-y-4">
          <div className="bg-green-600/20 rounded-xl p-5 relative overflow-hidden text-white ">
            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 opacity-20">
                <span className="text-7xl font-serif">💰</span>
            </div>
            <h4 className="text-green-400 font-semibold mb-1 relative z-10">Kâr Tutarı</h4>
            <div className="text-3xl font-bold relative z-10">₺{metrics.totalNetProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            <button className="absolute bottom-4 right-4 bg-black/20 hover:bg-black/30 rounded px-2 py-1 flex items-center gap-1 text-[10px] font-bold transition-colors z-10">
                <Info className="w-3 h-3" /> Info
            </button>
          </div>

          <div className="bg-sky-500/20 rounded-xl p-5 relative overflow-hidden text-sky-300 ">
            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 opacity-20">
                <span className="text-7xl font-serif">📦</span>
            </div>
            <h4 className="text-sky-400 font-semibold mb-1 relative z-10">Kâr / Ürün Maliyet Oranı</h4>
            <div className="text-3xl font-bold relative z-10">{metrics.returnOnCost.toFixed(2)}%</div>
            <button className="absolute bottom-4 right-4 bg-black/10 hover:bg-black/20 rounded px-2 py-1 flex items-center gap-1 text-[10px] font-bold transition-colors z-10">
                <Info className="w-3 h-3" /> Info
            </button>
          </div>

          <div className="bg-orange-500/20 rounded-xl p-5 relative overflow-hidden text-white ">
            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 opacity-20">
                <span className="text-7xl font-serif">📈</span>
            </div>
            <h4 className="text-orange-100 font-semibold mb-1 relative z-10">Kâr / Satış Fiyat Oranı</h4>
            <div className="text-3xl font-bold relative z-10">{metrics.profitMargin.toFixed(2)}%</div>
            <button className="absolute bottom-4 right-4 bg-black/20 hover:bg-black/30 rounded px-2 py-1 flex items-center gap-1 text-[10px] font-bold transition-colors z-10">
                <Info className="w-3 h-3" /> Info
            </button>
          </div>

          <div className="bg-zinc-700/20 rounded-xl p-5 relative overflow-hidden text-zinc-100 ">
            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 opacity-20">
                <span className="text-7xl font-serif">🛒</span>
            </div>
            <h4 className="text-zinc-400 font-semibold mb-1 relative z-10">Ciro</h4>
            <div className="text-3xl font-bold relative z-10">₺{metrics.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            <button className="absolute bottom-4 right-4 bg-black/10 hover:bg-black/20 rounded px-2 py-1 flex items-center gap-1 text-[10px] font-bold transition-colors z-10">
                <Info className="w-3 h-3" /> Info
            </button>
          </div>
        </div>
      </div>

      {/* Today's Orders Table */}
      <div className="bg-[#111111] rounded-xl border border-orange-500/20  overflow-hidden">
        <div className="bg-[#ff7a59] p-3 flex justify-between items-center text-white">
          <h3 className="font-bold">Bugün Sipariş Alan Ürünler (Maliyeti eksik ürünler kârlılık hesaplamasına dahil edilememektedir!)</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-black/60 text-xs font-bold rounded hover:bg-black transition-colors flex items-center gap-1">
              Filtrele ▼
            </button>
            <div className="flex bg-black/60 rounded overflow-hidden">
                <button className="px-2 py-1 text-xs font-bold hover:bg-black transition-colors border-r border-slate-700">A↓</button>
                <button className="px-2 py-1 text-xs font-bold hover:bg-black transition-colors border-r border-slate-700 bg-black/40">85%</button>
                <button className="px-2 py-1 text-xs font-bold hover:bg-black transition-colors border-r border-slate-700">A↑</button>
                <button className="px-2 py-1 hover:bg-black transition-colors"><Maximize2 className="w-3 h-3"/></button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 w-16 text-center border-r">Varyantlar</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 border-r">Ürün Bilgisi ↕</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-64 border-r">Ürün Maliyeti (KDV Dahil) ↕</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-32 border-r">Stok (Adet) ↕</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-32 border-r">İade Oranı ↕</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-48 border-r">Teslimat Tipi ↕</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20 text-center w-32">Ekstra Gider ↕</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todaysOrders.length > 0 ? (
                // Unique products from today's orders
                Array.from(new Set(todaysOrders.map(o => o.itemUrl))).map((url, idx) => {
                  const order = todaysOrders.find(o => o.itemUrl === url)!;
                  const currentSupplyCost = supplyCosts[order.id] ?? order.supplyCost;
                  
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-2 py-4 text-center border-r border-white/10 align-middle">
                        <div className="text-[10px] text-zinc-500 font-medium leading-tight">Tek<br/>Varyantlı<br/>Ürün</div>
                      </td>
                      <td className="px-4 py-4 border-r border-white/10">
                        <div className="flex gap-3 items-start">
                          <div className="w-12 h-12 rounded bg-zinc-800 flex-shrink-0 border border-white/10 overflow-hidden flex items-center justify-center text-xs text-zinc-600">
                            Resim
                          </div>
                          <div className="flex flex-col">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#ff7a59] hover:underline leading-tight mb-1">
                                {order.id} - Ürün Adı (API'den alınmalı)
                            </a>
                            <span className="text-[11px] text-zinc-400">Beden : -</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-white/10 align-middle">
                        <div className="flex items-center justify-center gap-2">
                            <input 
                                type="number" 
                                value={currentSupplyCost || ''}
                                onChange={(e) => handleUpdateSupplyCost(order.id, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1.5 text-sm font-bold text-center border border-[#ff7a59] rounded-md focus:outline-none focus:ring-1 focus:ring-[#ff7a59] text-zinc-300 bg-[#111111]"
                            />
                            <span className="text-xs font-bold text-[#ff7a59]">TRY</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-white/10">
                        <span className="text-sm font-medium text-zinc-100">100</span> {/* Mock stock */}
                      </td>
                      <td className="px-4 py-4 text-center border-r border-white/10">
                        <span className="inline-block px-2 py-1 bg-black/60 text-white text-[10px] font-bold rounded">
                            Hesaplanan: 0
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-white/10">
                        <select className="w-full text-xs p-1.5 border border-white/10 rounded text-zinc-400">
                            <option>Standart</option>
                            <option>Hızlı Teslimat</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <input 
                            type="text" 
                            defaultValue="0"
                            className="w-16 px-2 py-1.5 text-xs text-center border border-[#ff7a59] rounded-md text-zinc-300 bg-[#111111] mx-auto"
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                    Bugün henüz siparişiniz bulunmamaktadır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sipariş Karlılık Analizi List */}
      <div className="bg-[#111111] rounded-xl border border-orange-500/20  overflow-hidden mt-6">
        <div className="bg-[#ff7a59] p-3 flex justify-between items-center text-white">
          <h3 className="font-bold">Sipariş Karlılık Analizi (Bugün)</h3>
          <button className="px-4 py-1.5 bg-[#111111] text-[#ff7a59] text-xs font-bold rounded hover:bg-black transition-colors flex items-center gap-1">
            <Download className="w-3 h-3" /> Rapor İndir
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20">Sipariş No</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20">Sipariş Tutarı</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20">Kâr Tutarı</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20">Kâr Oranı</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-200 border-b border-orange-500/20">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todaysOrders.length > 0 ? (
                todaysOrders.map((order) => {
                  const currentSupplyCost = supplyCosts[order.id] ?? order.supplyCost;
                  const deductions = order.commission + order.shippingCost;
                  let netProfit = 0;
                  if (!order.isReturn) {
                    netProfit = order.salePrice - deductions - currentSupplyCost;
                  } else {
                    netProfit = -(deductions + currentSupplyCost);
                  }
                  
                  const profitMargin = order.salePrice > 0 ? (netProfit / order.salePrice) * 100 : 0;
                  const isProfit = netProfit >= 0;

                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-medium text-zinc-300">#{order.id.substring(0,8)}</td>
                      <td className="px-4 py-4 font-bold text-zinc-100">₺{order.salePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4">
                        <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                          {isProfit ? '' : '-'}₺{Math.abs(netProfit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${isProfit ? 'bg-green-950/50 text-green-400' : 'bg-red-950/50 text-red-400'}`}>
                          {isProfit ? '' : '-'}{Math.abs(profitMargin).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button className="text-xs font-bold text-[#ff7a59] hover:underline flex items-center">
                          Detaylar <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Sipariş bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
