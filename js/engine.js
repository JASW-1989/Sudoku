import { Enemy, Unit, Projectile, ENEMY_STATE } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(res) {
        this.res = res;
        this.units = []; this.enemies = []; this.projectiles = []; this.trees = [];
        this.effects = []; // 用於存放發動技能特效
        this.frame = 0; this.spawnPool = 0; this.castleHit = false;
    }

    /**
     * 修復：強制增援功能恢復
     */
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

        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => {
                if (s.timer > 0) return { ...s, timer: s.timer - 1 };
                this.startWave();
                return { ...s, wave: s.wave + 1 };
            });
        }

        if (this.spawnPool > 0 && this.frame % waves.general.spawn_interval_frames === 0) {
            const isBoss = stats.wave % waves.general.boss_interval === 0;
            if (isBoss && this.spawnPool >= waves.general.monsters_per_wave) {
                const bT = monData[`boss${stats.wave}`] || monData.boss10;
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

        this.enemies.forEach(e => e.update(map.path, balance, (dmg) => {
            setStats(s => { const newHp = Math.max(0, s.hp - dmg); if (newHp <= 0) setGameState('lost'); return { ...s, hp: newHp }; });
            this.castleHit = true; setTimeout(() => { this.castleHit = false; }, 200);
        }));

        this.units.forEach(u => u.tryFire(this.enemies, this.frame, (source, target) => {
            this.projectiles.push(new Projectile(source, target));
            // 特效：女神腳下光環
            this.effects.push({ x: source.x, y: source.y, type: 'fire', life: 15, color: source.color });
        }));

        this.projectiles.forEach(p => p.update((target) => {
            setStats(s => ({ ...s, mana: s.mana + balance.rewards.kill_mana }));
            // 特效：命中爆炸
            this.effects.push({ x: target.x, y: target.y, type: 'hit', life: 10, color: '#ffffff' });
        }));

        // 更新特效生命週期
        this.effects.forEach(fx => fx.life--);
        this.effects = this.effects.filter(fx => fx.life > 0);

        this.enemies = this.enemies.filter(e => e.state !== ENEMY_STATE.DEAD);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.units = this.units.filter(u => u.currentHp > 0);
        this.frame++;
    }
}
