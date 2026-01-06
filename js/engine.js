/**
 * js/engine.js - v20.8 穩定版
 * 修復怪物生成機制與波次觸發
 */
import { Enemy, Unit, Projectile } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(res) {
        this.res = res;
        this.units = [];
        this.enemies = [];
        this.projectiles = [];
        this.trees = [];
        this.frame = 0;
        this.spawnPool = 0; // 初始為 0，由外部 startWave 觸發
        this.castleHit = false;
    }

    /**
     * 手動觸發新波次 (解決第一波不產怪的問題)
     */
    startWave(setStats) {
        const { waves, balance } = this.res;
        this.spawnPool += waves.general.monsters_per_wave;
        // 同步更新 React UI
        if (setStats) {
            setStats(s => ({
                ...s,
                timer: waves.general.wave_duration,
                mana: s.mana + (this.frame === 0 ? 0 : balance.rewards.wave_clear_mana)
            }));
        }
    }

    initDecor() {
        this.trees = [];
        for (let i = 0; i < 45; i++) for (let j = 0; j < 13; j++) {
            const tx = i * 50 + 25, ty = j * 50 + 25;
            if (!Utils.isOnPath(tx, ty, this.res.map.path) && Math.random() < 0.1)
                this.trees.push({ x: tx, y: ty, type: Math.random() > 0.5 ? "🌲" : "🌳" });
        }
    }

    deployUnit(unitKey, x, y) {
        const uData = this.res.units[unitKey];
        const newUnit = new Unit(uData, x, y);
        this.units.push(newUnit);
    }

    update(stats, setStats, setGameState) {
        const { map, waves, balance, monsters: monData } = this.res;

        // 1. 時間計時器 (每秒執行一次)
        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => {
                if (s.timer > 0) return { ...s, timer: s.timer - 1 };
                // 時間到，自動下一波
                this.startWave();
                return { ...s, wave: s.wave + 1 };
            });
        }

        // 2. 生成邏輯 (當 Pool 有怪時)
        if (this.spawnPool > 0 && this.frame % waves.general.spawn_interval_frames === 0) {
            const isBoss = stats.wave % waves.general.boss_interval === 0;
            if (isBoss && this.spawnPool >= waves.general.monsters_per_wave) {
                const bT = monData[waves.special_waves[stats.wave]?.boss_id || "boss10"];
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

        // 3. 物理碰撞與 AI
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
            this.projectiles.push(new Projectile(source, target));
        }));

        this.projectiles.forEach(p => p.update((target) => {
            setStats(s => ({ ...s, mana: s.mana + balance.rewards.kill_mana }));
        }));

        // 4. 清理無效物件
        this.enemies = this.enemies.filter(e => !e.dead);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.units = this.units.filter(u => u.currentHp > 0);
        
        this.frame++;
    }
}
