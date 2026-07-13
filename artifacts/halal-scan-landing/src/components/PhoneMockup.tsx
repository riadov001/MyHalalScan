import { motion } from 'framer-motion';

export function PhoneMockup({ status = 'scan' }: { status?: 'scan' | 'halal' | 'haram' | 'doubt' }) {
  return (
    <div className="relative w-[280px] h-[580px] rounded-[3rem] border-[8px] border-[#192C20] bg-[#0C1912] shadow-2xl shadow-black/80 overflow-hidden flex flex-col items-center">
      {/* Notch */}
      <div className="absolute top-0 w-[100px] h-[24px] bg-[#192C20] rounded-b-2xl z-20" />

      {/* App Header */}
      <div className="w-full h-24 bg-[#060D09] pt-10 px-5 flex items-center justify-between z-10 relative shadow-sm shadow-[#192C20]/50 border-b border-[#192C20]">
        <div className="flex items-center gap-2">
          <img src={import.meta.env.BASE_URL + "icon.png"} alt="HalalScan" className="w-7 h-7 rounded-md" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMUFBRjVBIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMyIgeT0iMyIgcng9IjIiLz48L3N2Zz4=' }} />
          <span className="font-bold text-[15px] tracking-tight">
            <span className="text-[#1AAF5A]">Halal</span>
            <span className="text-[#C8963C]">Scan</span>
          </span>
        </div>
        <div className="w-7 h-7 rounded-full bg-[#0C1912] border border-[#192C20] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#9AB5A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full relative bg-[#060D09] p-4 flex flex-col gap-4">
        {status === 'scan' && (
          <div className="w-full flex-1 rounded-2xl bg-[#0C1912] border border-[#192C20] overflow-hidden relative flex flex-col justify-center items-center">
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_#C8963C_0%,_transparent_70%)]" />
             
             {/* Scan Brackets */}
             <motion.div 
               animate={{ scale: [1, 1.03, 1], opacity: [0.6, 1, 0.6] }}
               transition={{ repeat: Infinity, duration: 2.5 }}
               className="relative w-44 h-44"
             >
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#C8963C] rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#C8963C] rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#C8963C] rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#C8963C] rounded-br-xl" />
                
                {/* Scan line */}
                <motion.div 
                  animate={{ y: [0, 176, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C8963C] to-transparent shadow-[0_0_12px_#C8963C]"
                />
             </motion.div>
             <div className="mt-10 text-center text-[#9AB5A5] text-sm font-medium">Alignez le code-barres</div>
          </div>
        )}

        {status === 'halal' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full flex flex-col gap-3">
            <div className="h-44 w-full rounded-2xl bg-[#0C1912] border border-[#1AAF5A]/40 overflow-hidden relative flex flex-col items-center justify-center p-6 text-center shadow-[0_0_20px_rgba(26,175,90,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#1AAF5A]/10 to-transparent" />
              <div className="w-14 h-14 rounded-full bg-[#1AAF5A]/20 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-[#1AAF5A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold text-[#EEF4F0]">Produit Halal</h3>
              <p className="text-[#9AB5A5] text-[11px] mt-1">Aucun ingrédient illicite détecté</p>
            </div>
            
            <div className="p-3.5 rounded-2xl bg-[#0C1912] border border-[#192C20]">
              <div className="text-[10px] font-bold text-[#567060] mb-1.5 tracking-wider">PRODUIT</div>
              <div className="font-semibold text-[#EEF4F0] text-sm">Lait d'Amande Bio</div>
              <div className="text-[11px] text-[#9AB5A5]">Alpro • 1L</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0C1912] border border-[#192C20] flex-1">
               <div className="text-[10px] font-bold text-[#567060] mb-2.5 tracking-wider">INGRÉDIENTS (3)</div>
               <div className="flex flex-col gap-2.5">
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-[#9AB5A5]">Eau</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-[#1AAF5A]" />
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-[#9AB5A5]">Amandes (2%)</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-[#1AAF5A]" />
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-[#9AB5A5]">Gomme de caroube</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-[#1AAF5A]" />
                 </div>
               </div>
            </div>
          </motion.div>
        )}

        {status === 'haram' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full flex flex-col gap-3">
            <div className="h-44 w-full rounded-2xl bg-[#0C1912] border border-[#DC3545]/40 overflow-hidden relative flex flex-col items-center justify-center p-6 text-center shadow-[0_0_20px_rgba(220,53,69,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#DC3545]/10 to-transparent" />
              <div className="w-14 h-14 rounded-full bg-[#DC3545]/20 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 className="text-xl font-bold text-[#EEF4F0]">Non Halal</h3>
              <p className="text-[#9AB5A5] text-[11px] mt-1">Contient des ingrédients illicites</p>
            </div>
            
            <div className="p-3.5 rounded-2xl bg-[#0C1912] border border-[#192C20]">
              <div className="text-[10px] font-bold text-[#567060] mb-1.5 tracking-wider">PRODUIT</div>
              <div className="font-semibold text-[#EEF4F0] text-sm">Bonbons Gélifiés</div>
              <div className="text-[11px] text-[#9AB5A5]">Haribo • 100g</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0C1912] border border-[#192C20] flex-1">
               <div className="text-[10px] font-bold text-[#DC3545] mb-2.5 tracking-wider">INGRÉDIENTS ILLICITES (1)</div>
               <div className="flex flex-col gap-1.5">
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-[#EEF4F0] font-semibold">Gélatine (E441)</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-[#DC3545]" />
                 </div>
                 <p className="text-[10px] text-[#9AB5A5] leading-relaxed">Origine animale non certifiée (porc ou bœuf non abattu rituellement).</p>
               </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tab bar */}
      <div className="w-full h-[68px] bg-[#0C1912] border-t border-[#192C20] flex items-center justify-around px-4 pb-3 pt-2 z-10 relative">
        <div className="flex flex-col items-center gap-1.5">
          <svg className="w-5 h-5 text-[#C8963C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          <span className="text-[10px] font-medium text-[#C8963C]">Scan</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 opacity-50">
          <svg className="w-5 h-5 text-[#9AB5A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[10px] font-medium text-[#9AB5A5]">Historique</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 opacity-50">
          <svg className="w-5 h-5 text-[#9AB5A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-medium text-[#9AB5A5]">Profil</span>
        </div>
      </div>
    </div>
  )
}
