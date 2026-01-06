import { Enemy, Unit, Projectile, ENEMY_STATE } from './entities.js';
import { Utils } from './utils.js';

export class GameEngine {
    constructor(res) {
        this.res = res;
        this.units = []; this.enemies = []; this.projectiles = []; this.trees = [];
        this.frame = 0; this.spawnPool = 0; this.castleHit = false;
    }

    startWave() {
        this.spawnPool += this.res.waves.general.monsters_per_wave;
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

        // 1. 波次與計時
        if (this.frame > 0 && this.frame % 60 === 0) {
            setStats(s => {
                if (s.timer > 0) return { ...s, timer: s.timer - 1 };
                this.startWave();
                return { ...s, wave: s.wave + 1, mana: s.mana + balance.rewards.wave_clear_mana, timer: waves.general.wave_duration };
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

        // 3. 實體更新 (核心修正：先執行 update 再過濾 DEAD)
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
            // 怪物死亡時由 Projectile 觸發獎勵
            setStats(s => ({ ...s, mana: s.mana + balance.rewards.kill_mana }));
        }));

        // 4. 清理過濾 (解決怪物不消失問題)
        this.enemies = this.enemies.filter(e => e.state !== ENEMY_STATE.DEAD);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.units = this.units.filter(u => u.currentHp > 0);
        
        this.frame++;
    }
}
