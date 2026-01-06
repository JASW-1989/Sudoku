/**
 * js/engine.js - v23.0 邏輯重構
 * 導入 羈絆檢查、神蹟管理、跳字池、畫面震動
 */
import { Enemy, Unit, Projectile, DamageNumber, ENEMY_STATE } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(res) {
        this.res = res;
        this.units = []; this.enemies = []; this.trees = [];
        this.frame = 0; this.spawnPool = 0; this.castleHit = false;
        this.shakeIntensity = 0; // 畫面震動強度

        // 物件池管理
        this.projectilePool = Array.from({ length: 150 }, () => new Projectile());
        this.effectPool = Array.from({ length: 80 }, () => ({ x: 0, y: 0, type: '', life: 0, color: '', active: false }));
        this.damagePool = Array.from({ length: 50 }, () => new DamageNumber());
        
        // 神蹟狀態
        this.globalFrozen = 0;
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

    // 觸發神蹟
    triggerMiracle(type, setStats) {
        if (type === 'FREEZE') {
            this.globalFrozen = 180; // 凍結 3 秒
            this.shakeIntensity = 5;
        } else if (type === 'OVERLOAD') {
            setStats(s => ({ ...s, mana: s.mana + 500 }));
            this.shakeIntensity = 10;
        }
    }

    update(stats, setStats, setGameState) {
        const { map, waves, balance, monsters: monData } = this.res;

        // 1. 基礎計時與震動衰減
        if (this.shakeIntensity > 0) this.shakeIntensity *= 0.9;
        if (this.globalFrozen > 0) this.globalFrozen--;

        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => (s.timer > 1 ? { ...s, timer: s.timer - 1 } : (this.startWave(setStats), s)));
        }

        // 2. 羈絆檢查 (每秒檢查一次以節省效能)
        if (this.frame % 60 === 0) {
            this.units.forEach(u => {
                const neighbors = this.units.filter(other => other !== u && Utils.getDist(u, other) < 150);
                u.synergyActive = neighbors.length >= 2; // 周圍有 2 個以上友軍觸發共鳴
            });
        }

        // 3. 怪物生成 (受凍結影響)
        if (this.globalFrozen <= 0 && this.spawnPool > 0 && this.frame % waves.general.spawn_interval_frames === 0) {
            const pk = stats.wave > waves.monster_pools.early_game.until_wave ? waves.monster_pools.mid_game.pool : waves.monster_pools.early_game.pool;
            const bT = monData[pk][Math.floor(Math.random() * monData[pk].length)];
            this.enemies.push(new Enemy(bT, map.path, Utils.calcEnemyScaling(stats.wave, balance), balance.difficulty_scaling.enemy_speed_growth, stats.wave));
            this.spawnPool--;
        }

        // 4. 實體更新
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
                // 產生跳字
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
