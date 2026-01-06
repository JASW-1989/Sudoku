/**
 * js/renderer.js - v24.1 (基準版)
 * 繪製震動、羈絆光環與跳字物件池
 */
import { Utils } from './utils.js';

export const Renderer = {
    render: (ctx, canvas, engine, res, camX, ui, mouse) => {
        if (!engine || !res) return;
        const { map } = res;
        const ds = canvas.height / (map.virtual_height || 650);
        const gS = map.grid_size || 50;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        if (engine.shakeIntensity > 1) {
            ctx.translate((Math.random()-0.5)*engine.shakeIntensity, (Math.random()-0.5)*engine.shakeIntensity);
        }

        ctx.scale(ds, ds); ctx.translate(camX, 0);

        ctx.beginPath(); ctx.strokeStyle = map.colors.grid_line; ctx.lineWidth = 1;
        for (let x = 0; x <= 2500; x += gS) { ctx.moveTo(x, 0); ctx.lineTo(x, 650); }
        for (let y = 0; y <= 650; y += gS) { ctx.moveTo(0, y); ctx.lineTo(2500, y); }
        ctx.stroke();

        ctx.beginPath(); ctx.strokeStyle = map.colors.road_stroke; ctx.lineWidth = gS * 1.25; ctx.lineJoin = "round";
        map.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        engine.effectPool.forEach(fx => {
            if (!fx.active) return;
            ctx.save(); ctx.globalAlpha = fx.life / 15; ctx.beginPath();
            if (fx.type === 'fire') {
                ctx.strokeStyle = fx.color; ctx.lineWidth = 3; ctx.arc(fx.x, fx.y, 25+(15-fx.life), 0, 7); ctx.stroke();
            } else {
                ctx.fillStyle = fx.color; ctx.arc(fx.x, fx.y, 10+(10-fx.life), 0, 7); ctx.fill();
            }
            ctx.restore();
        });

        engine.units.forEach(u => {
            if (u.synergyActive) {
                ctx.beginPath(); ctx.strokeStyle = "rgba(255, 215, 0, 0.4)"; ctx.lineWidth = 4;
                ctx.arc(u.x, u.y, 30, 0, 7); ctx.stroke();
            }
            ctx.font = "46px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(u.icon, u.x, u.y + 16);
        });

        engine.enemies.forEach(e => {
            ctx.font = "42px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);
        });

        engine.projectilePool.forEach(p => {
            if (p.active) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 7); ctx.fill(); }
        });

        engine.damagePool.forEach(dn => {
            if (!dn.active) return;
            ctx.save(); ctx.globalAlpha = dn.life / 45; ctx.fillStyle = dn.color;
            ctx.font = "bold 24px 'JetBrains Mono'"; ctx.textAlign = "center";
            ctx.fillText(dn.value, dn.x, dn.y); ctx.restore();
        });

        if (ui.selected && res.units[ui.selected]) {
            const u = res.units[ui.selected];
            const rect = canvas.getBoundingClientRect();
            const sf = 650 / rect.height;
            const mx = (mouse.x - rect.left) * sf - camX, my = (mouse.y - rect.top) * sf;
            const sx = Utils.snapToGrid(mx, gS), sy = Utils.snapToGrid(my, gS);
            const ok = u.type.includes('TANK') ? Utils.isOnPath(sx, sy, map.path) : !Utils.isOnPath(sx, sy, map.path);
            ctx.save(); ctx.globalAlpha = 0.5; ctx.font = "48px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(u.icon, sx, sy + 16);
            ctx.beginPath(); ctx.strokeStyle = ok ? "#8b795e" : "#d63031"; ctx.lineWidth = 4;
            ctx.setLineDash([8, 4]); ctx.arc(sx, sy, u.range, 0, 7); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
    }
};
