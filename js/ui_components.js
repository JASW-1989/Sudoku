/**
 * js/ui_components.js - v1.8 (功能補全版)
 * 增加 VictoryScreen, GuideModal, 並強化 MiracleBar 效果
 */
const e = React.createElement;

// --- 1. 神蹟系統 (強化法力過載視覺) ---
export const MiracleBar = ({ mana, onTrigger, visible }) => {
    if (!visible) return null;
    const skills = [
        { id: 'FREEZE', icon: '❄️', cost: 1200, label: '時停冰封' },
        { id: 'OVERLOAD', icon: '⚡', cost: 2000, label: '法力過載' }
    ];
    return e('div', { className: "absolute top-32 right-6 flex flex-col gap-3 pointer-events-auto" },
        skills.map(s => e('button', {
            key: s.id,
            onClick: () => mana >= s.cost && onTrigger && onTrigger(s.id),
            className: `glass-ui p-2 px-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${mana >= s.cost ? 'opacity-100 hover:scale-105 active:scale-95' : 'opacity-30 grayscale cursor-not-allowed'}`,
            style: { borderColor: mana >= s.cost ? '#b58900' : '#8b795e20', minWidth: '70px' }
        },
            e('span', { className: "text-2xl" }, s.icon),
            e('p', { className: "text-[9px] font-black uppercase" }, s.label),
            e('p', { className: "text-[10px] font-game font-black text-[#b58900]" }, `${s.cost}`)
        ))
    );
};

// --- 2. 勝利慶祝畫面 ---
export const VictoryScreen = ({ onRestart, visible }) => {
    if (!visible) return null;
    return e('div', { className: "absolute inset-0 bg-white/90 backdrop-blur-xl z-[1000] flex flex-col items-center justify-center p-10 text-center animate-in fade-in" },
        e('div', { className: "mb-8 animate-bounce" }, e('span', { className: "text-9xl" }, "🏆")),
        e('h1', { className: "text-7xl font-black italic text-[#8b795e] uppercase tracking-tighter mb-4" }, "MISSION_COMPLETE"),
        e('p', { className: "text-xl font-bold text-[#b58900] mb-12 tracking-widest" }, "聖域守護協定已達成：魔王軍已徹底退卻"),
        e('button', { 
            onClick: onRestart, 
            className: "bg-[#8b795e] text-white px-16 py-6 rounded-full font-black text-2xl shadow-2xl active:scale-95 transition-all hover:brightness-110" 
        }, "重啟榮耀 ⚔️")
    );
};

// --- 3. 遊戲說明彈窗 ---
export const GuideModal = ({ res, onClose, visible }) => {
    if (!visible) return null;
    return e('div', { className: "absolute inset-0 bg-[#4a423890] backdrop-blur-md z-[800] flex items-center justify-center p-6" },
        e('div', { className: "glass-ui p-8 rounded-[3rem] w-full max-w-[450px] border-[#8b795e30] shadow-3xl animate-in zoom-in" },
            e('h2', { className: "text-2xl font-black mb-6 text-[#8b795e] italic underline" }, res.locale.guide.title),
            e('div', { className: "space-y-4 mb-10" },
                res.locale.guide.items.map((item, i) => e('p', { key: i, className: "text-sm font-bold leading-relaxed text-[#4a4238]" }, item)),
                e('p', { className: "text-xs italic opacity-60 mt-6" }, res.locale.story.content)
            ),
            e('button', { 
                onClick: onClose, 
                className: "w-full bg-[#8b795e] text-white py-4 rounded-2xl font-black active:scale-95" 
            }, res.locale.story.btn_close)
        )
    );
};

// --- 4. 主選單 (補回導覽鈕) ---
export const MenuScreen = ({ res, onStart, onOpenGuide, visible }) => {
    if (!visible) return null;
    return e('div', { className: "absolute inset-0 bg-[#fdfaf5] flex flex-col items-center justify-center z-[600] animate-in fade-in" },
        e('div', { className: "mb-10 text-center hero-float" }, 
            e('h1', { className: "text-8xl font-black italic text-[#4a4238] uppercase leading-none font-serif tracking-tighter" }, "GODDESS"), 
            e('h2', { className: "text-xl font-black tracking-[1em] text-[#b58900] mt-2 pl-4 italic uppercase" }, "Defense")
        ),
        e('div', { className: "flex flex-col gap-4 w-full max-w-[320px]" },
            e('button', { onClick: onStart, className: "w-full bg-[#8b795e] py-7 rounded-[2rem] font-black text-3xl text-white shadow-2xl active:scale-95 uppercase tracking-[0.2em]" }, "召喚出征"),
            e('button', { onClick: onOpenGuide, className: "w-full border-2 border-[#8b795e40] py-3 rounded-full font-black text-sm text-[#8b795e] hover:bg-[#8b795e05]" }, "戰役指南")
        ),
        e('div', { className: "mt-24 opacity-20 font-game text-[8px] tracking-[0.6em] uppercase" }, "STABLE_V25.4_FINAL")
    );
};

