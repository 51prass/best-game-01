// Everything that lives in the water and everything that bursts out of it: the shadow
// creatures, the light shards they drop, the gold sparks of a kill and the floating score
// numbers. Creatures are plain objects in pools the state owns; nothing here knows about
// the screen or the score, only about moving, hurting and bursting.

import { CREATURE_TYPES, FIELD, HEART, ISLAND } from './config.js';

/** A creature of `type` at (x, y), fresh from the dark. */
export function createCreature(type, x, y, rng) {
  const def = CREATURE_TYPES[type];
  return {
    type,
    def,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * rng.range(0.92, 1.08),
    radius: def.radius,
    // Each creature wobbles on its own phase so the horde never marches in step.
    wobblePhase: rng.range(0, Math.PI * 2),
    wobbleAmp: def.wobble,
    flash: 0,
    dead: false,
    // Seconds until it may be hurt again after a beam tick (unused: damage is per-second).
    age: 0,
  };
}

/** Walk a creature toward the island heart, with its own sideways wobble. */
export function updateCreature(creature, dt) {
  creature.age += dt;
  const dx = HEART.x - creature.x;
  const dy = HEART.y - creature.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wobble = Math.sin(creature.age * 3.1 + creature.wobblePhase) * creature.wobbleAmp;
  // The wobble runs perpendicular to the walk, so the path snakes instead of sliding.
  const px = -dy / dist;
  const py = dx / dist;
  creature.x += (dx / dist) * creature.speed * dt + px * wobble * 22 * dt;
  creature.y += (dy / dist) * creature.speed * dt + py * wobble * 22 * dt;
  if (creature.flash > 0) creature.flash -= dt;
}

/** Hurt a creature; returns true when the hit kills it. */
export function damageCreature(creature, amount) {
  creature.hp -= amount;
  creature.flash = 0.09;
  if (creature.hp <= 0) {
    creature.dead = true;
    return true;
  }
  return false;
}

/** Has this creature reached the island heart? */
export function reachedHeart(creature) {
  const dx = creature.x - HEART.x;
  const dy = creature.y - HEART.y;
  return Math.hypot(dx, dy) < HEART.radius + creature.radius * 0.4;
}

/** Pick a spawn point on the water's edge, away from the island. */
export function spawnPoint(rng) {
  const edge = rng.int(0, 3);
  const margin = 30;
  if (edge === 0) return { x: rng.range(-margin, FIELD.width + margin), y: -margin };
  if (edge === 1) return { x: rng.range(-margin, FIELD.width + margin), y: FIELD.height + margin };
  if (edge === 2) return { x: -margin, y: rng.range(0, FIELD.height) };
  return { x: FIELD.width + margin, y: rng.range(0, FIELD.height) };
}

/** A light shard: it pops out of a kill, then flies home to the lamp to be banked. */
export function createShard(x, y, rng) {
  const angle = rng.range(0, Math.PI * 2);
  const speed = rng.range(60, 160);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 40,
    spin: rng.range(0, Math.PI * 2),
    spinSpeed: rng.range(4, 9),
    life: 0,
    collected: false,
  };
}

export function updateShard(shard, dt, lamp) {
  shard.life += dt;
  if (shard.life < 0.35) {
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.vy += 260 * dt;
  } else {
    // Home in on the lamp, accelerating, until it is banked.
    const dx = lamp.x - shard.x;
    const dy = lamp.y - shard.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = 900 + shard.life * 500;
    shard.x += (dx / dist) * pull * dt;
    shard.y += (dy / dist) * pull * dt;
    if (dist < 26) shard.collected = true;
  }
  shard.spin += shard.spinSpeed * dt;
}

/** A burst of gold sparks where a creature died, or ink where one breached. */
export function createBurst(x, y, count, color, rng) {
  const sparks = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const speed = rng.range(40, 260);
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rng.range(0.3, 0.7),
      maxLife: 0.7,
      size: rng.range(2, 5),
      color,
    });
  }
  return sparks;
}

export function updateSparks(sparks, dt) {
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 1 - 2.4 * dt;
    spark.vy *= 1 - 2.4 * dt;
    if (spark.life <= 0) sparks.splice(i, 1);
  }
}

/** A floating score label that rises and fades. */
export function createFloater(x, y, text, color) {
  return { x, y, text, color, life: 1.1, maxLife: 1.1 };
}

export function updateFloaters(floaters, dt) {
  for (let i = floaters.length - 1; i >= 0; i -= 1) {
    const floater = floaters[i];
    floater.life -= dt;
    floater.y -= 34 * dt;
    if (floater.life <= 0) floaters.splice(i, 1);
  }
}

/** Is the island's rock in the way of this point (for spawn safety)? */
export function onIsland(x, y) {
  const dx = (x - ISLAND.x) / ISLAND.rx;
  const dy = (y - ISLAND.y) / ISLAND.ry;
  return dx * dx + dy * dy < 1;
}
