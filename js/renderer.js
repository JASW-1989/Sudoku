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
        
        if (engine.shakeIntensity > 1) {
            ctx.translate((Math.random()-0.5)*engine.shakeIntensity, (Math.random()-0.5)*engine.shakeIntensity);
        }

        ctx.scale(ds, ds); ctx.translate(camX, 0);

        // 1. 地圖背景與網格 (補回背景矩形繪製)
        ctx.fillStyle = map.colors.canvas_bg;
        ctx.fillRect(0, 0, 2500, vH);

        ctx.beginPath(); ctx.strokeStyle = map.colors.grid_line; ctx.lineWidth = 1;
        for (let x = 0; x <= 2500; x += gS) { ctx.moveTo(x, 0); ctx.lineTo(x, vH); }
        for (let y = 0; y <= vH; y += gS) { ctx.moveTo(0, y); ctx.lineTo(2500, y); }
        ctx.stroke();

        // 2. 道路
        ctx.beginPath(); ctx.strokeStyle = map.colors.road_stroke; ctx.lineWidth = gS * 1.25; ctx.lineJoin = "round";
        map.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // 3. 城堡 (補回終點標誌)
        const cp = map.path[map.path.length-1];
        ctx.save();
        ctx.font = "80px serif";
        ctx.textAlign = "center";
        ctx.shadowBlur = 20; ctx.shadowColor = "rgba(214, 48, 49, 0.4)";
        ctx.fillText("🏰", cp.x, cp.y + 20);
        ctx.restore();

        // 4. 特效渲染
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

        // 5. 裝飾 (補回森林樹木)
        engine.trees.forEach(t => {
            ctx.font = "34px serif";
            ctx.textAlign = "center";
            ctx.fillText(t.type, t.x, t.y + 12);
        });

        // 6. 女神實體
        engine.units.forEach(u => {
            if (u.synergyActive) {
                ctx.beginPath(); ctx.strokeStyle = "rgba(255, 215, 0, 0.4)"; ctx.lineWidth = 4;
                ctx.arc(u.x, u.y, 30, 0, 7); ctx.stroke();
            }
            ctx.font = "46px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(u.icon, u.x, u.y + 16);
        });

        // 7. 敵人與子彈
        engine.enemies.forEach(e => {
            ctx.font = "42px 'Noto Sans TC'"; ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);
            // 血條繪製
            const bw = 40;
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(e.x - bw/2, e.y - 36, bw, 6);
            ctx.fillStyle = "#ff4d94"; ctx.fillRect(e.x - bw/2, e.y - 36, (e.currentHp/e.hp)*bw, 6);
        });

        engine.projectilePool.forEach(p => {
            if (p.active) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 7); ctx.fill(); }
        });

        // 8. 傷害跳字渲染 (修正顏色辨識度)
        engine.damagePool.forEach(dn => {
            if (!dn.active) return;
            ctx.save();
            ctx.globalAlpha = dn.life / 45;
            ctx.fillStyle = dn.color;
            ctx.font = "bold 26px 'JetBrains Mono'";
            ctx.textAlign = "center";
            // 增加陰影增強辨識
            ctx.shadowBlur = 4; ctx.shadowColor = "rgba(0,0,0,0.2)";
            ctx.fillText(dn.value, dn.x, dn.y);
            ctx.restore();
        });

        // 9. 部署預覽
        if (ui.selected && res.units[ui.selected]) {
            const u = res.units[ui.selected];
            const rect = canvas.getBoundingClientRect();
            const sf = vH / rect.height;
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
