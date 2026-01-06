/**
 * js/entities.js - v21.1 FSM 導入版
 * 定義狀態機：WALK, BLOCKED, DYING, DEAD
 */
import { Utils } from './utils.js';

// 定義敵人狀態常量
export const ENEMY_STATE = {
    WALK: 'WALK',
    BLOCKED: 'BLOCKED',
    DYING: 'DYING',
    DEAD: 'DEAD'
};

class BaseEntity {
    constructor(x, y, icon) {
        this.x = x; this.y = y; this.icon = icon;
        this.state = 'IDLE'; // 預設狀態
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
        this.state = ENEMY_STATE.WALK; // 初始狀態：行走
    }

    /**
     * 狀態切換器
     */
    changeState(newState) {
        if (this.state === ENEMY_STATE.DEAD) return; // 死亡後不可轉移
        this.state = newState;
    }

    update(path, balance, onLeak) {
        // 1. 生命值檢測狀態轉移
        if (this.currentHp <= 0 && this.state !== ENEMY_STATE.DEAD) {
            this.changeState(ENEMY_STATE.DEAD);
            return;
        }

        // 2. 根據狀態執行行為
        switch (this.state) {
            case ENEMY_STATE.WALK:
                if (this.blocker && this.blocker.currentHp > 0) {
                    this.changeState(ENEMY_STATE.BLOCKED);
                    break;
                }
                const next = path[this.pi + 1];
                if (next) {
                    const dx = next.x - this.x, dy = next.y - this.y, d = Math.hypot(dx, dy);
                    if (d < this.speed) this.pi++;
                    else { this.x += (dx / d) * this.speed; this.y += (dy / d) * this.speed; }
                } else {
                    onLeak(this.isBoss ? balance.damage_system.boss_leak_penalty : balance.damage_system.normal_leak_penalty);
                    this.changeState(ENEMY_STATE.DEAD); // 漏怪後視同死亡移除
                }
                break;

            case ENEMY_STATE.BLOCKED:
                if (!this.blocker || this.blocker.currentHp <= 0) {
                    this.blocker = null;
                    this.changeState(ENEMY_STATE.WALK);
                }
                break;

            case ENEMY_STATE.DEAD:
                // 待清理狀態，不執行行為
                break;
        }
    }
}

export class Unit extends BaseEntity {
    constructor(data, x, y) {
        super(x, y, data.icon);
        this.config = data;
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
        this.state = 'IDLE';
    }

    tryFire(enemies, frame, onFire) {
        if (frame - this.lastShot < this.cooldown) return;
        
        // 僅鎖定尚未死亡的敵人
        const targets = enemies.filter(e => 
            e.state !== ENEMY_STATE.DEAD && 
            Utils.getDist(this, e) < this.range
        );

        if (targets.length > 0) {
            targets.sort((a, b) => b.pi - a.pi);
            onFire(this, targets[0]);
            this.lastShot = frame;
            this.state = 'ATTACK';
        } else {
            this.state = 'IDLE';
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
        // 如果目標已經死亡，子彈直接消失
        if (this.target.state === ENEMY_STATE.DEAD) {
            this.dead = true;
            return;
        }

        if (d < this.speed) {
            this.target.currentHp -= this.damage;
            if (this.target.currentHp <= 0) {
                this.target.changeState(ENEMY_STATE.DEAD);
                onHit(this.target);
            }
            this.dead = true;
        } else {
            this.x += (this.target.x - this.x) / d * this.speed;
            this.y += (this.target.y - this.y) / d * this.speed;
        }
    }
}