// ... HUD, CommandDeck, UpgradePanel, DeployOverlay 保持 v1.7 邏輯 ...
export const HUD = ({ stats, onTriggerNext, castleHit, res, visible, onOpenGuide }) => {
    if (!visible) return null;
    return e('div', { className: "absolute top-0 inset-x-0 p-4 md:p-6 flex justify-between items-start z-[150] pointer-events-none" },
        e('div', { className: "flex flex-col gap-2 pointer-events-auto" },
            e('div', { className: "glass-ui p-2 px-4 rounded-xl flex items-center gap-4 shadow-xl" },
                e('div', { className: "text-left" },
                    e('span', { className: "text-[9px] opacity-60 uppercase font-black" }, res.locale.ui.phase_label),
                    e('h1', { className: "text-xl font-black font-game italic text-[#4a4238]" }, `P-${stats.wave}`)
                ),
                e('div', { className: "flex flex-col items-center border-l border-[#8b795e20] pl-4" },
                    e('button', { onClick: onTriggerNext, className: "bg-[#b58900] text-white text-[9px] px-2 py-1 rounded-lg font-black uppercase shadow-md active:scale-95" }, "Next"),
                    e('span', { className: `text-[10px] font-game ${stats.timer <= 5 ? 'text-red-500 font-bold animate-pulse' : 'opacity-40'}` }, `${stats.timer}S`)
                )
            ),
            e('div', { className: "flex gap-2" },
                [1, 1.5, 2].map(s => e('button', {
                    key: s, onClick: () => stats.setSpeed(s),
                    className: `px-3 py-1 rounded-lg text-[10px] font-black border transition-all ${stats.speed === s ? 'bg-[#8b795e] text-white' : 'bg-white/60 text-[#8b795e]'}`
                }, `${s}X`)),
                e('button', { onClick: onOpenGuide, className: "glass-ui px-3 py-1 rounded-lg text-[10px] font-black opacity-60" }, "?")
            )
        ),
        e('div', { className: "flex gap-2 pointer-events-auto items-center" },
            e('div', { className: "glass-ui p-2 px-4 rounded-xl shadow-lg text-[#b58900] font-black text-sm" }, `💎 ${stats.mana}`),
            e('div', { className: `glass-ui p-2 px-4 rounded-xl shadow-lg font-black text-sm ${castleHit ? 'bg-red-500 text-white animate-pulse' : 'text-red-600'}` }, `❤️ ${stats.hp}`)
        )
    );
};

export const DeployOverlay = ({ onExecute, visible }) => {
    if (!visible) return null;
    return e('div', { className: "absolute bottom-40 left-1/2 -translate-x-1/2 z-[300] animate-bounce" },
        e('button', { onClick: onExecute, className: "bg-[#556b2f] px-12 py-4 rounded-full text-xl font-black text-white shadow-2xl border border-white/20 uppercase tracking-widest active:scale-95" }, "執行部署 ⚔️")
    );
};

