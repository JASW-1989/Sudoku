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

    applyStun(duration) {
        this.state = ENEMY_STATE.STUN;
        this.stunTimer = duration;
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
// Unit 與 Projectile 邏輯保持 v21.3 穩定版...
