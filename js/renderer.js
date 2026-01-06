/**
 * js/renderer.js - v23.0 
 * 導入 畫面震動渲染、傷害跳字渲染
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
        ctx.save();
        
        // 畫面震動實現 (Kinetic Feedback)
        if (engine.shakeIntensity > 1) {
            const sx = (Math.random() - 0.5) * engine.shakeIntensity;
            const sy = (Math.random() - 0.5) * engine.shakeIntensity;
            ctx.translate(sx, sy);
        }

        ctx.scale(ds, ds);
        ctx.translate(camX, 0);

        // 1. 地圖網格
        ctx.beginPath(); ctx.strokeStyle = map.colors.grid_line; ctx.lineWidth = 1;
        for (let x = 0; x <= 2500; x += gS) { ctx.moveTo(x, 0); ctx.lineTo(x, vH); }
        for (let y = 0; y <= vH; y += gS) { ctx.moveTo(0, y); ctx.lineTo(2500, y); }
        ctx.stroke();

        ctx.beginPath(); ctx.strokeStyle = map.colors.road_stroke; ctx.lineWidth = gS * 1.25; ctx.lineJoin = "round";
        map.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // 2. 女神實體 (增加羈絆光環)
        engine.units.forEach(u => {
            if (u.synergyActive) {
                ctx.beginPath(); ctx.strokeStyle = "rgba(255, 215, 0, 0.3)"; ctx.lineWidth = 4;
                ctx.arc(u.x, u.y, 30, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.font = "46px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(u.icon, u.x, u.y + 16);
        });

        // 3. 敵人與子彈
        engine.enemies.forEach(e => {
            ctx.font = "42px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);
        });
        
        engine.projectilePool.forEach(p => {
            if (p.active) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill(); }
        });

        // 4. 傷害跳字渲染 (Visual Feedback)
        engine.damagePool.forEach(dn => {
            if (!dn.active) return;
            ctx.save();
            ctx.globalAlpha = dn.life / 45;
            ctx.fillStyle = dn.color;
            ctx.font = "bold 24px 'JetBrains Mono'";
            ctx.textAlign = "center";
            ctx.fillText(dn.value, dn.x, dn.y);
            ctx.restore();
        });

        ctx.restore();
    }
};
