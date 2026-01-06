/**
 * js/engine.js - 導入物件池邏輯 (Object Pooling) (v22.0)
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

        // --- 物件池初始化 ---
        this.projectilePool = Array.from({ length: 100 }, () => new Projectile());
        this.effectPool = Array.from({ length: 50 }, () => ({ x: 0, y: 0, type: '', life: 0, color: '', active: false }));
    }

    /**
     * 從物件池取得可用的子彈
     */
    getProjectile() {
        return this.projectilePool.find(p => !p.active) || null;
    }

    /**
     * 從物件池取得可用的特效
     */
    getEffect() {
        return this.effectPool.find(e => !e.active) || null;
    }

    startWave(setStats) {
        const { waves, balance } = this.res;
        this.spawnPool += waves.general.monsters_per_wave;
        if (setStats) {
            setStats(s => ({
                ...s,
                timer: waves.general.wave_duration,
                mana: s.mana + (this.frame === 0 ? 0 : balance.rewards.wave_clear_mana)
            }));
        }
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

        // 1. 時間與波次
        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => {
                if (s.timer > 0) return { ...s, timer: s.timer - 1 };
                this.startWave();
                return { ...s, wave: s.wave + 1 };
            });
        }

        // 2. 怪物生成
        if (this.spawnPool > 0 && this.frame % waves.general.spawn_interval_frames === 0) {
            const isBoss = stats.wave % waves.general.boss_interval === 0;
            if (isBoss && this.spawnPool >= waves.general.monsters_per_wave) {
                const bT = monData[`boss${stats.wave}`] || monData.boss10;
                this.enemies.push(new Enemy(bT, map.path, Math.pow(balance.difficulty_scaling.boss_hp_scaling, Math.floor(stats.wave/10)-1), 0, stats.wave));
                this.spawnPool -= waves.general.monsters_per_wave;
            } else {
                const pk = stats.wave > waves.monster_pools.early_game.until_wave ? waves.monster_pools.mid_game.pool : waves.monster_pools.early_game.pool;
                const bT = monData[pk][Math.floor(Math.random() * monData[pk].length)];
                this.enemies.push(new Enemy(bT, map.path, Utils.calcEnemyScaling(stats.wave, balance), balance.difficulty_scaling.enemy_speed_growth, stats.wave));
                this.spawnPool--;
            }
        }

        // 3. 實體與物件池更新
        this.enemies.forEach(e => e.update(map.path, balance, (dmg) => {
            setStats(s => { const newHp = Math.max(0, s.hp - dmg); if (newHp <= 0) setGameState('lost'); return { ...s, hp: newHp }; });
            this.castleHit = true; setTimeout(() => { this.castleHit = false; }, 200);
        }));

        this.units.forEach(u => u.tryFire(this.enemies, this.frame, (source, target) => {
            // 利用物件池發射子彈
            const p = this.getProjectile();
            if (p) p.reset(source, target);

            // 利用物件池發動特效
            const fx = this.getEffect();
            if (fx) {
                Object.assign(fx, { x: source.x, y: source.y, type: 'fire', life: 15, color: source.color, active: true });
            }
        }));

        this.projectilePool.forEach(p => {
            if (p.active) p.update((target) => {
                setStats(s => ({ ...s, mana: s.mana + balance.rewards.kill_mana }));
                const fx = this.getEffect();
                if (fx) {
                    Object.assign(fx, { x: target.x, y: target.y, type: 'hit', life: 10, color: '#ffffff', active: true });
                }
            });
        });

        // 更新特效生命週期 (物件池管理)
        this.effectPool.forEach(fx => {
            if (fx.active) {
                fx.life--;
                if (fx.life <= 0) fx.active = false;
            }
        });

        // 4. 清理活躍實體清單
        this.enemies = this.enemies.filter(e => e.state !== ENEMY_STATE.DEAD);
        this.units = this.units.filter(u => u.currentHp > 0);
        this.frame++;
    }
}
