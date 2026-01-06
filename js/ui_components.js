/**
 * js/ui_components.js - v1.0 (獨立 UI 組件模組)
 * 負責渲染 HUD、CommandDeck、UpgradePanel 與 MenuScreen
 */

const { useState } = React;

// --- 1. HUD 頂部資訊欄 ---
export const HUD = ({ stats, onTriggerNext, castleHit, res }) => (
    <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start z-[150] pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
            <div className="glass-ui p-3 px-6 rounded-2xl flex items-center gap-6 shadow-xl border border-[#8b795e20]">
                <div className="text-left leading-none">
                    <span className="text-[10px] opacity-60 uppercase font-game font-black tracking-widest leading-none mb-1">
                        {res.locale.ui.phase_label}
                    </span>
                    <h1 className="text-2xl font-black font-game mt-1 italic text-[#4a4238] leading-none">
                        P-{stats.wave}
                    </h1>
                </div>
                <div className="flex flex-col items-center border-l border-[#8b795e20] pl-6">
                    <button 
                        onClick={onTriggerNext} 
                        className="bg-[#b58900] text-white text-[10px] px-4 py-1.5 rounded-lg font-black uppercase shadow-lg active:scale-95 transition-all"
                    >
                        【強制增援】
                    </button>
                    <span className={`text-[12px] font-game mt-1 ${stats.timer <= 5 ? 'text-red-500 font-black animate-pulse' : 'opacity-40'}`}>
                        T-{stats.timer}S
                    </span>
                </div>
            </div>
            {/* 倍速控制 */}
            <div className="flex gap-2">
                {[1, 1.5, 2].map(s => (
                    <button 
                        key={s} 
                        onClick={() => stats.setSpeed(s)} 
                        className={`px-4 py-1.5 rounded-xl text-[11px] font-black border transition-all ${stats.speed === s ? 'bg-[#8b795e] text-white shadow-lg' : 'bg-white/60 text-[#8b795e]'}`}
                    >
                        {s}X
                    </button>
                ))}
            </div>
        </div>
        <div className="flex gap-4 pointer-events-auto items-center">
            <div className="glass-ui p-2 px-6 rounded-2xl flex items-center gap-3 shadow-lg font-black tracking-tighter text-[#b58900] text-2xl leading-none">
                💎 {stats.mana}
            </div>
            <div className={`glass-ui p-2 px-6 rounded-2xl flex items-center gap-3 transition-all shadow-lg font-black tracking-tighter text-2xl leading-none ${castleHit ? 'bg-red-500 text-white animate-pulse' : 'text-red-600'}`}>
                ❤️ {stats.hp}
            </div>
        </div>
    </div>
);

