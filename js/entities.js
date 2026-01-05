/**
 * js/entities.js
 * 使用物件導向 (OOP) 定義遊戲中所有會動的實體
 */

import { Utils } from './utils.js';

/**
 * 基礎實體類別
 */
class BaseEntity {
    constructor(x, y, icon) {
        this.x = x;
        this.y = y;
        this.icon = icon;
        this.dead = false;
    }
}

/**
 * 敵人 (Enemy) 類別
 */
export class Enemy extends BaseEntity {
    constructor(data, path, scaling, speedGrowth, wave) {
        // 敵人永遠從路徑起點生成
        super(path[0].x, path[0].y, data.icon);
        this.name = data.name;
        this.maxHp = data.hp * scaling;
        this.currentHp = this.maxHp;
        this.speed = data.speed * (1 + (wave * speedGrowth));
        this.pi = 0; // 當前路徑節點索引
        this.isBoss = data.isBoss || false;
        this.blocker = null; // 記錄當前攔截此敵人的女神
    }

    /**
     * 更新怪物移動邏輯
     */
    update(path, balance, onLeak) {
        if (this.currentHp <= 0) {
            this.dead = true;
            return;
        }

        // 如果被近戰女神攔截，且女神還活著，則停止移動
        if (this.blocker && this.blocker.currentHp > 0) {
            return; 
        } else {
            this.blocker = null;
        }

        const nextPoint = path[this.pi + 1];
        if (nextPoint) {
            const dx = nextPoint.x - this.x;
            const dy = nextPoint.y - this.y;
            const d = Math.hypot(dx, dy);

            if (d < this.speed) {
                this.pi++; // 到達節點，轉向下一個
            } else {
                this.x += (dx / d) * this.speed;
                this.y += (dy / d) * this.speed;
            }
        } else {
            // 到達終點 (漏怪)
            const dmg = this.isBoss ? balance.damage_system.boss_leak_penalty : balance.damage_system.normal_leak_penalty;
            onLeak(dmg);
            this.dead = true;
        }
    }
}

/**
 * 女神單位 (Unit) 類別
 */
export class Unit extends BaseEntity {
    constructor(data, x, y) {
        super(x, y, data.icon);
        this.id = data.id;
        this.name = data.name;
        this.type = data.type; // R_PHYS, M_TANK, R_MAGIC 等
        this.range = data.range;
        this.damage = data.damage;
        this.cooldown = data.cooldown;
        this.color = data.color || "#ff66aa";
        
        this.maxHp = data.hp || 1500;
        this.currentHp = this.maxHp;
        this.lastShotFrame = 0;
        this.level = 1;
    }

    /**
     * 判定是否可以射擊
     */
    tryFire(enemies, currentFrame, onFire) {
        // 冷卻檢查
        if (currentFrame - this.lastShotFrame < this.cooldown) return;

        // 尋找射程內最靠近終點的敵人
        const targets = enemies.filter(e => 
            !e.dead && 
            Utils.getDist(this, e) < this.range
        );

        if (targets.length > 0) {
            // 排序：路徑索引(pi)越大、距離下一個點越近的優先
            targets.sort((a, b) => b.pi - a.pi);
            
            onFire(this, targets[0]);
            this.lastShotFrame = currentFrame;
        }
    }
}

/**
 * 投射物 (Projectile) 類別
 */
export class Projectile extends BaseEntity {
    constructor(sourceX, sourceY, target, damage, color) {
        super(sourceX, sourceY, "");
        this.target = target;
        this.damage = damage;
        this.color = color;
        this.speed = 45;
    }

    update(onHit) {
        if (this.target.dead || this.target.currentHp <= 0) {
            this.dead = true;
            return;
        }

        const d = Utils.getDist(this, this.target);
        if (d < this.speed) {
            // 命中
            this.target.currentHp -= this.damage;
            onHit(this.target);
            this.dead = true;
        } else {
            this.x += (this.target.x - this.x) / d * this.speed;
            this.y += (this.target.y - this.y) / d * this.speed;
        }
    }
}
