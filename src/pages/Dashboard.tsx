import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings, Order } from '../types';
import { RefreshCw, TrendingDown, TrendingUp, AlertTriangle, Sparkles, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import ReactMarkdown from 'react-markdown';

export default function Dashboard() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const [syncStartDate, setSyncStartDate] = useState<string>('');
  const [syncEndDate, setSyncEndDate] = useState<string>('');
  
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Load settings and existing orders from Firebase
  useEffect(() => {
    async function initData() {
      try {
        // Load Settings
        const settingsDoc = await getDoc(doc(db, 'ayarlar', 'global'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as AppSettings);
        }

        // Load saved orders to get manual supply costs
        const ordersSnapshot = await getDocs(collection(db, 'siparisler'));
        const savedOrders: Record<string, Order> = {};
        ordersSnapshot.forEach(doc => {
          savedOrders[doc.id] = doc.data() as Order;
        });

        // Initialize with saved orders or empty
        setOrders(Object.values(savedOrders));
      } catch (error) {
        console.error("Error initializing data", error);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const handleSync = async () => {
    if (!settings?.trendyolApiKey || !settings?.trendyolSellerId || !settings?.trendyolApiSecret) {
      alert('Lütfen önce ayarlardan Trendyol API bilgilerini girin.');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/trendyol-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: settings.trendyolSellerId,
          apiKey: settings.trendyolApiKey,
          apiSecret: settings.trendyolApiSecret,
          startDate: syncStartDate ? new Date(syncStartDate).getTime() : undefined,
          endDate: syncEndDate ? new Date(syncEndDate).getTime() : undefined,
          defaultCommissionRate: settings.defaultCommissionRate ?? 15,
          barem1Limit: settings.barem1Limit ?? 149.99,
          barem1Price: settings.barem1Price ?? 39.99,
          barem2Limit: settings.barem2Limit ?? 399.99,
          barem2Price: settings.barem2Price ?? 59.99,
          cargoBaremUstuPrice: settings.cargoBaremUstuPrice ?? 69.99
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bilinmeyen Hata');
      }

      const data = await response.json();
      const syncedOrders: Order[] = data.orders;

      // Merge with existing manual supply costs
      const newOrders = [...orders];
      const ordersMap = new Map(newOrders.map(o => [o.id, o]));

      for (const order of syncedOrders) {
        if (ordersMap.has(order.id)) {
          // Update order but keep supply cost
          const existing = ordersMap.get(order.id)!;
          ordersMap.set(order.id, { ...order, supplyCost: existing.supplyCost });
        } else {
          // New order
          ordersMap.set(order.id, { ...order, supplyCost: 0 });
        }
      }

      const finalOrders = Array.from(ordersMap.values()).sort((a, b) => b.date - a.date);
      setOrders(finalOrders);

      // Save new synced ones to Firebase
      for (const order of finalOrders) {
        await setDoc(doc(db, 'siparisler', order.id), order, { merge: true });
      }

    } catch (error: any) {
      alert(`Senkronizasyon hatası: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSupplyCostChange = (orderId: string, costStr: string) => {
    const cost = parseFloat(costStr) || 0;
    // Update local state immediately for fast UI
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, supplyCost: cost } : o));
  };

  const handleSupplyCostBlur = async (orderId: string) => {
    const updatedOrder = orders.find(o => o.id === orderId);
    if (updatedOrder) {
      try {
        await setDoc(doc(db, 'siparisler', orderId), updatedOrder, { merge: true });
      } catch (error) {
        console.error("Error saving supply cost", error);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!settings?.geminiApiKey) {
      alert('Lütfen ayarlardan Gemini API Key girin.');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const response = await fetch('/api/analiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: orders.map(o => ({
            id: o.id,
            productName: o.productName,
            salePrice: o.salePrice,
            commission: o.commission,
            shippingCost: o.shippingCost,
            supplyCost: o.supplyCost,
            netProfit: o.salePrice - o.commission - o.shippingCost - o.supplyCost
          })),
          geminiApiKey: settings.geminiApiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bilinmeyen Hata');
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (error: any) {
      alert(`Analiz hatası: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Filtering
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterStartDate && o.date < new Date(filterStartDate).getTime()) return false;
      if (filterEndDate && o.date > new Date(filterEndDate).getTime() + 86400000) return false;
      return true;
    }).sort((a, b) => b.date - a.date);
  }, [orders, filterStartDate, filterEndDate]);

  // Calculations
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalDeductions = 0;
    let totalNetProfit = 0;
    let totalCommission = 0;
    let totalShipping = 0;
    let totalSupplyCost = 0;
    let revenueWithCost = 0;
    let grossProfit = 0;
    let returnCount = 0;
    let returnCost = 0;
    let saleCount = 0;

    filteredOrders.forEach(o => {
      const deductions = o.commission + o.shippingCost;
      totalDeductions += deductions;
      totalCommission += o.commission;
      totalShipping += o.shippingCost;
      totalSupplyCost += o.supplyCost;
      
      if (!o.isReturn) {
        saleCount++;
        totalRevenue += o.salePrice;
        if (o.supplyCost > 0) {
          revenueWithCost += o.salePrice;
        }
        totalNetProfit += (o.salePrice - deductions - o.supplyCost);
        grossProfit += (o.salePrice - deductions);
      } else {
        returnCount++;
        returnCost += (deductions + o.supplyCost);
        totalNetProfit -= (deductions + o.supplyCost);
      }
    });

    return { 
      totalRevenue, totalDeductions, totalNetProfit, 
      totalCommission, totalShipping, totalSupplyCost,
      revenueWithCost, grossProfit, returnCount, returnCost, saleCount
    };
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    return filteredOrders.slice(0, 10).map(o => {
      const deductions = o.commission + o.shippingCost;
      const netProfit = o.isReturn ? -(deductions + o.supplyCost) : (o.salePrice - deductions - o.supplyCost);
      return {
        name: o.id.slice(-6),
        Ciro: o.isReturn ? 0 : o.salePrice,
        Kesintiler: deductions,
        NetKâr: netProfit
      };
    }).reverse();
  }, [filteredOrders]);


  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Finans Masası</h2>
          <p className="text-zinc-500 mt-1">Trendyol siparişlerinizi ve net kârlılığınızı analiz edin.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-[#111111] border border-white/10 rounded-xl px-3 py-2 ">
            <Calendar className="w-4 h-4 text-zinc-600" />
            <input 
              type="date" 
              value={syncStartDate} 
              onChange={e => setSyncStartDate(e.target.value)} 
              className="text-sm font-medium outline-none text-zinc-300 bg-transparent w-[110px]"
              title="Senkronizasyon Başlangıç Tarihi"
            />
            <span className="text-slate-300">-</span>
            <input 
              type="date" 
              value={syncEndDate} 
              onChange={e => setSyncEndDate(e.target.value)} 
              className="text-sm font-medium outline-none text-zinc-300 bg-transparent w-[110px]"
              title="Senkronizasyon Bitiş Tarihi"
            />
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-sm font-medium text-zinc-300 hover:bg-black hover:text-indigo-400 transition-all disabled:opacity-50  hover:shadow"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Çekiliyor...' : 'Senkronize Et'}
          </button>
        </div>
      </div>

      {/* Metrics & Chart Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-6">
        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  relative overflow-hidden group">
          <div className="text-sm font-medium text-zinc-500 mb-2 relative z-10">Toplam Ciro</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight relative z-10">
            ₺{metrics.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  relative overflow-hidden group">
          <div className="text-sm font-medium text-zinc-500 mb-2 relative z-10">Maliyeti Olan Ciro</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight relative z-10">
            ₺{metrics.revenueWithCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  relative overflow-hidden group">
          <div className="text-sm font-medium text-zinc-500 mb-2 relative z-10">Brüt Kâr Tutarı</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight relative z-10">
            ₺{metrics.grossProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  relative overflow-hidden group">
          <div className="text-sm font-medium text-zinc-500 mb-2 relative z-10">Net Kâr</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight relative z-10">
            ₺{metrics.totalNetProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  relative overflow-hidden group">
          <div className="text-sm font-medium text-zinc-500 mb-2 relative z-10">Net Kâr / Satış Fiyatı Oranı</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight relative z-10">
            {metrics.totalRevenue > 0 ? ((metrics.totalNetProfit / metrics.totalRevenue) * 100).toFixed(2) : '0.00'}%
          </div>
        </div>

        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  relative overflow-hidden group">
          <div className="text-sm font-medium text-zinc-500 mb-2 relative z-10">Net Kâr / Ürün Maliyeti Oranı</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight relative z-10">
            {metrics.totalSupplyCost > 0 ? ((metrics.totalNetProfit / metrics.totalSupplyCost) * 100).toFixed(2) : '0.00'}%
          </div>
        </div>
      </div>

      {/* Masraf Kalemleri & Chart */}
      <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  flex flex-col items-center">
        <h3 className="text-xl font-bold text-zinc-100 mb-8 self-center">Masraf Kalemleri (₺)</h3>
        
        <div className="flex flex-col lg:flex-row items-center w-full gap-12 lg:gap-24 justify-center">
          {/* Pie Chart */}
          <div className="w-[300px] h-[300px] relative flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Ürün Maliyeti', value: metrics.totalSupplyCost, color: '#f97316' },
                    { name: 'Komisyon', value: metrics.totalCommission, color: '#0ea5e9' },
                    { name: 'Kargo', value: metrics.totalShipping, color: '#22c55e' },
                  ]}
                  innerRadius={90}
                  outerRadius={130}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {
                    [
                      { name: 'Ürün Maliyeti', value: metrics.totalSupplyCost, color: '#f97316' },
                      { name: 'Komisyon', value: metrics.totalCommission, color: '#0ea5e9' },
                      { name: 'Kargo', value: metrics.totalShipping, color: '#22c55e' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  }
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 500 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-sm font-semibold text-zinc-500">Toplam Maliyet</span>
              <span className="text-2xl font-bold text-white mt-1">
                ₺{(metrics.totalSupplyCost + metrics.totalCommission + metrics.totalShipping).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-y-10 gap-x-12 relative">
            <div className="flex flex-col relative pl-5">
              <div className="w-2 h-8 rounded-full bg-orange-500 absolute left-0 top-0"></div>
              <span className="text-sm font-medium text-zinc-500 mb-1">Toplam Ürün Maliyeti</span>
              <span className="text-xl font-bold text-white">₺{metrics.totalSupplyCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex flex-col relative pl-5">
              <div className="w-2 h-8 rounded-full bg-sky-500 absolute left-0 top-0"></div>
              <span className="text-sm font-medium text-zinc-500 mb-1">Toplam Komisyon</span>
              <span className="text-xl font-bold text-white">₺{metrics.totalCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex flex-col relative pl-5">
              <div className="w-2 h-8 rounded-full bg-green-500 absolute left-0 top-0"></div>
              <span className="text-sm font-medium text-zinc-500 mb-1">Toplam Kargo Ücreti</span>
              <span className="text-xl font-bold text-white">₺{metrics.totalShipping.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex flex-col relative pl-5">
              <div className="w-2 h-8 rounded-full bg-slate-300 absolute left-0 top-0"></div>
              <span className="text-sm font-medium text-zinc-500 mb-1">Toplam Hizmet Bedeli</span>
              <span className="text-xl font-bold text-white">₺0,00</span>
            </div>
            
            <div className="flex flex-col relative pl-5">
              <div className="w-2 h-8 rounded-full bg-red-500 absolute left-0 top-0"></div>
              <span className="text-sm font-medium text-zinc-500 mb-1">Toplam Stopaj Kesintisi</span>
              <span className="text-xl font-bold text-white">₺0,00</span>
            </div>
            
            <div className="flex flex-col relative pl-5">
              <div className="w-2 h-8 rounded-full bg-slate-400 absolute left-0 top-0"></div>
              <span className="text-sm font-medium text-zinc-500 mb-1">Toplam Net Kdv</span>
              <span className="text-xl font-bold text-white">₺0,00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kâr Performansı ve Net Kâr Performansı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Kâr Performansı Line Chart */}
        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Kâr Performansı (Son 10 Sipariş)</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNetKar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 500 }}
                />
                <Area type="monotone" dataKey="NetKâr" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNetKar)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ürün & Sipariş Metrikleri */}
        <div className="space-y-6">
           <div className="bg-[#111111] p-6 rounded-2xl border border-white/10 ">
              <h3 className="text-lg font-bold text-zinc-100 mb-4">Ürün Metrikleri</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
                  <span className="text-zinc-500 text-sm">Net Satış adedi</span>
                  <span className="font-bold text-zinc-100">{metrics.saleCount} adet</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
                  <span className="text-zinc-500 text-sm">Ürün başına satış tutarı</span>
                  <span className="font-bold text-zinc-100">₺{metrics.saleCount > 0 ? (metrics.totalRevenue / metrics.saleCount).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
                  <span className="text-zinc-500 text-sm">Ürün başına ortalama kâr</span>
                  <span className="font-bold text-zinc-100">₺{metrics.saleCount > 0 ? (metrics.totalNetProfit / metrics.saleCount).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
                  <span className="text-zinc-500 text-sm">Ortalama komisyon oranı</span>
                  <span className="font-bold text-zinc-100">{metrics.totalRevenue > 0 ? ((metrics.totalCommission / metrics.totalRevenue) * 100).toFixed(2) : '0.00'}%</span>
                </div>
              </div>
           </div>

           <div className="bg-[#111111] p-6 rounded-2xl border border-white/10 ">
              <h3 className="text-lg font-bold text-zinc-100 mb-4">Sipariş Metrikleri</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
                  <span className="text-zinc-500 text-sm">Sipariş sayısı</span>
                  <span className="font-bold text-zinc-100">{metrics.saleCount} adet</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
                  <span className="text-zinc-500 text-sm">Sipariş başına satış tutarı</span>
                  <span className="font-bold text-zinc-100">₺{metrics.saleCount > 0 ? (metrics.totalRevenue / metrics.saleCount).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
                  <span className="text-zinc-500 text-sm">Sipariş başına ortalama kargo maliyeti</span>
                  <span className="font-bold text-zinc-100">₺{metrics.saleCount > 0 ? (metrics.totalShipping / metrics.saleCount).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}</span>
                </div>
              </div>
           </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Kâr Performansı Funnel */}
        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10  flex flex-col items-center">
           <h3 className="text-lg font-bold text-zinc-100 mb-6 w-full text-left">Net Kâr Performansı</h3>
           
           <div className="flex flex-col items-center w-full max-w-sm mt-4 relative overflow-visible pr-32">
             <div className="w-full bg-[#52c41a] h-16 flex items-center justify-center text-white font-bold relative z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
               <div className="absolute right-[-150px] text-zinc-100 text-sm flex flex-col items-start bg-transparent z-20">
                 <span className="text-zinc-500 text-[11px] whitespace-nowrap">Ciro</span>
                 <span className="font-bold text-sm">₺{metrics.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
               </div>
             </div>
             
             <div className="w-[90%] bg-[#73d13d] h-16 flex items-center justify-center text-white font-bold relative z-10 mt-1" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
               <div className="absolute right-[-170px] text-zinc-100 text-sm flex flex-col items-start bg-transparent z-20">
                 <span className="text-zinc-500 text-[11px] whitespace-nowrap">Kargo ücreti düşülmüş tutar</span>
                 <span className="font-bold text-sm">₺{(metrics.totalRevenue - metrics.totalShipping).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
               </div>
             </div>
             
             <div className="w-[81%] bg-[#95de64] h-16 flex items-center justify-center text-white font-bold relative z-10 mt-1" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
               <div className="absolute right-[-190px] text-zinc-100 text-sm flex flex-col items-start bg-transparent z-20">
                 <span className="text-zinc-500 text-[11px] whitespace-nowrap">Pazaryeri masrafı düşülmüş</span>
                 <span className="font-bold text-sm">₺{(metrics.totalRevenue - metrics.totalShipping - metrics.totalCommission).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
               </div>
             </div>
             
             <div className="w-[73%] bg-[#ff7875] h-12 flex items-center justify-center text-white font-bold relative z-10 mt-1" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
               <div className="absolute right-[-210px] text-zinc-100 text-sm flex flex-col items-start bg-transparent z-20">
                 <span className="text-zinc-500 text-[11px] whitespace-nowrap">Ürün Maliyeti Düşülmüş (Kâr)</span>
                 <span className="font-bold text-sm">₺{metrics.totalNetProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
               </div>
             </div>
             
             <div className="w-[66%] bg-[#ff4d4f] h-12 flex items-center justify-center text-white font-bold relative z-10 mt-1" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
             </div>
           </div>
        </div>
        
        {/* İade Metrikleri */}
        <div className="bg-[#111111] p-6 rounded-2xl border border-white/10 ">
           <h3 className="text-lg font-bold text-zinc-100 mb-4">İade Metrikleri</h3>
           <div className="space-y-3">
             <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
               <span className="text-zinc-500 text-sm">İade oranı</span>
               <span className="font-bold text-zinc-100">
                 {(metrics.saleCount + metrics.returnCount) > 0 ? ((metrics.returnCount / (metrics.saleCount + metrics.returnCount)) * 100).toFixed(2) : '0.00'}%
               </span>
             </div>
             <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
               <span className="text-zinc-500 text-sm">Toplam iade maliyeti</span>
               <span className="font-bold text-zinc-100">₺{metrics.returnCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
             </div>
             <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
               <span className="text-zinc-500 text-sm">İade kargo zararı</span>
               <span className="font-bold text-zinc-100">₺{metrics.returnCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
             </div>
             <div className="flex justify-between border-b border-white/10 pb-2 border-dashed">
               <span className="text-zinc-500 text-sm">Yurt dışı operasyon bedeli</span>
               <span className="font-bold text-zinc-100">₺0,00</span>
             </div>
           </div>
        </div>
      </div>

      {/* AI Analysis Prompt Button */}
      <div className="flex justify-end">
        <button
          onClick={handleAnalyze}
          disabled={analyzing || filteredOrders.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50  hover: hover:shadow-indigo-600/20"
        >
          <Sparkles className="w-5 h-5" />
          {analyzing ? 'Analiz Ediliyor...' : 'Yapay Zeka ile Karlılık Analizi Yap'}
        </button>
      </div>

      {/* AI Analysis Result */}
      {analysisResult && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 p-8 rounded-2xl ">
          <div className="flex items-center gap-3 text-indigo-200 font-bold text-lg mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/50 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            Yapay Zeka Finansal Analizi
          </div>
          <div className="text-zinc-300 prose prose-indigo max-w-none prose-p:leading-relaxed prose-headings:text-white">
            <ReactMarkdown>{analysisResult}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[#111111] rounded-2xl border border-white/10  overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h3 className="text-lg font-semibold text-white">İşlem Geçmişi <span className="text-zinc-600 text-sm font-normal ml-2">({filteredOrders.length} kayıt)</span></h3>
          
          <div className="flex items-center gap-2 bg-black border border-white/10 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-zinc-600" />
            <input 
              type="date" 
              value={filterStartDate} 
              onChange={e => setFilterStartDate(e.target.value)} 
              className="text-sm font-medium outline-none text-zinc-300 bg-transparent w-[110px]"
              title="Başlangıç Tarihi"
            />
            <span className="text-slate-300">-</span>
            <input 
              type="date" 
              value={filterEndDate} 
              onChange={e => setFilterEndDate(e.target.value)} 
              className="text-sm font-medium outline-none text-zinc-300 bg-transparent w-[110px]"
              title="Bitiş Tarihi"
            />
            {(filterStartDate || filterEndDate) && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="ml-2 px-2 py-1 bg-[#111111] border border-white/10 rounded text-xs font-medium text-zinc-400 hover:text-indigo-400 hover:border-indigo-200 transition-colors"
              >
                Temizle
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-zinc-500 font-medium">
                <th className="px-6 py-2 pb-3">Sipariş No</th>
                <th className="px-6 py-2 pb-3">Tarih</th>
                <th className="px-6 py-2 pb-3">Ürün</th>
                <th className="px-6 py-2 pb-3 text-right">Satış Fiyatı</th>
                <th className="px-6 py-2 pb-3 text-right text-rose-500">Kesintiler</th>
                <th className="px-6 py-2 pb-3 text-right text-indigo-400">Maliyet</th>
                <th className="px-6 py-2 pb-3 text-right">Net Kâr</th>
              </tr>
            </thead>
            <tbody className="">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 bg-white/5 rounded-xl">
                    Kayıt bulunamadı. Filtreyi temizleyin veya senkronize edin.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const deductions = order.commission + order.shippingCost;
                  const netProfit = order.isReturn ? -(deductions + order.supplyCost) : (order.salePrice - deductions - order.supplyCost);
                  const margin = order.salePrice > 0 && !order.isReturn ? (netProfit / order.salePrice) * 100 : 0;
                  const isLoss = netProfit < 0;
                  const isLowMargin = margin < 15 && margin >= 0;

                  return (
                    <tr key={order.id} className="group bg-[#111111] hover:bg-white/5 transition-colors  ring-1 ring-white/10 rounded-xl">
                      <td className="px-6 py-4 font-mono text-zinc-500 rounded-l-xl border-y border-l border-white/5 bg-[#111111] group-hover:bg-white/5 transition-colors">{order.id}</td>
                      <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap border-y border-white/5 bg-[#111111] group-hover:bg-white/5 transition-colors">
                        {new Date(order.date).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-white border-y border-white/5 bg-[#111111] group-hover:bg-white/5 transition-colors max-w-[200px] truncate" title={order.productName}>
                        <div className="flex flex-col items-start gap-1">
                          <span>{order.productName}</span>
                          {order.isReturn && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950/50 text-rose-400">İade Edildi</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-300 border-y border-white/5 bg-[#111111] group-hover:bg-white/5 transition-colors">₺{order.salePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right text-rose-500 font-medium border-y border-white/5 bg-[#111111] group-hover:bg-white/5 transition-colors">
                        <div className="flex flex-col items-end">
                          <span>-₺{deductions.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 font-semibold ${order.isExact ? 'bg-emerald-950/50 text-emerald-400' : 'bg-amber-950/50 text-amber-400'}`} title={order.isExact ? "Kesinleşmiş Finansal Kesinti" : "Tahmini Barem Kesintisi"}>
                            {order.isExact ? "Kesin" : "Tahmini"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 bg-[#111111] group-hover:bg-white/5 transition-colors text-right">
                        <div className="relative flex items-center justify-end">
                          <span className="text-zinc-600 absolute left-3 mr-2 font-medium">₺</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={order.supplyCost || ''}
                            onChange={(e) => handleSupplyCostChange(order.id, e.target.value)}
                            onBlur={() => handleSupplyCostBlur(order.id)}
                            className="block w-28 pl-7 pr-3 py-2 bg-black hover:bg-zinc-900 border border-white/5 rounded-lg text-right font-medium text-white focus:bg-[#111111] focus:ring-2 focus:ring-[#ff7a59]/30 focus:border-[#ff7a59] outline-none transition-all placeholder-zinc-700"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 rounded-r-xl border-y border-r border-white/5 bg-[#111111] group-hover:bg-white/5 transition-colors text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-base ${isLoss ? 'text-rose-600' : 'text-emerald-500'}`}>
                            ₺{netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] mt-0.5 font-medium">
                            {isLoss && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                            {isLowMargin && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                            <span className={
                              isLoss ? 'text-rose-500' : 
                              isLowMargin ? 'text-orange-500' : 'text-zinc-600'
                            }>
                              %{margin.toFixed(1)} Marj
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