export const CommandDeck = ({ ui, setUI, mana, res, visible }) => {
    if (!visible) return null;
    return e('div', { className: `fixed bottom-0 inset-x-0 z-[200] deck-transition pointer-events-none ${ui.deckOpen ? 'translate-y-0' : 'translate-y-[85%]'}` },
        e('div', { className: "flex justify-center mb-[-8px] pointer-events-auto" },
            e('button', { onClick: () => setUI(p => ({...p, deckOpen: !p.deckOpen})), className: "glass-ui px-8 py-2 rounded-t-2xl flex items-center gap-3 text-[#4a4238] font-game text-[9px] font-black shadow-xl" },
                e('div', { className: `w-2 h-2 rounded-full ${ui.deckOpen ? 'bg-[#b58900]' : 'bg-[#556b2f] animate-pulse'}` }), ui.deckOpen ? 'HIDE' : 'DECK')
        ),
        e('div', { className: "glass-ui p-3 border-t border-[#8b795e20] pointer-events-auto h-[130px] relative shadow-[0_-30px_100px_rgba(0,0,0,0.05)]" },
            ui.selected && res.units[ui.selected] && e('div', { className: "detail-panel glass-ui p-3 rounded-2xl flex justify-between items-center border border-[#b5890040] shadow-xl" },
                e('div', { className: "flex-1 text-left" },
                    e('div', { className: "flex items-center gap-3" },
                        e('p', { className: "text-lg font-black text-[#b58900] italic" }, res.units[ui.selected].name),
                        e('span', { className: "text-[8px] px-2 py-0.5 bg-[#b5890015] text-[#b58900] rounded-full uppercase" }, res.units[ui.selected].type)
                    ),
                    e('p', { className: "text-[10px] opacity-70 italic text-[#4a4238] line-clamp-1" }, res.units[ui.selected].desc)
                ),
                e('button', { onClick: () => setUI(p=>({...p, selected:null})), className: "ml-4 w-10 h-10 flex items-center justify-center bg-[#8b795e10] rounded-full text-xl" }, "✕")
            ),
            e('div', { className: "flex overflow-x-auto gap-4 px-4 no-scrollbar items-center justify-center h-24" },
                Object.entries(res.units).map(([key, info]) => e('button', {
                    key: key, onClick: () => setUI(p => ({...p, selected: key, upgradeTarget: null})),
                    className: `relative p-3 min-w-[85px] rounded-3xl border-2 transition-all ${ui.selected === key ? 'bg-[#b5890015] border-[#b58900] scale-110 -translate-y-1 shadow-lg' : 'bg-white/40 border-[#8b795e10] opacity-70 hover:opacity-100'}`
                },
                    e('span', { className: "text-4xl block mb-1 drop-shadow-md" }, info.icon),
                    e('p', { className: "text-[10px] font-black text-[#b58900] leading-none" }, `💎${info.cost}`)))
            )
        )
    );
};

export const UpgradePanel = ({ target, onClose, mana, onUpgrade, onDismiss, res }) => {
    if (!target) return null;
    return e('div', { className: "absolute inset-0 bg-[#4a423880] backdrop-blur-sm z-[500] flex items-center justify-center p-4" },
        e('div', { className: "glass-ui p-6 rounded-[2.5rem] w-full max-w-[360px] max-h-[90vh] overflow-y-auto relative flex flex-col items-center border-[#b5890040] shadow-3xl" },
            e('button', { onClick: onClose, className: "absolute top-4 right-6 text-[#4a4238]/30 text-3xl font-black" }, "✕"),
            e('span', { className: "text-6xl mb-2 drop-shadow-md" }, target.icon),
            e('h3', { className: "text-2xl font-black italic font-game text-[#4a4238] uppercase" }, target.name),
            e('p', { className: "text-xs opacity-60 mb-4 italic text-center px-4" }, target.config?.desc || target.desc),
            e('div', { className: "w-full space-y-3" },
                target.level < 3 ? e('button', { onClick: () => onUpgrade(), disabled: mana < (target.config?.upgrades[target.level-1]?.cost || 9999), className: "w-full py-4 bg-[#b58900] rounded-2xl font-black text-xl text-white shadow-lg active:scale-95 disabled:opacity-40" }, `強化 💎 ${target.config?.upgrades[target.level-1]?.cost}`) :
                target.level === 3 ? e('div', { className: "grid grid-cols-2 gap-3" }, target.config.evolutions.map(evo => e('button', { key: evo.id, onClick: () => onUpgrade(evo), disabled: mana < evo.cost, className: "p-3 bg-white/50 rounded-2xl flex flex-col items-center border border-[#8b795e20] active:scale-95" }, e('span', { className: "text-3xl" }, evo.icon), e('span', { className: "text-[10px] font-black text-[#4a4238]" }, evo.name), e('span', { className: "text-[#b58900] text-[10px]" }, `💎${evo.cost}`)))) : e('div', { className: "py-4 text-[#556b2f] font-black text-sm italic tracking-widest text-center" }, "ULTIMATE_FORM"),
                e('button', { onClick: onDismiss, className: "w-full py-3 border border-red-500/30 rounded-xl font-bold text-xs text-red-500 uppercase" }, "撤回 (75% 回收)")
            )
        )
    );
};
