/**
 * js/renderer.js - v20.9 座標精度修正版
 * 修正網格與地圖配置不符的問題
 */
import { Utils } from './utils.js';

export const Renderer = {
    render: (ctx, canvas, engine, res, camX, ui, mouse) => {
        if (!engine || !res) return;
        const { map } = res;
        
        // 動態讀取配置的邏輯高度與格點大小
        const vH = map.virtual_height || 650;
        const gS = map.grid_size || 50;
        const ds = canvas.height / vH; 

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(ds, ds);
        ctx.translate(camX, 0);

        // 1. 地圖背景與動態網格 (修正網格不符問題)
        ctx.beginPath();
        ctx.strokeStyle = map.colors.grid_line;
        ctx.lineWidth = 1;
        // 橫向繪製到地圖最大寬度 2500
        for (let x = 0; x <= 2500; x += gS) {
            ctx.moveTo(x, 0); ctx.lineTo(x, vH);
        }
        for (let y = 0; y <= vH; y += gS) {
            ctx.moveTo(0, y); ctx.lineTo(2500, y);
        }
        ctx.stroke();

        // 2. 戰術路徑
        ctx.beginPath();
        ctx.strokeStyle = map.colors.road_stroke;
        ctx.lineWidth = gS * 1.24; // 基於格點大小的動態寬度
        ctx.lineJoin = "round";
        map.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        const cp = map.path[map.path.length-1];
        ctx.save();
        ctx.shadowBlur = 30; ctx.shadowColor = "#ff66aa";
        ctx.font = "95px serif"; ctx.textAlign = "center"; 
        ctx.fillText("🏰", cp.x - 20, cp.y + 15);
        ctx.restore();

        // 3. 裝飾與森林
        engine.trees.forEach(t => { ctx.font = "34px serif"; ctx.fillText(t.type, t.x, t.y + 12); });
        
        // 4. 女神實體與射程圈
        engine.units.forEach(u => {
            if (ui.upgradeTarget === u) {
                ctx.beginPath();
                ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
                ctx.arc(u.x, u.y, u.range, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.font = "46px serif"; ctx.textAlign = "center";
            ctx.fillText(u.icon, u.x, u.y + 16);
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(u.x - 20, u.y + 24, 40, 4);
            ctx.fillStyle = "#55efc4"; ctx.fillRect(u.x - 20, u.y + 24, (u.currentHp / u.maxHp) * 40, 4);
        });

        // 5. 敵人渲染
        engine.enemies.forEach(e => {
            const scale = e.isBoss ? (e.data.scale || 2.8) : 1;
            ctx.font = `${42 * scale}px serif`;
            ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);
            const bw = 40 * scale;
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(e.x - bw / 2, e.y - (36 * scale), bw, 6);
            ctx.fillStyle = e.isBoss ? "#e74c3c" : "#ff4d94";
            ctx.fillRect(e.x - bw / 2, e.y - (36 * scale), (e.currentHp / e.hp) * bw, 6);
        });

        // 6. 子彈渲染
        engine.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        });

        // 7. 部署預覽 (Ghost Mode)
        if (ui.selected && res.units[ui.selected]) {
            const u = res.units[ui.selected];
            const rect = canvas.getBoundingClientRect();
            const sf = vH / rect.height;
            const mx = (mouse.x - rect.left) * sf - camX, my = (mouse.y - rect.top) * sf;
            const sx = Utils.snapToGrid(mx, gS), sy = Utils.snapToGrid(my, gS);
            const ok = u.type.includes('TANK') ? Utils.isOnPath(sx, sy, map.path) : !Utils.isOnPath(sx, sy, map.path);
            
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.font = "48px serif"; ctx.textAlign = "center";
            ctx.fillText(u.icon, sx, sy + 16);
            ctx.beginPath(); ctx.strokeStyle = ok ? "#fff" : "#ff3e3e";
            ctx.lineWidth = 4; ctx.setLineDash([8, 4]); ctx.arc(sx, sy, u.range, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }
};
