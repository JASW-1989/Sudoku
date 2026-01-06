/**
 * js/entities.js - v23.0 實體強化版
 * 導入 DamageNumber 與 羈絆變數
 */
import { Utils } from './utils.js';

export const ENEMY_STATE = { WALK: 'WALK', BLOCKED: 'BLOCKED', STUN: 'STUN', DEAD: 'DEAD' };

class BaseEntity {
    constructor(x, y, icon) { this.x = x; this.y = y; this.icon = icon; this.active = true; }
}

// 新增：傷害數字實體 (由物件池管理)
export class DamageNumber extends BaseEntity {
    constructor() {
        super(0, 0, "");
        this.value = 0;
        this.life = 0;
        this.active = false;
        this.color = "#ffffff";
    }
    reset(x, y, val, color = "#ffffff") {
        this.x = x; this.y = y; this.value = val;
        this.life = 45; // 持續 0.75 秒
        this.active = true;
        this.color = color;
    }
    update() {
        if (!this.active) return;
        this.y -= 0.8; // 緩緩飄上
        this.life--;
        if (this.life <= 0) this.active = false;
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
        this.state = ENEMY_STATE.WALK;
        this.stunTimer = 0;
    }
    update(path, balance, onLeak) {
        if (this.state === ENEMY_STATE.DEAD) return;
        if (this.currentHp <= 0) { this.state = ENEMY_STATE.DEAD; return; }
        if (this.state === ENEMY_STATE.STUN) {
            this.stunTimer--;
            if (this.stunTimer <= 0) this.state = ENEMY_STATE.WALK;
            return;
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
        this.synergyActive = false; // 是否觸發羈絆
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
    constructor() { super(0, 0, ""); this.active = false; }
    reset(u, target) {
        this.x = u.x; this.y = u.y; this.target = target;
        this.damage = u.damage * (u.synergyActive ? 1.25 : 1.0); // 羈絆增傷 25%
        this.color = u.color; this.speed = 45; this.active = true;
    }
    update(onHit) {
        if (!this.active) return;
        if (this.target.state === ENEMY_STATE.DEAD) { this.active = false; return; }
        const d = Utils.getDist(this, this.target);
        if (d < this.speed) {
            this.target.currentHp -= this.damage;
            onHit(this.target, this.damage); // 傳回傷害值以產生跳字
            this.active = false;
        } else {
            this.x += (this.target.x - this.x) / d * this.speed;
            this.y += (this.target.y - this.y) / d * this.speed;
        }
    }
}
