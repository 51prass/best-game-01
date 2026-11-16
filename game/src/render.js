// Everything the eye sees, and nothing else: the night sky, the sea, the island, the
// lighthouse and its beam, the creatures, the shards, the HUD and every screen. The
// renderer only reads the state — it never writes it — so a frame is a pure picture of
// the night as it stands. The canvas is a fixed 1280x720 logical field, letterboxed to
// the window.

import { BEAM, FIELD, HEART, ISLAND, LAMP, LAST_WAVE, PALETTE, FONT } from './config.js';
import { SCREEN_LOSE, SCREEN_PAUSED, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';
import { shopList } from './upgrades.js';

/** The shop's card and button boxes, in logical coordinates (shared with main.js). */
export const UPGRADE_PANEL = { x: 140, y: 140, w: 1000, h: 430 };
export function upgradeCardRect(index) {
  return { x: 150 + index * 250, y: 260, w: 230, h: 220 };
}
export const UPGRADE_CONTINUE = { x: 480, y: 505, w: 320, h: 44 };
export const WIN_ENDLESS = { x: 440, y: 468, w: 400, h: 48 };
export const WIN_RESTART = { x: 440, y: 528, w: 400, h: 48 };

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function createRenderer(canvas, rng) {
  const ctx = canvas.getContext('2d');

  // The stars are fixed by the seed, so the sky never reshuffles between frames.
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: rng.range(0, FIELD.width),
      y: rng.range(0, 420),
      r: rng.range(0.6, 2.1),
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.4, 1.4),
    });
  }

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  window.addEventListener('resize', fit);
  fit();

  function drawSky(now) {
    const sky = ctx.createLinearGradient(0, 0, 0, 430);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, 430);
    for (const star of stars) {
      const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now * star.speed + star.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // The pale moon, top right, with its halo.
    const glow = ctx.createRadialGradient(1120, 108, 10, 1120, 108, 120);
    glow.addColorStop(0, PALETTE.moonGlow);
    glow.addColorStop(1, 'rgba(233, 237, 246, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(1000, -12, 240, 240);
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(1120, 108, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 190, 210, 0.5)';
    ctx.beginPath();
    ctx.arc(1106, 96, 9, 0, Math.PI * 2);
    ctx.arc(1132, 120, 6, 0, Math.PI * 2);
    ctx.arc(1116, 126, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSea(now) {
    const sea = ctx.createLinearGradient(0, 380, 0, FIELD.height);
    sea.addColorStop(0, PALETTE.seaTop);
    sea.addColorStop(1, PALETTE.seaBottom);
    ctx.fillStyle = sea;
    ctx.fillRect(0, 380, FIELD.width, FIELD.height - 380);
    // Slow swells, and a pale shimmer under the moon.
    ctx.strokeStyle = 'rgba(140, 170, 220, 0.10)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 5; row += 1) {
      const y = 420 + row * 62;
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 16) {
        const wave = Math.sin(x * 0.012 + now * 0.7 + row * 1.7) * 5;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(233, 237, 246, 0.10)';
    for (let i = 0; i < 4; i += 1) {
      const y = 470 + i * 56;
      const w = 90 - i * 14 + Math.sin(now + i) * 8;
      ctx.beginPath();
      ctx.moveTo(1120 - w, y);
      ctx.lineTo(1120 + w, y);
      ctx.stroke();
    }
  }

  function drawIsland(now) {
    // Warm lamp-light pooled on the rock around the tower's foot.
    const pool = ctx.createRadialGradient(HEART.x, HEART.y + 30, 10, HEART.x, HEART.y + 30, 190);
    pool.addColorStop(0, 'rgba(255, 215, 106, 0.20)');
    pool.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(HEART.x - 200, HEART.y - 160, 400, 380);
    ctx.fillStyle = PALETTE.rock;
    ctx.beginPath();
    ctx.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx, ISLAND.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.rockRim;
    ctx.lineWidth = 3;
    ctx.stroke();
    // A few pale stones on the rock, catching the light.
    ctx.fillStyle = '#2c3850';
    const stones = [[520, 640], [740, 650], [600, 668], [700, 668]];
    for (const [sx, sy] of stones) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The tide line, breathing with the swell.
    ctx.strokeStyle = 'rgba(140, 170, 220, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(ISLAND.x, ISLAND.y + 6 + Math.sin(now * 0.8) * 2, ISLAND.rx + 8, ISLAND.ry + 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawLighthouse(now) {
    const x = LAMP.x;
    // Tower: a tapered cream shaft from the rock to the lamp room.
    ctx.fillStyle = PALETTE.tower;
    ctx.beginPath();
    ctx.moveTo(x - 34, 640);
    ctx.lineTo(x - 22, 500);
    ctx.lineTo(x + 22, 500);
    ctx.lineTo(x + 34, 640);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.towerShade;
    ctx.beginPath();
    ctx.moveTo(x + 8, 640);
    ctx.lineTo(x + 4, 500);
    ctx.lineTo(x + 22, 500);
    ctx.lineTo(x + 34, 640);
    ctx.closePath();
    ctx.fill();
    // The red band and a warm window.
    ctx.fillStyle = PALETTE.towerBand;
    ctx.fillRect(x - 26, 556, 52, 16);
    ctx.fillStyle = '#ffdf8a';
    roundedRect(ctx, x - 7, 516, 14, 20, 4);
    ctx.fill();
    // Lamp room: dark housing, glowing glass, cap.
    ctx.fillStyle = PALETTE.roof;
    ctx.beginPath();
    ctx.moveTo(x - 30, 500);
    ctx.lineTo(x - 26, 462);
    ctx.lineTo(x + 26, 462);
    ctx.lineTo(x + 30, 500);
    ctx.closePath();
    ctx.fill();
    const lampGlow = ctx.createRadialGradient(x, LAMP.y, 4, x, LAMP.y, 60);
    lampGlow.addColorStop(0, 'rgba(255, 215, 106, 0.85)');
    lampGlow.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(x - 60, LAMP.y - 60, 120, 120);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(x, LAMP.y, 13 + Math.sin(now * 2.2) * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.roof;
    ctx.beginPath();
    ctx.moveTo(x - 30, 462);
    ctx.lineTo(x, 438);
    ctx.lineTo(x + 30, 462);
    ctx.closePath();
    ctx.fill();
  }

  function drawBeam(state, now) {
    const x = LAMP.x;
    const y = LAMP.y;
    const angle = state.aimAngle;
    // A faint aim line even when the lamp rests, so the player always knows where the
    // beam will point; the live beam is a layered cone that flickers like a flame.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (!state.beamOn) {
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.20)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(300, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const flicker = 1 + Math.sin(now * 31) * 0.05 + Math.sin(now * 57) * 0.03;
      const half = state.beamHalf * flicker;
      const reach = BEAM.range;
      const cone = ctx.createLinearGradient(0, 0, reach, 0);
      cone.addColorStop(0, 'rgba(255, 226, 140, 0.55)');
      cone.addColorStop(0.6, 'rgba(255, 215, 106, 0.28)');
      cone.addColorStop(1, 'rgba(255, 215, 106, 0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(half) * reach, Math.sin(half) * reach);
      ctx.lineTo(Math.cos(-half) * reach, Math.sin(-half) * reach);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.beamCore;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(reach * 0.92, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 236, 170, 0.25)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(reach * 0.8, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCreature(creature) {
    const def = creature.def;
    const dx = HEART.x - creature.x;
    const dy = HEART.y - creature.y;
    const look = Math.atan2(dy, dx);
    const ex = Math.cos(look);
    const ey = Math.sin(look);
    ctx.save();
    ctx.translate(creature.x, creature.y);
    // A faint halo in the creature's eye colour, so the dark reads against the dark sea.
    const halo = ctx.createRadialGradient(0, 0, def.radius * 0.4, 0, 0, def.radius * 2.4);
    halo.addColorStop(0, def.eye + '2e');
    halo.addColorStop(1, def.eye + '00');
    ctx.fillStyle = halo;
    ctx.fillRect(-def.radius * 2.4, -def.radius * 2.4, def.radius * 4.8, def.radius * 4.8);
    ctx.fillStyle = creature.flash > 0 ? '#ffe9a8' : def.body;
    ctx.strokeStyle = def.rim;
    ctx.lineWidth = 2;
    if (creature.type === 'crawler') {
      ctx.beginPath();
      ctx.ellipse(0, 0, def.radius + 3, def.radius - 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = def.rim;
      for (let leg = -1; leg <= 1; leg += 1) {
        ctx.beginPath();
        ctx.moveTo(leg * 8, 6);
        ctx.lineTo(leg * 12, 16);
        ctx.stroke();
      }
    } else if (creature.type === 'skitterer') {
      ctx.rotate(look);
      ctx.beginPath();
      ctx.moveTo(def.radius + 6, 0);
      ctx.lineTo(-def.radius, -def.radius * 0.8);
      ctx.lineTo(-def.radius * 0.5, 0);
      ctx.lineTo(-def.radius, def.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-look);
    } else if (creature.type === 'brute') {
      ctx.beginPath();
      ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = def.rim;
      ctx.beginPath();
      ctx.arc(0, 0, def.radius - 7, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + creature.age * 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (def.radius - 2), Math.sin(a) * (def.radius - 2));
        ctx.lineTo(Math.cos(a) * (def.radius + 7), Math.sin(a) * (def.radius + 7));
        ctx.stroke();
      }
    } else if (creature.type === 'splitter') {
      ctx.beginPath();
      ctx.arc(-7, 0, def.radius * 0.72, 0, Math.PI * 2);
      ctx.arc(7, 0, def.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Wisp: a small glowing orb.
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, def.radius + 8);
      glow.addColorStop(0, 'rgba(201, 167, 255, 0.5)');
      glow.addColorStop(1, 'rgba(201, 167, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-def.radius - 10, -def.radius - 10, (def.radius + 10) * 2, (def.radius + 10) * 2);
      ctx.fillStyle = creature.flash > 0 ? '#ffe9a8' : def.body;
      ctx.beginPath();
      ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Two glowing eyes, always looking at the light they want to eat.
    ctx.fillStyle = def.eye;
    const eyeOff = def.radius * 0.38;
    const eyeFwd = def.radius * 0.3;
    ctx.beginPath();
    ctx.arc(ex * eyeFwd - ey * eyeOff, ey * eyeFwd + ex * eyeOff, 2.6, 0, Math.PI * 2);
    ctx.arc(ex * eyeFwd + ey * eyeOff, ey * eyeFwd - ex * eyeOff, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // A thin health bar over anything the beam has already hurt.
    if (creature.hp < creature.maxHp) {
      const w = def.radius * 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(creature.x - w / 2, creature.y - def.radius - 12, w, 4);
      ctx.fillStyle = creature.hp / creature.maxHp > 0.4 ? '#ffd76a' : '#ff5d6c';
      ctx.fillRect(creature.x - w / 2, creature.y - def.radius - 12, w * (creature.hp / creature.maxHp), 4);
    }
  }

  function drawShards(state) {
    for (const shard of state.shardsFlying) {
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.spin);
      ctx.fillStyle = PALETTE.shard;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSparks(state) {
    for (const spark of state.sparks) {
      ctx.globalAlpha = Math.max(0, spark.life / spark.maxLife);
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    for (const floater of state.floaters) {
      ctx.globalAlpha = Math.max(0, floater.life / floater.maxLife);
      text(ctx, floater.text, floater.x, floater.y, 18, floater.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawHeart(x, y, filled, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-11, -4, -6, -12, 0, -5);
    ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHUD(state, best) {
    // Top bar: hearts and wave on the left, score in the middle, shards on the right.
    ctx.fillStyle = 'rgba(4, 10, 22, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, 52);
    for (let i = 0; i < state.maxHearts; i += 1) {
      drawHeart(30 + i * 30, 26, i < state.hearts);
    }
    const waveLabel = state.wave === 0 ? 'NIGHT FALLS' : `WAVE ${state.wave}${state.wave > LAST_WAVE ? ' · ENDLESS' : ` / ${LAST_WAVE}`}`;
    text(ctx, waveLabel, 30 + state.maxHearts * 30 + 12, 27, 20, PALETTE.text, 'left');
    text(ctx, `SCORE  ${state.score}`, FIELD.width / 2, 22, 26, PALETTE.text);
    text(ctx, `BEST  ${Math.max(best, state.score)}`, FIELD.width / 2, 44, 13, PALETTE.muted);
    // Shards, with a little diamond.
    ctx.save();
    ctx.translate(FIELD.width - 118, 26);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.shard;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
    text(ctx, `${state.shards}`, FIELD.width - 96, 27, 22, PALETTE.shard, 'left');
    // Remaining creatures in this wave.
    if (state.screen === 'play' || state.screen === 'paused') {
      text(ctx, `${state.waveRemaining} IN THE DARK`, FIELD.width - 30, 44, 13, PALETTE.muted, 'right');
    }
    // Heat bar, bottom centre.
    const bw = 260;
    const bx = (FIELD.width - bw) / 2;
    const by = FIELD.height - 30;
    ctx.fillStyle = 'rgba(4, 10, 22, 0.6)';
    roundedRect(ctx, bx - 8, by - 8, bw + 16, 26, 8);
    ctx.fill();
    text(ctx, 'HEAT', bx - 16, by + 2, 13, PALETTE.muted, 'right');
    ctx.fillStyle = '#1a2636';
    ctx.fillRect(bx, by - 5, bw, 10);
    const heatColor = state.overheated ? '#ff5d6c' : state.heat > 70 ? '#ff9d4d' : '#ffd76a';
    ctx.fillStyle = heatColor;
    ctx.fillRect(bx, by - 5, bw * Math.min(1, state.heat / 100), 10);
    if (state.overheated) {
      text(ctx, 'OVERHEATED', bx + bw / 2, by - 22, 14, PALETTE.danger);
    }
    // Mute state, bottom right.
    text(ctx, 'M — SOUND ' + (state.muted ? 'OFF' : 'ON'), FIELD.width - 24, FIELD.height - 18, 12, PALETTE.muted, 'right');
  }

  function drawBanner(state) {
    // The upgrade panel already says the wave is cleared; the banner would print
    // through it.
    if (state.bannerTime <= 0 || state.screen === SCREEN_UPGRADE) return;
    const alpha = Math.min(1, state.bannerTime / 0.5);
    ctx.globalAlpha = alpha;
    text(ctx, state.banner, FIELD.width / 2, 150, 44, PALETTE.text);
    ctx.globalAlpha = 1;
  }

  function dim(alpha) {
    ctx.fillStyle = `rgba(3, 7, 16, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best) {
    dim(0.42);
    text(ctx, 'LUMEN', FIELD.width / 2, 210, 92, '#ffd76a');
    text(ctx, 'KEEPER OF THE LAST LIGHT', FIELD.width / 2, 268, 24, PALETTE.text);
    text(ctx, 'The dark has swallowed every shore but one. The creatures crawl out of the', FIELD.width / 2, 330, 18, PALETTE.muted, 'center', 'normal');
    text(ctx, 'sea to eat the last light — and you are the keeper holding the beam.', FIELD.width / 2, 354, 18, PALETTE.muted, 'center', 'normal');
    text(ctx, 'MOUSE — aim the beam      CLICK / SPACE — burn the dark', FIELD.width / 2, 420, 18, PALETTE.text, 'center', 'normal');
    text(ctx, 'P — pause      R — restart      M — sound', FIELD.width / 2, 448, 18, PALETTE.text, 'center', 'normal');
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text(ctx, 'CLICK OR PRESS SPACE TO BEGIN', FIELD.width / 2, 520, 24, '#ffd76a');
    ctx.globalAlpha = 1;
    if (best > 0) text(ctx, `BEST SCORE  ${best}`, FIELD.width / 2, 566, 16, PALETTE.muted);
  }

  function drawUpgrade(state) {
    dim(0.6);
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundedRect(ctx, UPGRADE_PANEL.x, UPGRADE_PANEL.y, UPGRADE_PANEL.w, UPGRADE_PANEL.h, 14);
    ctx.fill();
    ctx.stroke();
    text(ctx, 'THE NIGHT PAUSES', FIELD.width / 2, 178, 30, PALETTE.text);
    text(ctx, `Wave ${state.wave} is cleared — spend your light shards before the next wave.`, FIELD.width / 2, 212, 16, PALETTE.muted, 'center', 'normal');
    ctx.save();
    ctx.translate(FIELD.width / 2, 240);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.shard;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    text(ctx, `${state.shards} SHARDS`, FIELD.width / 2 + 16, 240, 20, PALETTE.shard, 'left');
    const items = shopList(state);
    items.forEach((item, index) => {
      const rect = upgradeCardRect(index);
      ctx.fillStyle = item.affordable ? 'rgba(255, 215, 106, 0.12)' : 'rgba(20, 30, 50, 0.6)';
      ctx.strokeStyle = item.affordable ? '#ffd76a' : PALETTE.panelEdge;
      ctx.lineWidth = item.affordable ? 2 : 1;
      roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.stroke();
      text(ctx, `[ ${item.def.key} ]`, rect.x + rect.w / 2, rect.y + 26, 15, PALETTE.muted);
      text(ctx, item.def.name, rect.x + rect.w / 2, rect.y + 56, 19, PALETTE.text);
      // Level pips.
      for (let p = 0; p < item.def.max; p += 1) {
        ctx.fillStyle = p < item.level ? '#ffd76a' : '#2c3850';
        ctx.beginPath();
        ctx.arc(rect.x + rect.w / 2 - (item.def.max - 1) * 11 + p * 22, rect.y + 84, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Description, wrapped over two lines by hand.
      const words = item.def.desc.split(' ');
      let line = '';
      let lineY = rect.y + 116;
      ctx.font = `normal 14px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 26) {
          ctx.fillText(line.trim(), rect.x + rect.w / 2, lineY);
          line = word;
          lineY += 18;
        } else {
          line += ' ' + word;
        }
      }
      ctx.fillText(line.trim(), rect.x + rect.w / 2, lineY);
      if (item.maxed) {
        text(ctx, 'MAXED', rect.x + rect.w / 2, rect.y + 190, 16, PALETTE.good);
      } else {
        text(ctx, `${item.cost} ◆ SHARDS`, rect.x + rect.w / 2, rect.y + 190, 16, item.affordable ? PALETTE.shard : PALETTE.muted);
      }
    });
    ctx.fillStyle = '#ffd76a';
    roundedRect(ctx, UPGRADE_CONTINUE.x, UPGRADE_CONTINUE.y, UPGRADE_CONTINUE.w, UPGRADE_CONTINUE.h, 10);
    ctx.fill();
    text(ctx, `BEGIN WAVE ${state.wave + 1}  (ENTER)`, FIELD.width / 2, UPGRADE_CONTINUE.y + 22, 18, '#1a1405');
  }

  function drawEnd(state, won, best) {
    dim(0.55);
    if (won) {
      text(ctx, 'THE DAWN BREAKS', FIELD.width / 2, 190, 56, '#ffd76a');
      text(ctx, 'Ten waves of dark, and the light still stands. The shore remembers.', FIELD.width / 2, 250, 18, PALETTE.muted, 'center', 'normal');
    } else {
      text(ctx, 'THE LIGHT GOES OUT', FIELD.width / 2, 190, 56, PALETTE.danger);
      text(ctx, `The dark took the lighthouse on wave ${state.wave}.`, FIELD.width / 2, 250, 18, PALETTE.muted, 'center', 'normal');
    }
    text(ctx, `SCORE  ${state.score}`, FIELD.width / 2, 320, 30, PALETTE.text);
    text(ctx, `BEST  ${Math.max(best, state.score)}`, FIELD.width / 2, 356, 18, PALETTE.muted);
    text(ctx, `Waves held: ${won ? LAST_WAVE : Math.max(0, state.wave - 1)}      Creatures burned: ${state.kills}      Shards banked: ${state.shards}`, FIELD.width / 2, 400, 16, PALETTE.muted, 'center', 'normal');
    if (won) {
      ctx.fillStyle = '#ffd76a';
      roundedRect(ctx, WIN_ENDLESS.x, WIN_ENDLESS.y, WIN_ENDLESS.w, WIN_ENDLESS.h, 10);
      ctx.fill();
      text(ctx, 'KEEP GOING — ENDLESS  (E)', FIELD.width / 2, WIN_ENDLESS.y + 24, 18, '#1a1405');
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 2;
      roundedRect(ctx, WIN_RESTART.x, WIN_RESTART.y, WIN_RESTART.w, WIN_RESTART.h, 10);
      ctx.stroke();
      text(ctx, 'PLAY AGAIN  (R)', FIELD.width / 2, WIN_RESTART.y + 24, 18, PALETTE.text);
    } else {
      const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
      ctx.globalAlpha = pulse;
      text(ctx, 'PRESS R OR CLICK TO TRY AGAIN', FIELD.width / 2, 500, 22, '#ffd76a');
      ctx.globalAlpha = 1;
    }
  }

  function drawPaused() {
    dim(0.6);
    text(ctx, 'PAUSED', FIELD.width / 2, 300, 56, PALETTE.text);
    text(ctx, 'P or ESC to keep the light burning', FIELD.width / 2, 360, 18, PALETTE.muted, 'center', 'normal');
  }

  function drawVignette() {
    const vignette = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.95,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  return {
    draw(state, screen, best, now) {
      ctx.save();
      if (state.shake > 0) {
        const mag = state.shake * 14;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }
      drawSky(now);
      drawSea(now);
      drawIsland(now);
      drawLighthouse(now);
      if (screen !== SCREEN_TITLE) drawBeam(state, now);
      else drawBeam({ ...state, beamOn: false, aimAngle: -Math.PI / 2 + Math.sin(now * 0.25) * 0.9 }, now);
      for (const creature of state.creatures) drawCreature(creature);
      drawShards(state);
      drawSparks(state);
      drawFloaters(state);
      drawVignette();
      ctx.restore();
      if (screen !== SCREEN_TITLE) drawHUD(state, best);
      drawBanner(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_UPGRADE) drawUpgrade(state);
      else if (screen === SCREEN_WIN) drawEnd(state, true, best);
      else if (screen === SCREEN_LOSE) drawEnd(state, false, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
    },
  };
}
