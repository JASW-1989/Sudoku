/**
 * js/entities.js - 物件導向實體定義
 */
import { Utils } from './utils.js';

class BaseEntity {
    constructor(x, y, icon) {
        this.x = x;
        this.y = y;
        this.icon = icon;
        this.dead = false;
    }
}

export class Enemy extends BaseEntity {
    constructor(data, path, scaling, speedGrowth, wave) {
        super(path[0].x, path[0].y, data.icon);
        this.data = data; 
        this.name = data.name;
        this.hp = data.hp * scaling;
        this.currentHp = this.hp;
        this.speed = data.speed * (1 + (wave * speedGrowth));
        this.pi = 0;
        this.isBoss = data.isBoss || false;
        this.blocker = null;
    }

    update(path, balance, onLeak) {
        if (this.currentHp <= 0) { this.dead = true; return; }
        if (this.blocker && this.blocker.currentHp > 0) return; // 被攔截中
        
        const next = path[this.pi + 1];
        if (next) {
            const dx = next.x - this.x, dy = next.y - this.y, d = Math.hypot(dx, dy);
            if (d < this.speed) this.pi++;
            else { 
                this.x += (dx / d) * this.speed; 
                this.y += (dy / d) * this.speed; 
            }
        } else {
            // 到達終點
            onLeak(this.isBoss ? balance.damage_system.boss_leak_penalty : balance.damage_system.normal_leak_penalty);
            this.dead = true;
        }
    }
}

export class Unit extends BaseEntity {
    constructor(data, x, y) {
        super(x, y, data.icon);
        this.config = data; // 保存原始配置供 UI 讀取 upgrades
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.range = data.range;
        this.damage = data.damage;
        this.cooldown = data.cooldown;
        this.color = data.color || "#ff66aa";
        this.maxHp = data.hp || 1500;
        this.currentHp = this.maxHp;
        this.lastShot = 0;
        this.level = 1;
    }

    tryFire(enemies, frame, onFire) {
        if (frame - this.lastShot < this.cooldown) return;
        const targets = enemies.filter(e => !e.dead && Utils.getDist(this, e) < this.range);
        if (targets.length > 0) {
            targets.sort((a, b) => b.pi - a.pi); // 優先攻擊最靠近終點的敵人
            onFire(this, targets[0]);
            this.lastShot = frame;
        }
    }
}

export class Projectile extends BaseEntity {
    constructor(sourceUnit, target) {
        super(sourceUnit.x, sourceUnit.y, "");
        this.target = target;
        this.damage = sourceUnit.damage;
        this.color = sourceUnit.color;
        this.speed = 45;
    }

    update(onHit) {
        const d = Utils.getDist(this, this.target);
        if (d < this.speed || this.target.dead) {
            if (!this.target.dead) {
                this.target.currentHp -= this.damage;
                if (this.target.currentHp <= 0) onHit(this.target);
            }
            this.dead = true;
        } else {
            this.x += (this.target.x - this.x) / d * this.speed;
            this.y += (this.target.y - this.y) / d * this.speed;
        }
    }
}
