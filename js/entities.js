/**
 * js/entities.js - 實體與 FSM 狀態定義 (v22.0)
 */
import { Utils } from './utils.js';

export const ENEMY_STATE = {
    WALK: 'WALK',
    BLOCKED: 'BLOCKED',
    STUN: 'STUN',
    DEAD: 'DEAD'
};

class BaseEntity {
    constructor(x, y, icon) {
        this.x = x; this.y = y; this.icon = icon;
        this.active = true;
    }
}

export class Enemy extends BaseEntity {
    constructor(data, path, scaling, speedGrowth, wave) {
        super(path[0].x, path[0].y, data.icon);
        this.data = data;
        this.hp = data.hp * scaling;
        this.currentHp = this.hp;
        this.speed = data.speed * (1 + (wave * speedGrowth));
        this.pi = 0;
        this.blocker = null;
        this.state = ENEMY_STATE.WALK;
        this.stunTimer = 0;
    }

    update(path, balance, onLeak) {
        if (this.state === ENEMY_STATE.DEAD) return;
        if (this.currentHp <= 0) { this.state = ENEMY_STATE.DEAD; return; }

        switch (this.state) {
            case ENEMY_STATE.STUN:
                this.stunTimer--;
                if (this.stunTimer <= 0) this.state = ENEMY_STATE.WALK;
                break;
            case ENEMY_STATE.WALK:
                if (this.blocker && this.blocker.currentHp > 0) {
                    this.state = ENEMY_STATE.BLOCKED;
                    break;
                }
                const next = path[this.pi + 1];
                if (next) {
                    const dx = next.x - this.x, dy = next.y - this.y, d = Math.hypot(dx, dy);
                    if (d < this.speed) this.pi++;
                    else { this.x += (dx / d) * this.speed; this.y += (dy / d) * this.speed; }
                } else {
                    onLeak(this.data.isBoss ? balance.damage_system.boss_leak_penalty : balance.damage_system.normal_leak_penalty);
                    this.state = ENEMY_STATE.DEAD;
                }
                break;
            case ENEMY_STATE.BLOCKED:
                if (!this.blocker || this.blocker.currentHp <= 0) {
                    this.blocker = null;
                    this.state = ENEMY_STATE.WALK;
                }
                break;
        }
    }
}

export class Unit extends BaseEntity {
    constructor(data, x, y) {
        super(x, y, data.icon);
        this.config = data;
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
        const targets = enemies.filter(e => e.state !== ENEMY_STATE.DEAD && Utils.getDist(this, e) < this.range);
        if (targets.length > 0) {
            targets.sort((a, b) => b.pi - a.pi);
            onFire(this, targets[0]);
            this.lastShot = frame;
        }
    }
}

export class Projectile extends BaseEntity {
    constructor() {
        super(0, 0, "");
        this.active = false; // 初始非活躍，等待物件池重置
    }

    /**
     * 物件池重置方法：重複利用物件時調用
     */
    reset(sourceUnit, target) {
        this.x = sourceUnit.x;
        this.y = sourceUnit.y;
        this.target = target;
        this.damage = sourceUnit.damage;
        this.color = sourceUnit.color;
        this.speed = 45;
        this.active = true;
    }

    update(onHit) {
        if (!this.active) return;
        if (this.target.state === ENEMY_STATE.DEAD) { this.active = false; return; }
        
        const d = Utils.getDist(this, this.target);
        if (d < this.speed) {
            this.target.currentHp -= this.damage;
            if (this.target.currentHp <= 0) {
                this.target.state = ENEMY_STATE.DEAD;
                onHit(this.target);
            }
            this.active = false; // 回收至物件池
        } else {
            this.x += (this.target.x - this.x) / d * this.speed;
            this.y += (this.target.y - this.y) / d * this.speed;
        }
    }
}
