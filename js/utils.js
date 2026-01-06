/**
 * js/utils.js - 聖域保衛戰基礎工具 (v22.1)
 */
export const Utils = {
    getDist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    
    snapToGrid: (v, gridSize = 50) => Math.floor(v / gridSize) * gridSize + gridSize / 2,
    
    calcEnemyScaling: (wave, balance) => {
        const ds = balance.difficulty_scaling;
        if (wave <= 10) {
            return ds.early_base_offset + wave * ds.early_scaling_factor;
        } else {
            return ds.late_scaling_base * Math.pow(ds.late_scaling_pow, wave - 10);
        }
    },
    
    isOnPath: (x, y, path, threshold = 48) => {
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
