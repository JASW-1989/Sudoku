/**
 * js/renderer.js - v20.8 穩定版
 * 優化視距映射與射程圈顯示
 */
import { Utils } from './utils.js';

export const Renderer = {
    render: (ctx, canvas, engine, res, camX, ui, mouse) => {
        if (!engine || !res) return;
        const { map } = res;
        const ds = canvas.height / 650; // 核心視距參數

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(ds, ds);
        ctx.translate(camX, 0);

        // 1. 地圖背景
        ctx.beginPath();
        ctx.strokeStyle = map.colors.grid_line;
        ctx.lineWidth = 1;
        for (let x = 0; x <= 2500; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, 650); }
        for (let y = 0; y <= 650; y += 50) { ctx.moveTo(0, y); ctx.lineTo(2500, y); }
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = map.colors.road_stroke;
        ctx.lineWidth = 62;
        ctx.lineJoin = "round";
        map.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        const cp = map.path[map.path.length-1];
        ctx.save();
        ctx.shadowBlur = 30; ctx.shadowColor = "#ff66aa";
        ctx.font = "95px serif"; ctx.textAlign = "center"; 
        ctx.fillText("🏰", cp.x - 20, cp.y + 15);
        ctx.restore();

        // 2. 實體
        engine.trees.forEach(t => { ctx.font = "34px serif"; ctx.fillText(t.type, t.x, t.y + 12); });
        
        engine.units.forEach(u => {
            // 被選中時顯示射程
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

        engine.enemies.forEach(e => {
            ctx.font = `${e.isBoss ? 130 : 42}px serif`;
            ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);
            const bw = e.isBoss ? 120 : 40;
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(e.x - bw / 2, e.y - (e.isBoss ? 75 : 36), bw, 6);
            ctx.fillStyle = e.isBoss ? "#e74c3c" : "#ff4d94";
            ctx.fillRect(e.x - bw / 2, e.y - (e.isBoss ? 75 : 36), (e.currentHp / e.hp) * bw, 6);
        });

        engine.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        });

        // 3. 部署預覽 (Ghost)
        if (ui.selected && res.units[ui.selected]) {
            const u = res.units[ui.selected];
            const rect = canvas.getBoundingClientRect();
            const sf = 650 / rect.height;
            const mx = (mouse.x - rect.left) * sf - camX, my = (mouse.y - rect.top) * sf;
            const sx = Utils.snapToGrid(mx), sy = Utils.snapToGrid(my);
            const ok = u.type.includes('TANK') ? Utils.isOnPath(sx, sy, map.path) : !Utils.isOnPath(sx, sy, map.path);
            
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.font = "48px serif"; ctx.textAlign = "center";
            ctx.fillText(u.icon, sx, sy + 16);
            ctx.beginPath();
            ctx.strokeStyle = ok ? "#fff" : "#ff3e3e";
            ctx.lineWidth = 4; ctx.setLineDash([8, 4]);
            ctx.arc(sx, sy, u.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }
};
