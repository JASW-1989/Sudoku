/**
 * js/renderer.js - v24.2 (增加地形細節與血量條修復)
 */
import { Utils } from './utils.js';

export const Renderer = {
    render: (ctx, canvas, engine, res, camX, ui, mouse) => {
        if (!engine || !res) return;
        const { map } = res;
        const vH = map.virtual_height || 650;
        const ds = canvas.height / vH;
        const gS = map.grid_size || 50;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        if (engine.shakeIntensity > 1) {
            ctx.translate((Math.random()-0.5)*engine.shakeIntensity, (Math.random()-0.5)*engine.shakeIntensity);
        }
        ctx.scale(ds, ds); ctx.translate(camX, 0);

        // 1. 背景與地形
        ctx.fillStyle = map.colors.canvas_bg;
        ctx.fillRect(0, 0, 2500, vH);

        // 繪製格線
        ctx.beginPath(); ctx.strokeStyle = map.colors.grid_line; ctx.lineWidth = 1;
        for (let x = 0; x <= 2500; x += gS) { ctx.moveTo(x, 0); ctx.lineTo(x, vH); }
        for (let y = 0; y <= vH; y += gS) { ctx.moveTo(0, y); ctx.lineTo(2500, y); }
        ctx.stroke();

        // 2. 道路
        ctx.beginPath(); ctx.strokeStyle = map.colors.road_stroke; ctx.lineWidth = gS * 1.25; ctx.lineJoin = "round";
        map.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // 3. 裝飾 (包含樹木、草叢、岩石)
        engine.trees.forEach(t => {
            ctx.font = "34px serif"; ctx.textAlign = "center";
            ctx.fillText(t.type, t.x, t.y + 12);
        });

        // 4. 城堡
        const cp = map.path[map.path.length-1];
        ctx.save(); ctx.font = "80px serif"; ctx.textAlign = "center";
        ctx.shadowBlur = 20; ctx.shadowColor = "rgba(214, 48, 49, 0.4)";
        ctx.fillText("🏰", cp.x, cp.y + 20); ctx.restore();

        // 5. 女神實體 (補回血條顯示)
        engine.units.forEach(u => {
            ctx.font = "46px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(u.icon, u.x, u.y + 16);
            // 繪製單位血條 (進戰阻擋時會扣血)
            const bw = 36;
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(u.x - bw/2, u.y + 22, bw, 4);
            ctx.fillStyle = "#55efc4"; ctx.fillRect(u.x - bw/2, u.y + 22, (u.currentHp/u.maxHp)*bw, 4);
        });

        // 6. 敵人
        engine.enemies.forEach(e => {
            const sc = e.data.isBoss ? (e.data.scale || 2.5) : 1;
            ctx.font = `${42 * sc}px 'Noto Sans TC'`; ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);
            const bw = 40 * sc;
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(e.x - bw/2, e.y - (36 * sc), bw, 6);
            ctx.fillStyle = e.data.isBoss ? "#e74c3c" : "#ff4d94";
            ctx.fillRect(e.x - bw/2, e.y - (36 * sc), (e.currentHp/e.hp)*bw, 6);
        });

        // 7. 子彈與傷害跳字
        engine.projectilePool.forEach(p => { if (p.active) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 7); ctx.fill(); } });
        engine.damagePool.forEach(dn => {
            if (!dn.active) return;
            ctx.save(); ctx.globalAlpha = dn.life / 45; ctx.fillStyle = dn.color;
            ctx.font = "bold 26px 'JetBrains Mono'"; ctx.shadowBlur = 4; ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.textAlign = "center"; ctx.fillText(dn.value, dn.x, dn.y); ctx.restore();
        });

        ctx.restore();
    }
};
