/**
 * js/renderer.js - 視覺渲染引擎 (v22.0)
 */
import { Utils } from './utils.js';

export const Renderer = {
    render: (ctx, canvas, engine, res, camX, ui, mouse) => {
        if (!engine || !res) return;
        const { map } = res;
        const vH = map.virtual_height || 650;
        const gS = map.grid_size || 50;
        const ds = canvas.height / vH;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save(); ctx.scale(ds, ds); ctx.translate(camX, 0);

        // 1. 地圖網格與道路
        ctx.beginPath(); ctx.strokeStyle = map.colors.grid_line; ctx.lineWidth = 1;
        for (let x = 0; x <= 2500; x += gS) { ctx.moveTo(x, 0); ctx.lineTo(x, vH); }
        for (let y = 0; y <= vH; y += gS) { ctx.moveTo(0, y); ctx.lineTo(2500, y); }
        ctx.stroke();

        ctx.beginPath(); ctx.strokeStyle = map.colors.road_stroke; ctx.lineWidth = gS * 1.25; ctx.lineJoin = "round";
        map.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // 2. 物件池特效繪製 (僅繪製 active)
        engine.effectPool.forEach(fx => {
            if (!fx.active) return;
            ctx.save();
            ctx.globalAlpha = fx.life / 15;
            ctx.beginPath();
            if (fx.type === 'fire') {
                ctx.strokeStyle = fx.color; ctx.lineWidth = 3;
                ctx.arc(fx.x, fx.y, 25 + (15 - fx.life), 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = fx.color;
                ctx.arc(fx.x, fx.y, 10 + (10 - fx.life), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // 3. 實體繪製
        engine.trees.forEach(t => { ctx.font = "34px 'Noto Sans TC'"; ctx.fillText(t.type, t.x, t.y + 12); });
        
        engine.units.forEach(u => {
            if (ui.upgradeTarget === u) {
                ctx.beginPath(); ctx.fillStyle = "rgba(139, 121, 94, 0.05)";
                ctx.arc(u.x, u.y, u.range, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "rgba(139, 121, 94, 0.3)"; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
            }
            ctx.font = "46px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(u.icon, u.x, u.y + 16);
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(u.x - 20, u.y + 24, 40, 4);
            ctx.fillStyle = "#55efc4"; ctx.fillRect(u.x - 20, u.y + 24, (u.currentHp / u.maxHp) * 40, 4);
        });

        engine.enemies.forEach(e => {
            const scale = e.data.isBoss ? (e.data.scale || 2.5) : 1;
            ctx.font = `${42 * scale}px 'Noto Sans TC'`; ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);
            const bw = 40 * scale;
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(e.x - bw / 2, e.y - (36 * scale), bw, 6);
            ctx.fillStyle = e.data.isBoss ? "#e74c3c" : "#ff4d94";
            ctx.fillRect(e.x - bw / 2, e.y - (36 * scale), (e.currentHp / e.hp) * bw, 6);
        });

        // 物件池子彈繪製
        engine.projectilePool.forEach(p => {
            if (!p.active) return;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        });

        // 4. 部署虛影
        if (ui.selected && res.units[ui.selected]) {
            const u = res.units[ui.selected];
            const rect = canvas.getBoundingClientRect();
            const sf = vH / rect.height;
            const mx = (mouse.x - rect.left) * sf - camX, my = (mouse.y - rect.top) * sf;
            const sx = Utils.snapToGrid(mx, gS), sy = Utils.snapToGrid(my, gS);
            const ok = u.type.includes('TANK') ? Utils.isOnPath(sx, sy, map.path) : !Utils.isOnPath(sx, sy, map.path);
            ctx.save(); ctx.globalAlpha = 0.5; ctx.font = "48px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(u.icon, sx, sy + 16);
            ctx.beginPath(); ctx.strokeStyle = ok ? "#8b795e" : "#d63031";
            ctx.lineWidth = 4; ctx.setLineDash([8, 4]); ctx.arc(sx, sy, u.range, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }
};
