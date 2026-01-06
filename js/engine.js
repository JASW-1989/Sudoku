/**
 * js/engine.js - v23.1 核心修復版
 * 補回遺失的 initDecor 方法，解決啟動崩潰問題
 */
import { Enemy, Unit, Projectile, DamageNumber, ENEMY_STATE } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(res) {
        this.res = res;
        this.units = []; this.enemies = []; this.trees = [];
        this.frame = 0; this.spawnPool = 0; this.castleHit = false;
        this.shakeIntensity = 0;

        this.projectilePool = Array.from({ length: 150 }, () => new Projectile());
        this.effectPool = Array.from({ length: 80 }, () => ({ x: 0, y: 0, type: '', life: 0, color: '', active: false }));
        this.damagePool = Array.from({ length: 60 }, () => new DamageNumber());
        this.globalFrozen = 0;
    }

    /**
     * 修復：補回被遺漏的裝飾初始化方法
     */
    initDecor() {
        const gS = this.res.map.grid_size || 50;
        this.trees = [];
        for (let i = 0; i < 45; i++) for (let j = 0; j < 13; j++) {
            const tx = i * gS + gS/2, ty = j * gS + gS/2;
            if (!Utils.isOnPath(tx, ty, this.res.map.path) && Math.random() < 0.1)
                this.trees.push({ x: tx, y: ty, type: Math.random() > 0.5 ? "🌲" : "🌳" });
        }
    }

    startWave(setStats) {
        const { waves, balance } = this.res;
        this.spawnPool += waves.general.monsters_per_wave;
        setStats(s => ({
            ...s,
            wave: this.frame === 0 ? s.wave : s.wave + 1,
            timer: waves.general.wave_duration,
            mana: s.mana + (this.frame === 0 ? 0 : balance.rewards.wave_clear_mana)
        }));
    }

    triggerMiracle(type, setStats) {
        if (type === 'FREEZE') {
            this.globalFrozen = 180;
            this.shakeIntensity = 5;
        } else if (type === 'OVERLOAD') {
            setStats(s => ({ ...s, mana: s.mana + 500 }));
            this.shakeIntensity = 12;
        }
    }

    update(stats, setStats, setGameState) {
        const { map, waves, balance, monsters: monData } = this.res;
        if (this.shakeIntensity > 0) this.shakeIntensity *= 0.9;
        if (this.globalFrozen > 0) this.globalFrozen--;

        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => (s.timer > 1 ? { ...s, timer: s.timer - 1 } : (this.startWave(setStats), s)));
        }

        if (this.frame % 60 === 0) {
            this.units.forEach(u => {
                const neighbors = this.units.filter(other => other !== u && Utils.getDist(u, other) < 150);
                u.synergyActive = neighbors.length >= 2;
            });
        }

        if (this.globalFrozen <= 0 && this.spawnPool > 0 && this.frame % waves.general.spawn_interval_frames === 0) {
            const pk = stats.wave > waves.monster_pools.early_game.until_wave ? waves.monster_pools.mid_game.pool : waves.monster_pools.early_game.pool;
            const bT = monData[pk][Math.floor(Math.random() * monData[pk].length)];
            this.enemies.push(new Enemy(bT, map.path, Utils.calcEnemyScaling(stats.wave, balance), balance.difficulty_scaling.enemy_speed_growth, stats.wave));
            this.spawnPool--;
        }

        this.enemies = this.enemies.filter(e => e.state !== ENEMY_STATE.DEAD);
        this.enemies.forEach(e => {
            if (this.globalFrozen <= 0) e.update(map.path, balance, (dmg) => {
                setStats(s => { 
                    const nh = Math.max(0, s.hp - dmg); 
                    if (nh <= 0) setGameState('lost'); 
                    return { ...s, hp: nh }; 
                });
                this.castleHit = true; this.shakeIntensity = 15; 
                setTimeout(() => this.castleHit = false, 200);
            });
        });

        this.units.forEach(u => u.tryFire(this.enemies, this.frame, (src, tar) => {
            const p = this.projectilePool.find(p => !p.active);
            if (p) p.reset(src, tar);
            const fx = this.effectPool.find(f => !f.active);
            if (fx) Object.assign(fx, { x: src.x, y: src.y, type: 'fire', life: 15, color: src.color, active: true });
        }));

        this.projectilePool.forEach(p => {
            if (p.active) p.update((target, dmg) => {
                setStats(s => ({ ...s, mana: s.mana + balance.rewards.kill_mana }));
                const dn = this.damagePool.find(d => !d.active);
                if (dn) dn.reset(target.x, target.y - 20, Math.floor(dmg), "#ffffff");
                const fx = this.effectPool.find(f => !f.active);
                if (fx) Object.assign(fx, { x: target.x, y: target.y, type: 'hit', life: 10, color: '#ffffff', active: true });
            });
        });

        this.damagePool.forEach(d => d.update());
        this.effectPool.forEach(fx => { if (fx.active) { fx.life--; if (fx.life <= 0) fx.active = false; } });
        this.frame++;
    }
}
