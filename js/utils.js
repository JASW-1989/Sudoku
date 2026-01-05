/**
 * js/utils.js
 * 負責聖域保衛戰中所有的數學運算、座標轉換與平衡公式
 */

export const Utils = {
    /**
     * 計算兩點之間的歐幾里得距離
     */
    getDist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),

    /**
     * 將座標對齊至網格中心 (Snap to Grid)
     */
    snapToGrid: (v, gridSize = 50) => {
        return Math.floor(v / gridSize) * gridSize + gridSize / 2;
    },

    /**
     * 計算敵人血量/屬性的縮放倍率 (依據平衡設定檔)
     * @param {number} wave - 當前波次
     * @param {object} balanceConfig - 來自 balance_config.json 的設定
     */
    calcEnemyScaling: (wave, balanceConfig) => {
        const ds = balanceConfig.difficulty_scaling;
        if (wave <= 10) {
            // 前期：線性成長
            return ds.early_base_offset + wave * ds.early_scaling_factor;
        } else {
            // 後期：指數成長
            return ds.late_scaling_base * Math.pow(ds.late_scaling_pow, wave - 10);
        }
    },

    /**
     * 判定點 (x, y) 是否位於路徑邊界內
     * 常用於限制遠程單位不能放置在路徑上，或近戰單位必須放置在路徑上
     */
    isOnPath: (x, y, path, threshold = 48) => {
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            // 計算點到線段的距離
            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
            if (l2 === 0) continue;
            
            let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            
            const dist = Math.hypot(
                x - (p1.x + t * (p2.x - p1.x)),
                y - (p1.y + t * (p2.y - p1.y))
            );
            
            if (dist < threshold) return true;
        }
        return false;
    }
};
