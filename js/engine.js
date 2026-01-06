/**
 * js/engine.js - v22.2 核心邏輯修正版
 * 1. 修正怪物血量歸零不消失問題
 * 2. 統一波段與計時器管理邏輯
 */
import { Enemy, Unit, Projectile, ENEMY_STATE } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(res) {
        this.res = res;
        this.units = [];
        this.enemies = [];
        this.trees = [];
        this.frame = 0;
        this.spawnPool = 0;
        this.castleHit = false;

        // 物件池初始化
        this.projectilePool = Array.from({ length: 150 }, () => new Projectile());
        this.effectPool = Array.from({ length: 80 }, () => ({ x: 0, y: 0, type: '', life: 0, color: '', active: false }));
    }

    getProjectile() {
        return this.projectilePool.find(p => !p.active) || null;
    }

    getEffect() {
        return this.effectPool.find(e => !e.active) || null;
    }

    /**
     * 更新波段與計時器 (統一由此管理)
     */
    startWave(setStats) {
        const { waves, balance } = this.res;
        this.spawnPool += waves.general.monsters_per_wave;
        
        setStats(s => ({
            ...s,
            // 修正：波段增加發生在計時器重置時
            wave: this.frame === 0 ? s.wave : s.wave + 1,
            timer: waves.general.wave_duration,
            mana: s.mana + (this.frame === 0 ? 0 : balance.rewards.wave_clear_mana)
        }));
    }

    initDecor() {
        const gS = this.res.map.grid_size || 50;
        this.trees = [];
        for (let i = 0; i < 45; i++) for (let j = 0; j < 13; j++) {
            const tx = i * gS + gS/2, ty = j * gS + gS/2;
            if (!Utils.isOnPath(tx, ty, this.res.map.path) && Math.random() < 0.1)
                this.trees.push({ x: tx, y: ty, type: Math.random() > 0.5 ? "🌲" : "🌳" });
        }
    }

    deployUnit(unitKey, x, y) {
        this.units.push(new Unit(this.res.units[unitKey], x, y));
    }

    update(stats, setStats, setGameState) {
        const { map, waves, balance, monsters: monData } = this.res;

        // 1. 時間計時邏輯 (每 60 幀為一秒)
        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => {
                if (s.timer > 1) {
                    return { ...s, timer: s.timer - 1 };
                } else {
                    // 秒數歸零，觸發下一波
                    this.startWave(setStats);
                    return s; // startWave 會負責更新 state
                }
            });
        }

        // 2. 怪物生成管理
        if (this.spawnPool > 0 && this.frame % waves.general.spawn_interval_frames === 0) {
            const isBoss = stats.wave % waves.general.boss_interval === 0;
            if (isBoss && this.spawnPool >= waves.general.monsters_per_wave) {
                const bossId = waves.special_waves[stats.wave]?.boss_id || "boss10";
                const bT = monData[bossId];
                const sc = Math.pow(balance.difficulty_scaling.boss_hp_scaling, Math.floor(stats.wave/10)-1);
                this.enemies.push(new Enemy(bT, map.path, sc, 0, stats.wave));
                this.spawnPool -= waves.general.monsters_per_wave;
            } else {
                const pk = stats.wave > waves.monster_pools.early_game.until_wave ? waves.monster_pools.mid_game.pool : waves.monster_pools.early_game.pool;
                const pool = monData[pk] || monData.phase1;
                const bT = pool[Math.floor(Math.random() * pool.length)];
                this.enemies.push(new Enemy(bT, map.path, Utils.calcEnemyScaling(stats.wave, balance), balance.difficulty_scaling.enemy_speed_growth, stats.wave));
                this.spawnPool--;
            }
        }

        // 3. 實體狀態更新
        // 重要：在更新前先過濾掉已經 DEAD 的怪物
        this.enemies = this.enemies.filter(e => e.state !== ENEMY_STATE.DEAD);

        this.enemies.forEach(e => e.update(map.path, balance, (dmg) => {
            setStats(s => {
                const newHp = Math.max(0, s.hp - dmg);
                if (newHp <= 0) setGameState('lost');
                return { ...s, hp: newHp };
            });
            this.castleHit = true; 
            setTimeout(() => { this.castleHit = false; }, 200);
        }));

        this.units.forEach(u => u.tryFire(this.enemies, this.frame, (source, target) => {
            const p = this.getProjectile();
            if (p) p.reset(source, target);
            const fx = this.getEffect();
            if (fx) Object.assign(fx, { x: source.x, y: source.y, type: 'fire', life: 15, color: source.color, active: true });
        }));

        this.projectilePool.forEach(p => {
            if (p.active) p.update((target) => {
                setStats(s => ({ ...s, mana: s.mana + balance.rewards.kill_mana }));
                const fx = this.getEffect();
                if (fx) Object.assign(fx, { x: target.x, y: target.y, type: 'hit', life: 10, color: '#ffffff', active: true });
            });
        });

        this.effectPool.forEach(fx => {
            if (fx.active) {
                fx.life--;
                if (fx.life <= 0) fx.active = false;
            }
        });

        // 4. 清理活躍實體清單
        this.units = this.units.filter(u => u.currentHp > 0);
        this.frame++;
    }
}
