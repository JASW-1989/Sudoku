/**
 * js/engine.js - v25.6 (解決擊殺掉落與即時觸發)
 */
import { Enemy, Unit, Projectile, DamageNumber, ENEMY_STATE } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(res) {
        this.res = res;
        this.units = []; this.enemies = []; this.trees = [];
        this.frame = 0; this.spawnPool = 0; this.spawnTimer = 0;
        this.castleHit = false; this.shakeIntensity = 0; this.globalFrozen = 0;
        this.projectilePool = Array.from({ length: 150 }, () => new Projectile());
        this.effectPool = Array.from({ length: 80 }, () => ({ x: 0, y: 0, type: '', life: 0, color: '', active: false }));
        this.damagePool = Array.from({ length: 60 }, () => new DamageNumber());
    }

    initDecor() {
        const gS = this.res.map.grid_size || 50;
        this.trees = [];
        for (let i = 0; i < 45; i++) for (let j = 0; j < 13; j++) {
            const tx = i * gS + gS/2, ty = j * gS + gS/2;
            if (!Utils.isOnPath(tx, ty, this.res.map.path)) {
                const r = Math.random();
                if (r < 0.08) this.trees.push({ x: tx, y: ty, type: Math.random() > 0.5 ? "🌲" : "🌳" });
                else if (r < 0.12) this.trees.push({ x: tx, y: ty, type: "🌿" });
            }
        }
    }

    startWave(setStats) {
        const { waves, balance } = this.res;
        this.spawnPool += waves.general.monsters_per_wave;
        this.spawnTimer = 9999; 
        if (setStats) {
            setStats(s => ({
                ...s, wave: this.frame === 0 ? s.wave : s.wave + 1,
                timer: waves.general.wave_duration,
                mana: s.mana + (this.frame === 0 ? 0 : balance.rewards.wave_clear_mana)
            }));
        }
    }

    triggerMiracle(type, setStats) {
        if (type === 'FREEZE') { this.globalFrozen = 180; this.shakeIntensity = 5; } 
        else if (type === 'OVERLOAD') { 
            this.shakeIntensity = 25; 
            // 過載擊殺獎勵邏輯
            let kills = 0;
            this.enemies.forEach(e => {
                if (e.state !== ENEMY_STATE.DEAD) {
                    e.currentHp -= 500;
                    const dn = this.damagePool.find(d => !d.active);
                    if (dn) dn.reset(e.x, e.y - 30, 500, "#ffcc00");
                    if (e.currentHp <= 0) { e.state = ENEMY_STATE.DEAD; kills++; }
                }
            });
            // 法力回報與擊殺獎勵補回
            const reward = 500 + (kills * (this.res.balance.rewards.kill_mana || 150));
            setStats(s => ({ ...s, mana: s.mana + reward }));
        }
    }

    update(stats, setStats, setGameState) {
        const { map, waves, balance, monsters: monData } = this.res;
        if (this.shakeIntensity > 0) this.shakeIntensity *= 0.92;
        if (this.globalFrozen > 0) this.globalFrozen--;

        // 1. 每幀開始清理屍體
        this.enemies = this.enemies.filter(e => e.state !== ENEMY_STATE.DEAD);

        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => (s.timer > 1 ? { ...s, timer: s.timer - 1 } : (this.startWave(setStats), s)));
        }

        // 勝利判定
        if (stats.wave >= waves.general.campaign_end_wave && this.spawnPool <= 0 && this.enemies.length === 0) {
            setGameState('won'); return;
        }

        // 2. 怪物生成
        const baseInterval = waves.general.spawn_interval_frames || 70;
        this.spawnTimer++;
        if (this.globalFrozen <= 0 && this.spawnPool > 0 && this.spawnTimer >= baseInterval) {
            this.spawnTimer = 0;
            const burstCount = Math.max(1, Math.min(3, Math.floor(this.spawnPool / 20)));
            for (let i = 0; i < burstCount; i++) {
                if (this.spawnPool <= 0) break;
                const isBoss = stats.wave % waves.general.boss_interval === 0 && this.spawnPool >= 20;
                if (isBoss && i === 0) {
                    const bossT = monData[waves.special_waves[stats.wave]?.boss_id || "boss10"];
                    const sc = Math.pow(balance.difficulty_scaling.boss_hp_scaling, Math.floor(stats.wave/10)-1);
                    this.enemies.push(new Enemy(bossT, map.path, sc, 0, stats.wave));
                    this.spawnPool -= 20;
                } else {
                    const pk = stats.wave > waves.monster_pools.early_game.until_wave ? waves.monster_pools.mid_game.pool : waves.monster_pools.early_game.pool;
                    const pool = monData[pk] || monData.phase1;
                    this.enemies.push(new Enemy(pool[Math.floor(Math.random() * pool.length)], map.path, Utils.calcEnemyScaling(stats.wave, balance), balance.difficulty_scaling.enemy_speed_growth, stats.wave));
                    this.spawnPool--;
                }
            }
        }

        // 3. 戰鬥與擊殺獎勵
        this.enemies.forEach(e => {
            if (!e.blocker) {
                const b = this.units.find(u => u.type?.includes('TANK') && Utils.getDist(u, e) < 30);
                if (b) e.blocker = b;
            }
            if (this.globalFrozen <= 0) e.update(map.path, balance, (dmg) => {
                setStats(s => { 
                    const nh = Math.max(0, s.hp - (Number(dmg) || 0)); 
                    if (nh <= 0) setGameState('lost'); 
                    return { ...s, hp: nh }; 
                });
                this.castleHit = true; this.shakeIntensity = 15; setTimeout(() => this.castleHit = false, 200);
            });
        });

        this.units.forEach(u => u.tryFire(this.enemies, this.frame, (src, tar) => {
            const p = this.projectilePool.find(p => !p.active);
            if (p) p.reset(src, tar);
            const fx = this.effectPool.find(f => !f.active);
            if (fx) Object.assign(fx, { x: src.x, y: src.y, type: 'fire', life: 15, color: src.color, active: true });
        }));

        this.projectilePool.forEach(p => {
            if (p.active) p.update((target, dmg, isKill) => {
                // 修復：正確判斷擊殺並掉落 Mana
                if (isKill) {
                    setStats(s => ({ ...s, mana: s.mana + (balance.rewards.kill_mana || 150) }));
                }
                const dn = this.damagePool.find(d => !d.active);
                if (dn) dn.reset(target.x, target.y - 20, dmg);
                const fx = this.effectPool.find(f => !f.active);
                if (fx) Object.assign(fx, { x: target.x, y: target.y, type: 'hit', life: 10, color: '#ffffff', active: true });
            });
        });

        this.damagePool.forEach(d => d.update());
        this.effectPool.forEach(fx => { if (fx.active) { fx.life--; if (fx.life <= 0) fx.active = false; } });
        this.frame++;
    }
}
