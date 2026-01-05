/**
 * js/renderer.js
 * 視覺呈現中心：負責將引擎狀態繪製到 Canvas 上
 */

import { Utils } from './utils.js';

export const Renderer = {
    /**
     * 渲染完整場景
     */
    render: (ctx, canvas, engine, resources, camX, ui, mousePos) => {
        const { map } = resources;
        // 計算縮放比例：以邏輯高度 V_HEIGHT 為基準映射到實際 Canvas 高度
        const drawScale = canvas.height / 650; // 650 是我們設定的 V_HEIGHT

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        // 應用全局縮放與攝像機位移
        ctx.scale(drawScale, drawScale);
        ctx.translate(camX, 0);

        // 1. 繪製背景與網格
        ctx.beginPath();
        ctx.strokeStyle = map.colors.grid_line;
        ctx.lineWidth = 1;
        for (let x = 0; x <= 2500; x += map.grid_size) {
            ctx.moveTo(x, 0); ctx.lineTo(x, 650);
        }
        for (let y = 0; y <= 650; y += map.grid_size) {
            ctx.moveTo(0, y); ctx.lineTo(2500, y);
        }
        ctx.stroke();

        // 2. 繪製戰術路徑
        ctx.beginPath();
        ctx.strokeStyle = map.colors.road_stroke;
        ctx.lineWidth = 62;
        ctx.lineJoin = "round";
        const path = map.path;
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // 3. 繪製城堡 (終點)
        const castlePos = path[path.length - 1];
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = "#ff66aa";
        ctx.font = "95px serif";
        ctx.textAlign = "center";
        ctx.fillText("🏰", castlePos.x - 20, castlePos.y + 15);
        ctx.restore();

        // 4. 繪製裝飾 (樹木)
        engine.trees.forEach(t => {
            ctx.font = "34px serif";
            ctx.fillText(t.type, t.x, t.y + 12);
        });

        // 5. 繪製女神單位
        engine.units.forEach(u => {
            // 底盤陰影
            ctx.beginPath();
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.arc(u.x, u.y, 22, 0, Math.PI * 2);
            ctx.fill();
            
            // 圖示
            ctx.font = "46px serif";
            ctx.textAlign = "center";
            ctx.fillText(u.icon, u.x, u.y + 16);

            // 血條
            const bw = 40;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(u.x - bw/2, u.y + 24, bw, 4);
            ctx.fillStyle = "#55efc4";
            ctx.fillRect(u.x - bw/2, u.y + 24, (u.currentHp / u.maxHp) * bw, 4);
        });

        // 6. 繪製敵人
        engine.enemies.forEach(e => {
            ctx.font = `${e.isBoss ? 130 : 42}px serif`;
            ctx.textAlign = "center";
            ctx.fillText(e.icon, e.x, e.y + 14);

            // 敵人血條
            const bw = e.isBoss ? 130 : 42;
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(e.x - bw/2, e.y - (e.isBoss ? 75 : 36), bw, 6);
            ctx.fillStyle = e.isBoss ? "#e74c3c" : "#ff4d94";
            ctx.fillRect(e.x - bw/2, e.y - (e.isBoss ? 75 : 36), (e.currentHp / e.maxHp) * bw, 6);
        });

        // 7. 繪製投射物
        engine.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();
        });

        // 8. 繪製部署預覽虛影
        if (ui.selected && resources.units[ui.selected]) {
            const uData = resources.units[ui.selected];
            const rect = canvas.getBoundingClientRect();
            const sF = 650 / rect.height;
            const mx = (mousePos.x - rect.left) * sF - camX;
            const my = (mousePos.y - rect.top) * sF;
            const sx = Utils.snapToGrid(mx, map.grid_size);
            const sy = Utils.snapToGrid(my, map.grid_size);
            
            const onPath = Utils.isOnPath(sx, sy, map.path);
            const isValid = uData.type.includes('TANK') ? onPath : !onPath;

            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.font = "48px serif";
            ctx.textAlign = "center";
            ctx.fillText(uData.icon, sx, sy + 16);
            
            // 射程圈
            ctx.beginPath();
            ctx.strokeStyle = isValid ? "#fff" : "#ff3e3e";
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 4]);
            ctx.arc(sx, sy, uData.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }
};
