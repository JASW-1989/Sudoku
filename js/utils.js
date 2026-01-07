/**
 * js/utils.js - v25.5 (聖域物理工具：數值安全性加強版)
 */
export const Utils = {
    getDist: (a, b) => {
        const dx = (a?.x || 0) - (b?.x || 0);
        const dy = (a?.y || 0) - (b?.y || 0);
        return Math.hypot(dx, dy);
    },
    
    snapToGrid: (v, gridSize = 50) => Math.floor(v / gridSize) * gridSize + gridSize / 2,
    
    calcEnemyScaling: (wave, balance) => {
        const ds = balance?.difficulty_scaling;
        if (!ds) return 1;
        const w = Math.max(1, Number(wave) || 1);
        let scale = 1;
        
        if (w <= 10) {
            scale = (ds.early_base_offset || 0.2) + w * (ds.early_scaling_factor || 0.1);
        } else {
            scale = (ds.late_scaling_base || 1.2) * Math.pow((ds.late_scaling_pow || 1.15), w - 10);
        }
        
        return Number.isFinite(scale) ? scale : 1;
    },
    
    isOnPath: (x, y, path, threshold = 48) => {
        if (!path || path.length < 2) return false;
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i], p2 = path[i + 1];
            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
            if (l2 === 0) continue;
            let t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2));
            const dist = Math.hypot(x - (p1.x + t * (p2.x - p1.x)), y - (p1.y + t * (p2.y - p1.y)));
            if (dist < threshold) return true;
        }
        return false;
    }
};
