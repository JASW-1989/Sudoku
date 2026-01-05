/**
 * js/engine.js
 * 遊戲指揮中心：負責管理實體、更新邏輯與波次控制
 */

import { Enemy, Unit, Projectile } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(resources) {
        this.res = resources; // 包含 units, monsters, map, waves, balance
        this.units = [];
        this.enemies = [];
        this.projectiles = [];
        this.trees = [];
        
        this.frame = 0;
        this.spawnPool = 0;
        this.castleHit = false;
    }

    /**
     * 初始化戰場環境
     */
    initDecor() {
        const { map } = this.res;
        this.trees = [];
        // 根據地圖網格生成隨機裝飾，避開路徑
        for (let i = 0; i < 45; i++) {
            for (let j = 0; j < 13; j++) {
                const tx = i * 50 + 25;
                const ty = j * 50 + 25;
                if (!Utils.isOnPath(tx, ty, map.path) && Math.random() < 0.1) {
                    this.trees.push({
                        x: tx,
                        y: ty,
                        type: Math.random() > 0.5 ? "🌲" : "🌳"
                    });
                }
            }
        }
    }

    /**
     * 部署新單位
     */
    deployUnit(unitKey, x, y) {
        const uData = this.res.units[unitKey];
        const newUnit = new Unit(uData, x, y);
        this.units.push(newUnit);
        return uData.cost;
    }

    /**
     * 執行一幀的邏輯更新
     */
    update(stats, setStats, setGameState) {
        const { map, waves, balance, monsters: monData } = this.res;

        // 1. 波次倒數與自動增援
        if (this.frame % 60 === 0) {
            if (stats.timer > 0) {
                setStats(s => ({ ...s, timer: s.timer - 1 }));
            } else {
                this.spawnPool += waves.general.monsters_per_wave;
                setStats(s => ({
                    ...s,
                    wave: s.wave + 1,
                    timer: waves.general.wave_duration,
                    mana: s.mana + balance.rewards.wave_clear_mana
                }));
            }
        }

        // 2. 敵人生成邏輯
        if (this.spawnPool > 0 && this.frame % waves.general.spawn_interval_frames === 0) {
            const isBoss = stats.wave % waves.general.boss_interval === 0;
            if (isBoss && this.spawnPool >= waves.general.monsters_per_wave) {
                // 生成 BOSS
                const bossId = waves.special_waves[stats.wave]?.boss_id || "boss10";
                const bData = monData[bossId];
                const scaling = Math.pow(balance.difficulty_scaling.boss_hp_scaling, Math.floor(stats.wave / 10) - 1);
                this.enemies.push(new Enemy(bData, map.path, scaling, 0, stats.wave));
                this.spawnPool -= waves.general.monsters_per_wave;
            } else {
                // 生成普通怪物
                const poolKey = stats.wave > waves.monster_pools.early_game.until_wave ? 
                               waves.monster_pools.mid_game.pool : waves.monster_pools.early_game.pool;
                const pool = monData[poolKey];
                const bData = pool[Math.floor(Math.random() * pool.length)];
                const scaling = Utils.calcEnemyScaling(stats.wave, balance);
                this.enemies.push(new Enemy(bData, map.path, scaling, balance.difficulty_scaling.enemy_speed_growth, stats.wave));
                this.spawnPool--;
            }
        }

        // 3. 更新所有實體行為
        // 更新敵人
        this.enemies.forEach(e => e.update(map.path, balance, (dmg) => {
            // 漏怪懲罰
            setStats(s => {
                const newHp = Math.max(0, s.hp - dmg);
                if (newHp <= 0) setGameState('lost');
                return { ...s, hp: newHp };
            });
            this.castleHit = true;
            setTimeout(() => { this.castleHit = false; }, 200);
        }));

        // 更新女神射擊
        this.units.forEach(u => u.tryFire(this.enemies, this.frame, (unit, target) => {
            this.projectiles.push(new Projectile(unit.x, unit.y, target, unit.damage, unit.color));
        }));

        // 更新投射物
        this.projectiles.forEach(p => p.update((target) => {
            // 擊殺獎勵
            setStats(s => ({ ...s, mana: s.mana + balance.rewards.kill_mana }));
        }));

        // 4. 清理已死亡或失效的實體
        this.enemies = this.enemies.filter(e => !e.dead);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.units = this.units.filter(u => u.currentHp > 0);

        this.frame++;
    }
}
