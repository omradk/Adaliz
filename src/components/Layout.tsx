import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Settings, Activity, Menu, ChevronLeft, Undo2, ChevronDown, ChevronRight, BarChart3, Tag, Package, Bell, HandCoins, Award, ClipboardList, Target } from 'lucide-react';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [promosyonOpen, setPromosyonOpen] = useState(true);
  const [raporlarOpen, setRaporlarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-black text-white font-sans selection:bg-[#ff7a59] selection:text-white overflow-hidden">
      <aside 
        className={`${collapsed ? 'w-20' : 'w-72'} transition-all duration-300 ease-in-out bg-[#111111] border-r border-white/10 flex flex-col relative z-20  overflow-y-auto overflow-x-hidden`}
      >
        <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-24 border-b border-white/5 sticky top-0 bg-[#111111] z-10`}>
          {!collapsed && (
            <h1 className="text-xl font-bold flex items-center gap-2.5 text-white tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-[#ff7a59] flex items-center justify-center text-white  /20">
                <Activity className="w-4 h-4" strokeWidth={2.5} />
              </div>
              Trendyol<span className="text-zinc-600 font-medium">Finans</span>
            </h1>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-[#ff7a59] flex items-center justify-center text-white  /20">
              <Activity className="w-4 h-4" strokeWidth={2.5} />
            </div>
          )}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3.5 top-8 bg-[#111111] border border-white/10 text-zinc-600 hover:text-[#ff7a59] p-1.5 rounded-full  hover:shadow transition-all z-30"
          >
            {collapsed ? <Menu className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavLink
            to="/dashboard"
            title="Dashboard"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-[#ff7a59]/10 text-[#ff7a59] font-semibold' 
                  : 'text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium'
              }`
            }
          >
            <LayoutDashboard className={`w-5 h-5 transition-colors ${collapsed ? '' : 'group-hover:text-[#ff7a59]'}`} strokeWidth={2} />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          <NavLink
            to="/canli"
            title="Canlı Performans"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-[#ff7a59]/10 text-[#ff7a59] font-semibold' 
                  : 'text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium'
              }`
            }
          >
            <Activity className={`w-5 h-5 transition-colors ${collapsed ? '' : 'group-hover:text-[#ff7a59]'}`} strokeWidth={2} />
            {!collapsed && <span>Canlı Performans</span>}
          </NavLink>

          {/* Promosyon Kârlılık Analizi Dropdown */}
          <div className="pt-2">
            <button 
              onClick={() => !collapsed && setPromosyonOpen(!promosyonOpen)}
              title="Promosyon Kârlılık Analizi"
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                <BarChart3 className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
                {!collapsed && <span>Promosyon Kârlılık Analizi</span>}
              </div>
              {!collapsed && (
                promosyonOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {!collapsed && promosyonOpen && (
              <div className="ml-6 mt-1 border-l-2 border-white/10 pl-4 space-y-1 py-2">
                <NavLink to="/komisyon-tarifesi" className={({isActive}) => `block py-2 text-sm font-medium ${isActive ? 'text-[#ff7a59] bg-[#ff7a59]/10 rounded-lg px-2' : 'text-zinc-500 hover:text-[#ff7a59]'}`}>Ürün Komisyon Tarifesi</NavLink>
                <NavLink to="/plus-komisyon" className={({isActive}) => `block py-2 text-sm font-medium ${isActive ? 'text-[#ff7a59] bg-[#ff7a59]/10 rounded-lg px-2' : 'text-zinc-500 hover:text-[#ff7a59]'}`}>Plus Komisyon Tarifesi</NavLink>
                <NavLink to="/avantajli-urun" className={({isActive}) => `block py-2 text-sm font-medium ${isActive ? 'text-[#ff7a59] bg-[#ff7a59]/10 rounded-lg px-2' : 'text-zinc-500 hover:text-[#ff7a59]'}`}>Avantajlı Ürün Etiketi</NavLink>
                <NavLink to="/flash-urunler" className={({isActive}) => `block py-2 text-sm font-medium ${isActive ? 'text-[#ff7a59] bg-[#ff7a59]/10 rounded-lg px-2' : 'text-zinc-500 hover:text-[#ff7a59]'}`}>Flash Ürünler</NavLink>
                <NavLink to="/indirimler" className={({isActive}) => `block py-2 text-sm font-medium ${isActive ? 'text-[#ff7a59] bg-[#ff7a59]/10 rounded-lg px-2' : 'text-zinc-500 hover:text-[#ff7a59]'}`}>İndirimler</NavLink>
                <NavLink to="/kampanyalar" className={({isActive}) => `block py-2 text-sm font-medium ${isActive ? 'text-[#ff7a59] bg-[#ff7a59]/10 rounded-lg px-2' : 'text-zinc-500 hover:text-[#ff7a59]'}`}>Kampanyalar</NavLink>
              </div>
            )}
          </div>

          <div className="pt-1">
            <button 
              onClick={() => !collapsed && setRaporlarOpen(!raporlarOpen)}
              title="Raporlar"
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                <ClipboardList className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
                {!collapsed && <span>Raporlar</span>}
              </div>
              {!collapsed && (
                raporlarOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          <NavLink
            to="/iadeler"
            title="Kâr Marjı Listesi"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-[#ff7a59]/10 text-[#ff7a59] font-semibold' 
                  : 'text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium'
              }`
            }
          >
            <Undo2 className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
            {!collapsed && <span>İadeler / Kâr Marjı</span>}
          </NavLink>

          <NavLink
            to="/buybox"
            title="Buybox"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`
            }
          >
            <Target className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
            {!collapsed && <span>Buybox</span>}
          </NavLink>

          <NavLink
            to="/fiyatlandirma"
            title="Ürün Fiyatlandırma"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`
            }
          >
            <Tag className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
            {!collapsed && <span>Ürün Fiyatlandırma</span>}
          </NavLink>

          <NavLink
            to="/urunler"
            title="Ürün Ayarları"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`
            }
          >
            <Package className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
            {!collapsed && <span>Ürün Ayarları</span>}
          </NavLink>

          <NavLink
            to="/uyarilar"
            title="Uyarı Sayfası"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`
            }
          >
            <Bell className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
            {!collapsed && <span>Uyarı Sayfası</span>}
          </NavLink>

          <NavLink
            to="/hakedis"
            title="Hakediş & Desi Kontrolü"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`
            }
          >
            <HandCoins className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
            {!collapsed && <span>Hakediş & Desi Kontrolü</span>}
          </NavLink>

          <NavLink
            to="/ayarlar"
            title="Ayarlar"
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-[#ff7a59]/10 text-[#ff7a59] font-semibold' 
                  : 'text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium'
              }`
            }
          >
            <Settings className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
            {!collapsed && <span>Ayarlar</span>}
          </NavLink>
          
          <div className="pt-4 border-t border-white/5 mt-4">
            <button 
              title="Yenilikler"
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl transition-all duration-200 group text-zinc-400 hover:bg-black hover:text-[#ff7a59] font-medium`}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                <Award className="w-5 h-5 transition-colors group-hover:text-[#ff7a59]" strokeWidth={2} />
                {!collapsed && <span>Yenilikler</span>}
              </div>
              {!collapsed && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#050505]">
        <div className="max-w-7xl mx-auto p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