// --- 2. 底部伸縮卡牌欄 ---
export const CommandDeck = ({ ui, setUI, mana, res }) => (
    <div className={`fixed bottom-0 inset-x-0 z-[200] deck-transition pointer-events-none ${ui.deckOpen ? 'translate-y-0' : 'translate-y-[85%]'}`}>
        <div className="flex justify-center mb-[-10px] pointer-events-auto">
            <button 
                onClick={() => setUI(p => ({...p, deckOpen: !p.deckOpen}))} 
                className="glass-ui px-10 py-2.5 rounded-t-[2.5rem] flex items-center gap-4 text-[#4a4238] font-game text-[11px] font-black uppercase tracking-[0.4em] shadow-xl"
            >
                <div className={`w-2.5 h-2.5 rounded-full ${ui.deckOpen ? 'bg-[#b58900]' : 'bg-[#556b2f] animate-pulse'}`}></div>
                {ui.deckOpen ? 'HIDE_COMMAND' : 'SHOW_COMMAND'}
            </button>
        </div>
        <div className="glass-ui p-4 border-t border-[#8b795e20] pointer-events-auto h-[160px] flex flex-col justify-center relative">
            {ui.selected && res.units[ui.selected] && (
                <div className="detail-panel glass-ui p-5 rounded-3xl animate-slide-up flex justify-between items-center border border-[#b5890040] shadow-2xl">
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-5 leading-none font-black">
                            <p className="text-2xl text-[#b58900] italic font-game">{res.units[ui.selected].name}</p>
                            <span className="text-[10px] px-3 py-1 bg-[#b5890015] text-[#b58900] rounded-full uppercase tracking-widest border border-[#b5890020]">
                                {res.units[ui.selected].type}
                            </span>
                        </div>
                        <p className="text-xs opacity-70 italic mt-2 line-clamp-1">{res.units[ui.selected].desc}</p>
                    </div>
                    <button onClick={() => setUI(p=>({...p, selected:null}))} className="ml-10 w-12 h-12 flex items-center justify-center bg-[#8b795e10] rounded-full text-[#4a4238]/40 text-2xl hover:text-[#4a4238] transition-all">✕</button>
                </div>
            )}
            <div className="flex overflow-x-auto gap-6 px-10 no-scrollbar items-center justify-center h-full">
                {Object.entries(res.units).map(([key, info]) => (
                    <button 
                        key={key} 
                        onClick={() => setUI(p => ({...p, selected: key, upgradeTarget: null}))} 
                        className={`relative p-4 min-w-[110px] rounded-[2.5rem] border-2 transition-all duration-500 ${ui.selected === key ? 'bg-[#b5890015] border-[#b58900] scale-110 z-20 shadow-xl -translate-y-2' : 'bg-white/40 border-[#8b795e10] opacity-70 hover:opacity-100'}`}
                    >
                        <span className="text-6xl block mb-1 drop-shadow-md">{info.icon}</span>
                        <p className="text-xs font-black text-[#b58900] font-game font-black leading-none">💎 {info.cost}</p>
                        {mana < info.cost && <div className="absolute inset-0 bg-black/10 rounded-[2.5rem] backdrop-blur-[2px] flex items-center justify-center text-[10px] font-black text-red-600 uppercase tracking-tighter">Power_Low</div>}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

// --- 3. 強化面板 ---
export const UpgradePanel = ({ target, onClose, mana, onUpgrade, onDismiss, res }) => (
    <div className="absolute inset-0 bg-[#4a423870] backdrop-blur-sm z-[500] flex items-center justify-center p-6 text-center animate-in zoom-in duration-300">
        <div className="glass-ui p-10 rounded-[4rem] w-full max-w-[420px] relative flex flex-col items-center border-[#b5890030] shadow-3xl">
            <button onClick={onClose} className="absolute top-8 right-10 text-[#4a4238]/30 text-5xl hover:text-[#4a4238] transition-colors font-sans font-black">✕</button>
            <span className="text-[100px] mb-4 drop-shadow-md">{target.icon}</span>
            <h3 className="text-5xl font-black italic font-game mb-2 text-[#4a4238] tracking-tighter uppercase leading-none">{target.name}</h3>
            <p className="text-sm opacity-70 mb-10 italic leading-relaxed px-10">{target.config.desc}</p>
            <div className="w-full space-y-4">
                {target.level < 3 ? (
                    <button 
                        onClick={onUpgrade} 
                        disabled={mana < (target.config.upgrades[target.level-1]?.cost || 9999)} 
                        className="w-full py-6 bg-[#b58900] rounded-[2.5rem] font-black text-4xl text-white shadow-xl disabled:opacity-30 active:scale-95 transition-all"
                    >
                        聖遺強化 💎 {target.config.upgrades[target.level-1]?.cost}
                    </button>
                ) : target.level === 3 ? (
                    <div className="grid grid-cols-2 gap-6">
                        {target.config.evolutions && target.config.evolutions.map(evo => (
                            <button 
                                key={evo.id} 
                                onClick={() => onUpgrade(evo)} 
                                disabled={mana < evo.cost} 
                                className="p-6 bg-white/50 rounded-[3rem] flex flex-col items-center border border-[#8b795e20] hover:bg-[#b5890010] active:scale-95 transition-all font-black shadow-inner"
                            >
                                <span className="text-5xl mb-2">{evo.icon}</span>
                                <span className="text-sm font-black">{evo.name}</span>
                                <span className="text-[#b58900] font-mono italic text-sm">💎 {evo.cost}</span>
                            </button>
                        ))}
                    </div>
                ) : <div className="py-8 text-[#556b2f] font-black text-2xl italic tracking-[0.3em]">ULTIMATE_FORM_ACTIVE</div>}
                <button onClick={onDismiss} className="w-full py-5 border border-red-500/40 rounded-full font-black text-xl text-red-500 uppercase tracking-widest active:scale-95 transition-all">【撤回女神】</button>
            </div>
        </div>
    </div>
);

// --- 4. 啟動選單 ---
export const MenuScreen = ({ res, onStart }) => (
    <div className="absolute inset-0 bg-[#fdfaf5] flex flex-col items-center justify-center z-[600] animate-in fade-in duration-1000 shadow-inner">
       <div className="mb-16 text-center hero-float">
         <h1 className="text-[10rem] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-[#4a4238] to-[#4a423820] uppercase font-serif tracking-tighter leading-none">GODDESS</h1>
         <h2 className="text-2xl font-black tracking-[1.5em] text-[#b58900] mt-6 pl-10 leading-none italic uppercase leading-none">Defense Protocol</h2>
       </div>
       <button onClick={onStart} className="w-full max-w-[360px] bg-[#8b795e] py-8 rounded-[3rem] font-black text-4xl text-white shadow-2xl active:scale-95 transition-all uppercase tracking-[0.2em]">召喚出征</button>
       <div className="mt-24 opacity-20 font-game text-[10px] tracking-[1em] uppercase text-[#4a4238]">UI_MODULAR_V22.4_STABLE</div>
    </div>
);
