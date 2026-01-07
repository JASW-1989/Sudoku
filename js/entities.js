/**
 * js/entities.js - v25.5 (聖域實體：NaN 阻斷與死亡判斷加強)
 */
import { Utils } from './utils.js';

export const ENEMY_STATE = { WALK: 'WALK', BLOCKED: 'BLOCKED', STUN: 'STUN', DEAD: 'DEAD' };

class BaseEntity {
    constructor(x, y, icon) {
        this.x = Number(x) || 0; this.y = Number(y) || 0; 
        this.icon = icon || "❓";
        this.active = true;
    }
}

export class Enemy extends BaseEntity {
    constructor(data, path, scaling, speedGrowth, wave) {
        super(path?.[0]?.x || 0, path?.[0]?.y || 0, data?.icon);
        this.data = data || {};
        
        // 核心修正：強制轉換並驗證數值，防止 NaN 導致血量打不死
        const rawHp = Number(data?.hp) || 100;
        const s = Number(scaling) || 1;
        this.hp = rawHp * s;
        if (isNaN(this.hp)) this.hp = 200;
        this.currentHp = this.hp;
        
        const rawSpeed = Number(data?.speed) || 1.5;
        const g = Number(speedGrowth) || 0.007;
        this.speed = rawSpeed * (1 + (Number(wave) * g));
        
        this.pi = 0; 
        this.state = ENEMY_STATE.WALK; 
        this.blocker = null;
    }
    
    update(path, balance, onLeak) {
        if (this.state === ENEMY_STATE.DEAD) return;

        // 核心判斷：血量為 NaN 或 <= 0 立即標記死亡
        if (!Number.isFinite(this.currentHp) || this.currentHp <= 0) { 
            this.state = ENEMY_STATE.DEAD; 
            return; 
        }
        
        if (this.blocker && this.blocker.currentHp > 0) {
            this.state = ENEMY_STATE.BLOCKED; return; 
        } else {
            this.blocker = null;
            if (this.state === ENEMY_STATE.BLOCKED) this.state = ENEMY_STATE.WALK;
        }

        const next = path[this.pi + 1];
        if (next) {
            const dx = next.x - this.x, dy = next.y - this.y, d = Math.hypot(dx, dy);
            if (d < this.speed) this.pi++;
            else { this.x += (dx / d) * this.speed; this.y += (dy / d) * this.speed; }
        } else {
            const dmg = this.data.isBoss ? (balance?.damage_system?.boss_leak_penalty || 20) : (balance?.damage_system?.normal_leak_penalty || 1);
            onLeak(dmg);
            this.state = ENEMY_STATE.DEAD;
        }
    }
}

export class Projectile extends BaseEntity {
    constructor() { super(0, 0, ""); this.active = false; }
    reset(u, target) {
        this.x = u.x; this.y = u.y; this.target = target;
        // 確保傷害值是合法數字
        const rawDmg = Number(u.damage) || 10;
        this.damage = rawDmg * (u.synergyActive ? 1.25 : 1.0);
        if (isNaN(this.damage)) this.damage = 10;
        
        this.color = u.color || "#ffffff"; 
        this.speed = 45; 
        this.active = true;
    }
    update(onHit) {
        if (!this.active) return;
        if (!this.target || this.target.state === ENEMY_STATE.DEAD) { this.active = false; return; }
        const d = Utils.getDist(this, this.target);
        if (d < this.speed) {
            // 造成傷害前最後一次數值防禦
            const dmgToApply = Number(this.damage) || 10;
            this.target.currentHp -= dmgToApply;
            onHit(this.target, dmgToApply); 
            this.active = false;
        } else {
            this.x += (this.target.x - this.x) / d * this.speed;
            this.y += (this.target.y - this.y) / d * this.speed;
        }
    }
}

export class Unit extends BaseEntity {
    constructor(data, x, y) {
        super(x, y, data.icon);
        this.config = data; 
        this.range = Number(data.range) || 150; 
        this.damage = Number(data.damage) || 50;
        this.cooldown = Number(data.cooldown) || 60; 
        this.color = data.color || "#ff66aa";
        this.maxHp = Number(data.hp) || 1500; 
        this.currentHp = this.maxHp;
        this.lastShot = 0; this.level = 1; this.synergyActive = false;
        this.type = data.type; this.name = data.name;
    }
    tryFire(enemies, frame, onFire) {
        if (frame - this.lastShot < this.lastShot) { /* 防止極端冷卻 bug */ }
        if (frame - this.lastShot < this.cooldown) return;
        const targets = enemies.filter(e => e.state !== ENEMY_STATE.DEAD && Utils.getDist(this, e) < this.range);
        if (targets.length > 0) {
            targets.sort((a, b) => b.pi - a.pi);
            onFire(this, targets[0]); this.lastShot = frame;
        }
    }
}

export class DamageNumber extends BaseEntity {
    constructor() { super(0, 0, ""); this.value = 0; this.life = 0; this.active = false; this.color = "#d63031"; }
    reset(x, y, val, color = "#d63031") {
        this.x = x; this.y = y; this.value = Math.floor(Number(val) || 0); this.life = 45; this.active = true; this.color = color;
    }
    update() {
        if (!this.active) return;
        this.y -= 0.8; this.life--;
        if (this.life <= 0) this.active = false;
    }
}
