// Generates the 10 character portrait PNGs in public/portraits/.
//
// There's no AI image-generation tool available in this project's
// environment, so these are procedural vector illustrations (SVG, rendered
// to PNG via a headless-browser screenshot) rather than diffusion-model
// art: big expressive eyes and soft rounded proportions for a friendly
// "storybook" feel, plus fantasy details (armor, hoods, an ice crown, a
// mystic third eye) tied to each card's season/tier/ability so the look
// still reads as an RPG card portrait. Re-run this script any time a
// CHAR_SPECS entry changes: `node scripts/generate-portraits.mjs`.
import { chromium } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, 'public', 'portraits');

const SIZE = 512;
const CX = 256;
const CY = 256;

function grad(id, stops) {
  return `<radialGradient id="${id}" cx="50%" cy="38%" r="75%">${stops
    .map((s) => `<stop offset="${s[0]}" stop-color="${s[1]}"/>`)
    .join('')}</radialGradient>`;
}

let skinShadeGlobal = '#000';

function eye({ x, y, r = 27, iris, look = 0, wink = false, angry = false, sleepy = false }) {
  if (wink) {
    return `<path d="M ${x - r} ${y} Q ${x} ${y + 8} ${x + r} ${y}" fill="none" stroke="#2a1c14" stroke-width="6" stroke-linecap="round"/>`;
  }
  const irisX = x + look;
  const lidPath = angry
    ? `<path d="M ${x - r - 4} ${y - r + 4} Q ${x} ${y - r - 10} ${x + r + 4} ${y - r + 10} L ${x + r + 4} ${y - r + 2} Q ${x} ${y - r - 4} ${x - r - 4} ${y - r - 4} Z" fill="#2a1c14"/>`
    : '';
  const lidTop = sleepy
    ? `<path d="M ${x - r} ${y - 4} Q ${x} ${y - r * 0.4} ${x + r} ${y - 4} L ${x + r} ${y} Q ${x} ${y + r * 0.6} ${x - r} ${y} Z" fill="${skinShadeGlobal}"/>`
    : '';
  return `
    <g>
      <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#fbf6ec"/>
      <circle cx="${irisX}" cy="${y + 2}" r="${r * 0.62}" fill="${iris}"/>
      <circle cx="${irisX}" cy="${y + 2}" r="${r * 0.32}" fill="#1a1114"/>
      <circle cx="${irisX - r * 0.22}" cy="${y - r * 0.28}" r="${r * 0.16}" fill="#ffffff" opacity="0.95"/>
      <circle cx="${irisX + r * 0.28}" cy="${y + r * 0.36}" r="${r * 0.08}" fill="#ffffff" opacity="0.7"/>
      ${lidTop}
      ${lidPath}
    </g>`;
}

function brow({ x, y, w = 40, tilt = 0, thick = 7 }) {
  const x1 = x - w / 2;
  const x2 = x + w / 2;
  const y1 = y + tilt;
  const y2 = y - tilt;
  return `<path d="M ${x1} ${y1} Q ${x} ${y - thick - Math.abs(tilt) * 0.3} ${x2} ${y2}" fill="none" stroke="#2a1c14" stroke-width="${thick}" stroke-linecap="round"/>`;
}

function mouth({ style, skinShade }) {
  const y = CY + 78;
  switch (style) {
    case 'grin':
      return `<path d="M ${CX - 30} ${y} Q ${CX} ${y + 26} ${CX + 30} ${y}" fill="none" stroke="${skinShade}" stroke-width="7" stroke-linecap="round"/>
              <path d="M ${CX - 22} ${y + 3} Q ${CX} ${y + 16} ${CX + 22} ${y + 3} L ${CX + 18} ${y + 6} Q ${CX} ${y + 13} ${CX - 18} ${y + 6} Z" fill="#fff" opacity="0.85"/>`;
    case 'smirk':
      return `<path d="M ${CX - 26} ${y + 6} Q ${CX - 2} ${y + 18} ${CX + 30} ${y - 6}" fill="none" stroke="${skinShade}" stroke-width="7" stroke-linecap="round"/>`;
    case 'calm':
      return `<path d="M ${CX - 22} ${y} Q ${CX} ${y + 10} ${CX + 22} ${y}" fill="none" stroke="${skinShade}" stroke-width="6" stroke-linecap="round"/>`;
    case 'stern':
      return `<path d="M ${CX - 24} ${y + 4} Q ${CX} ${y - 4} ${CX + 24} ${y + 4}" fill="none" stroke="${skinShade}" stroke-width="7" stroke-linecap="round"/>`;
    case 'fierce':
      return `<path d="M ${CX - 28} ${y - 10} Q ${CX} ${y + 6} ${CX + 28} ${y - 10} L ${CX + 24} ${y + 4} Q ${CX} ${y + 22} ${CX - 24} ${y + 4} Z" fill="#3a1418"/>
              <path d="M ${CX - 22} ${y - 6} L ${CX - 15} ${y + 2} L ${CX - 8} ${y - 5} L ${CX - 1} ${y + 3} L ${CX + 6} ${y - 5} L ${CX + 13} ${y + 2} L ${CX + 20} ${y - 6}" fill="none" stroke="#fbf6ec" stroke-width="4" stroke-linejoin="round"/>
              <path d="M ${CX - 28} ${y - 10} Q ${CX} ${y + 6} ${CX + 28} ${y - 10}" fill="none" stroke="${skinShade}" stroke-width="6" stroke-linecap="round"/>`;
    case 'sly':
      return `<path d="M ${CX - 24} ${y + 2} Q ${CX + 4} ${y + 20} ${CX + 28} ${y - 8}" fill="none" stroke="${skinShade}" stroke-width="7" stroke-linecap="round"/>`;
    case 'mystic':
      return `<path d="M ${CX - 16} ${y + 4} Q ${CX} ${y + 8} ${CX + 16} ${y + 4}" fill="none" stroke="${skinShade}" stroke-width="6" stroke-linecap="round"/>`;
    default:
      return `<path d="M ${CX - 20} ${y} Q ${CX} ${y + 12} ${CX + 20} ${y}" fill="none" stroke="${skinShade}" stroke-width="6" stroke-linecap="round"/>`;
  }
}

function nose(skinShade) {
  return `<path d="M ${CX - 5} ${CY + 36} Q ${CX} ${CY + 50} ${CX + 6} ${CY + 38}" fill="none" stroke="${skinShade}" stroke-width="4.5" stroke-linecap="round" opacity="0.55"/>`;
}

function badge({ shape, color, glow }) {
  const bx = CX + 150;
  const by = CY + 172;
  const inner = {
    flame: `<path d="M0 14 C -9 4 -6 -8 0 -16 C 2 -6 9 -4 7 4 C 12 2 12 -4 10 -8 C 16 0 16 12 8 16 C 10 10 6 8 4 10 C 4 4 0 4 0 8 C -3 6 -3 10 0 14 Z" fill="${color}"/>`,
    snowflake: `<g stroke="${color}" stroke-width="3.4" stroke-linecap="round">
        <line x1="0" y1="-15" x2="0" y2="15"/><line x1="-13" y1="-7.5" x2="13" y2="7.5"/><line x1="-13" y1="7.5" x2="13" y2="-7.5"/>
        <line x1="0" y1="-15" x2="-4" y2="-10"/><line x1="0" y1="-15" x2="4" y2="-10"/>
        <line x1="0" y1="15" x2="-4" y2="10"/><line x1="0" y1="15" x2="4" y2="10"/>
      </g>`,
    spiral: `<path d="M0 0 m0 -13 a13 13 0 1 1 -9.2 3.8 a8 8 0 1 1 -5.7 2.3" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/>`,
    shield: `<path d="M0 -14 L12 -8 V4 C12 12 6 17 0 19 C -6 17 -12 12 -12 4 V-8 Z" fill="none" stroke="${color}" stroke-width="3.4" stroke-linejoin="round"/>`,
    mask: `<path d="M-14 -2 C -14 -10 -6 -12 0 -8 C 6 -12 14 -10 14 -2 C 14 4 8 4 4 0 C 2 6 -2 6 -4 0 C -8 4 -14 4 -14 -2 Z" fill="${color}"/>`,
    spark: `<path d="M0 -15 L3.5 -3.5 L15 0 L3.5 3.5 L0 15 L-3.5 3.5 L-15 0 L-3.5 -3.5 Z" fill="${color}"/>`,
    compass: `<circle r="13" fill="none" stroke="${color}" stroke-width="3"/><path d="M0 -8 L3 0 L0 8 L-3 0 Z" fill="${color}"/>`,
    ember: `<circle r="5" fill="${color}"/><circle r="9" fill="${color}" opacity="0.35"/><circle cx="9" cy="-8" r="3" fill="${color}"/><circle cx="-8" cy="7" r="2.4" fill="${color}" opacity="0.8"/>`,
  }[shape];
  return `
    <g transform="translate(${bx} ${by})">
      <circle r="22" fill="#1c1220" stroke="${color}" stroke-width="2.5" opacity="0.94"/>
      ${glow ? `<circle r="22" fill="none" stroke="${color}" stroke-width="6" opacity="0.25"/>` : ''}
      ${inner}
    </g>`;
}

function ring({ tier }) {
  const colors = {
    Gold: ['#ffe08a', '#c9932a'],
    Silver: ['#eef2f8', '#9aa4b5'],
    Common: ['#caa06a', '#7a5a34'],
  }[tier];
  return `
    <circle cx="${CX}" cy="${CY}" r="238" fill="none" stroke="${colors[1]}" stroke-width="10"/>
    <circle cx="${CX}" cy="${CY}" r="238" fill="none" stroke="${colors[0]}" stroke-width="3.5"/>
    <circle cx="${CX}" cy="${CY}" r="248" fill="none" stroke="${colors[1]}" stroke-width="2" opacity="0.6"/>`;
}

// --- hair / headwear silhouettes, one bespoke path set per character kind ---
const hair = {
  titanFlame: (c) => `
    <path d="M ${CX - 118} ${CY - 40} C ${CX - 130} ${CY - 150} ${CX - 40} ${CY - 200} ${CX} ${CY - 180}
      C ${CX + 40} ${CY - 200} ${CX + 130} ${CY - 150} ${CX + 118} ${CY - 40}
      C ${CX + 100} ${CY - 110} ${CX + 60} ${CY - 150} ${CX + 30} ${CY - 120}
      C ${CX + 10} ${CY - 160} ${CX - 10} ${CY - 160} ${CX - 30} ${CY - 120}
      C ${CX - 60} ${CY - 150} ${CX - 100} ${CY - 110} ${CX - 118} ${CY - 40} Z" fill="${c}"/>`,
  titanFrost: (c) => `
    <path d="M ${CX - 112} ${CY - 30} L ${CX - 90} ${CY - 170} L ${CX - 45} ${CY - 120} L ${CX} ${CY - 195}
      L ${CX + 45} ${CY - 120} L ${CX + 90} ${CY - 170} L ${CX + 112} ${CY - 30}
      C ${CX + 70} ${CY - 95} ${CX - 70} ${CY - 95} ${CX - 112} ${CY - 30} Z" fill="${c}"/>`,
  spiky: (c) => `
    <path d="M ${CX - 100} ${CY - 35} C ${CX - 108} ${CY - 90} ${CX - 70} ${CY - 100} ${CX - 66} ${CY - 150}
      C ${CX - 40} ${CY - 110} ${CX - 30} ${CY - 165} ${CX - 8} ${CY - 130}
      C ${CX + 2} ${CY - 175} ${CX + 30} ${CY - 150} ${CX + 26} ${CY - 105}
      C ${CX + 55} ${CY - 130} ${CX + 60} ${CY - 90} ${CX + 45} ${CY - 60}
      C ${CX + 90} ${CY - 60} ${CX + 106} ${CY - 20} ${CX + 96} ${CY - 32}
      C ${CX + 60} ${CY - 96} ${CX - 60} ${CY - 96} ${CX - 100} ${CY - 35} Z" fill="${c}"/>`,
  hoodedCloth: (c) => `
    <path d="M ${CX - 132} ${CY + 60} C ${CX - 142} ${CY - 70} ${CX - 80} ${CY - 200} ${CX} ${CY - 200}
      C ${CX + 80} ${CY - 200} ${CX + 142} ${CY - 70} ${CX + 132} ${CY + 60}
      L ${CX + 100} ${CY + 40}
      C ${CX + 108} ${CY - 60} ${CX + 62} ${CY - 150} ${CX} ${CY - 150}
      C ${CX - 62} ${CY - 150} ${CX - 108} ${CY - 60} ${CX - 100} ${CY + 40} Z" fill="${c}"/>
    <path d="M ${CX - 100} ${CY + 40} C ${CX - 108} ${CY - 60} ${CX - 62} ${CY - 150} ${CX} ${CY - 150}
      C ${CX + 62} ${CY - 150} ${CX + 108} ${CY - 60} ${CX + 100} ${CY + 40}
      C ${CX + 90} ${CY - 30} ${CX + 55} ${CY - 82} ${CX} ${CY - 82}
      C ${CX - 55} ${CY - 82} ${CX - 90} ${CY - 30} ${CX - 100} ${CY + 40} Z" fill="#00000030"/>`,
  ornate: (c, c2) => `
    <path d="M ${CX - 104} ${CY - 40} C ${CX - 112} ${CY - 140} ${CX - 50} ${CY - 188} ${CX} ${CY - 188}
      C ${CX + 50} ${CY - 188} ${CX + 112} ${CY - 140} ${CX + 104} ${CY - 40}
      C ${CX + 92} ${CY - 100} ${CX + 55} ${CY - 128} ${CX} ${CY - 128}
      C ${CX - 55} ${CY - 128} ${CX - 92} ${CY - 100} ${CX - 104} ${CY - 40} Z" fill="${c}"/>
    <path d="M ${CX} ${CY - 200} L ${CX - 6} ${CY - 178} L ${CX + 6} ${CY - 178} Z" fill="${c2}"/>
    <circle cx="${CX - 60}" cy="${CY - 150}" r="7" fill="${c2}"/>
    <circle cx="${CX + 60}" cy="${CY - 150}" r="7" fill="${c2}"/>`,
  short: (c) => `
    <path d="M ${CX - 96} ${CY - 30} C ${CX - 104} ${CY - 130} ${CX - 45} ${CY - 168} ${CX} ${CY - 168}
      C ${CX + 45} ${CY - 168} ${CX + 104} ${CY - 130} ${CX + 96} ${CY - 30}
      C ${CX + 86} ${CY - 90} ${CX + 50} ${CY - 112} ${CX} ${CY - 112}
      C ${CX - 50} ${CY - 112} ${CX - 86} ${CY - 90} ${CX - 96} ${CY - 30} Z" fill="${c}"/>`,
  windswept: (c) => `
    <path d="M ${CX - 100} ${CY - 25} C ${CX - 118} ${CY - 100} ${CX - 60} ${CY - 165} ${CX - 6} ${CY - 155}
      C ${CX + 50} ${CY - 175} ${CX + 112} ${CY - 110} ${CX + 92} ${CY - 30}
      C ${CX + 84} ${CY - 90} ${CX + 40} ${CY - 100} ${CX + 20} ${CY - 130}
      C ${CX + 4} ${CY - 100} ${CX - 40} ${CY - 96} ${CX - 96} ${CY - 34} Z" fill="${c}"/>`,
};

function shoulders({ color, armor, accent }) {
  const y = CY + 140;
  if (armor) {
    const plate = (side) => {
      const s = side === 'l' ? -1 : 1;
      const bx = CX + s * 96;
      return `
        <g transform="translate(${bx} ${y - 4})">
          <path d="M ${-s * 46} -34 L ${s * 30} -40 L ${s * 44} -6 L ${s * 30} 30 L ${-s * 40} 26 Z" fill="${color}" stroke="#00000035" stroke-width="3" stroke-linejoin="round"/>
          <path d="M ${-s * 30} -22 L ${s * 18} -26 L ${s * 26} 0" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity="0.85"/>
          <circle cx="0" cy="-2" r="7" fill="${accent}"/>
        </g>`;
    };
    return `<path d="M ${CX - 150} ${CY + 260} C ${CX - 150} ${y + 10} ${CX - 100} ${y - 20} ${CX - 60} ${y - 6}
      L ${CX - 30} ${y - 34} L ${CX + 30} ${y - 34} L ${CX + 60} ${y - 6}
      C ${CX + 100} ${y - 20} ${CX + 150} ${y + 10} ${CX + 150} ${CY + 260} Z" fill="${color}" stroke="#00000022" stroke-width="3"/>
      ${plate('l')}${plate('r')}`;
  }
  return `<path d="M ${CX - 140} ${CY + 260} C ${CX - 140} ${y} ${CX - 70} ${y - 50} ${CX} ${y - 46}
    C ${CX + 70} ${y - 50} ${CX + 140} ${y} ${CX + 140} ${CY + 260} Z" fill="${color}"/>`;
}

function ears(skin) {
  return `<circle cx="${CX - 92}" cy="${CY - 4}" r="16" fill="${skin}"/><circle cx="${CX + 92}" cy="${CY - 4}" r="16" fill="${skin}"/>`;
}

function face(spec) {
  const {
    id, tier, bgStops, skin, skinShade, hairColor, hairColor2, hairKind,
    eyeColor, browTilt = 0, browThick = 7, expression, badgeShape, badgeColor,
    armor = false, armorColor, wink = false, angry = false, sleepy = false, eyeLook = 0,
  } = spec;
  skinShadeGlobal = skinShade;
  const gradId = `bg-${id}`;
  return `
  <svg id="${id}" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${grad(gradId, bgStops)}
      <clipPath id="clip-${id}"><circle cx="${CX}" cy="${CY}" r="234"/></clipPath>
      <filter id="soft-${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6"/>
      </filter>
    </defs>
    <circle cx="${CX}" cy="${CY}" r="256" fill="#0d0b12"/>
    <circle cx="${CX}" cy="${CY}" r="238" fill="url(#${gradId})"/>
    <g clip-path="url(#clip-${id})">
      <ellipse cx="${CX}" cy="${CY + 210}" rx="220" ry="90" fill="#00000022" filter="url(#soft-${id})"/>
      ${shoulders({ color: armorColor ?? skinShade, armor, accent: badgeColor })}
      ${ears(skin)}
      <ellipse cx="${CX}" cy="${CY + 10}" rx="98" ry="118" fill="${skin}"/>
      <ellipse cx="${CX}" cy="${CY + 60}" rx="80" ry="48" fill="${skinShade}" opacity="0.28"/>
      <ellipse cx="${CX - 42}" cy="${CY - 56}" rx="46" ry="34" fill="#ffffff" opacity="0.16"/>
      ${hair[hairKind] ? hair[hairKind](hairColor, hairColor2) : ''}
      ${eye({ x: CX - 34, y: CY - 6, iris: eyeColor, wink: wink === 'left', angry, sleepy, look: eyeLook })}
      ${eye({ x: CX + 34, y: CY - 6, iris: eyeColor, wink: wink === 'right', angry, sleepy, look: eyeLook })}
      ${brow({ x: CX - 34, y: CY - 40, tilt: browTilt, thick: browThick })}
      ${brow({ x: CX + 34, y: CY - 40, tilt: -browTilt, thick: browThick })}
      <ellipse cx="${CX - 46}" cy="${CY + 28}" rx="16" ry="10" fill="#ff8a73" opacity="0.35"/>
      <ellipse cx="${CX + 46}" cy="${CY + 28}" rx="16" ry="10" fill="#ff8a73" opacity="0.35"/>
      ${nose(skinShade)}
      ${mouth({ style: expression, skinShade })}
    </g>
    ${ring({ tier })}
    ${badge({ shape: badgeShape, color: badgeColor, glow: true })}
  </svg>`;
}

// One entry per portrait to generate. `id` must match the card's defId in
// src/content/cards.ts so a future CardView can look up `portraits/${id}.png`
// directly. This first batch covers both Titans, all six ability-bearing
// cards, and two flagship Commons (one per starter deck) - the ten most
// distinctive characters across the roster.
const CHAR_SPECS = [
  {
    id: 'sunblade_vanguard', tier: 'Common',
    bgStops: [['0%', '#ffb066'], ['55%', '#e05a2b'], ['100%', '#7a2210']],
    skin: '#e2a074', skinShade: '#a8623a',
    hairColor: '#ff5a2e', hairKind: 'titanFlame',
    eyeColor: '#ffcf4a', browTilt: 10, browThick: 8, expression: 'fierce',
    badgeShape: 'flame', badgeColor: '#ffb347', armor: true, armorColor: '#8a3a1c',
  },
  {
    id: 'glacier_warden', tier: 'Common',
    bgStops: [['0%', '#bfe8ff'], ['55%', '#3f8fd1'], ['100%', '#123258']],
    skin: '#cfe3ee', skinShade: '#7fa6bd',
    hairColor: '#eaf7ff', hairKind: 'titanFrost',
    eyeColor: '#d7f4ff', browTilt: 2, browThick: 7, expression: 'stern',
    badgeShape: 'snowflake', badgeColor: '#bdeeff', armor: true, armorColor: '#2e5a80',
  },
  {
    id: 'firebrand', tier: 'Silver',
    bgStops: [['0%', '#ffb066'], ['55%', '#e2542a'], ['100%', '#6e1c0e']],
    skin: '#e6a875', skinShade: '#ab6438',
    hairColor: '#ff7a3d', hairColor2: '#ffd166', hairKind: 'spiky',
    eyeColor: '#ffb23e', browTilt: 6, browThick: 6, expression: 'grin',
    badgeShape: 'spark', badgeColor: '#ffd166',
  },
  {
    id: 'scorchcaller', tier: 'Gold',
    bgStops: [['0%', '#ff8a5c'], ['55%', '#b8331c'], ['100%', '#3c0d08']],
    skin: '#c98561', skinShade: '#874428',
    hairColor: '#3a1210', hairKind: 'hoodedCloth',
    eyeColor: '#ff6a3d', browTilt: 12, browThick: 7, expression: 'sly', eyeLook: 3,
    badgeShape: 'ember', badgeColor: '#ff7a3d',
  },
  {
    id: 'frostguard', tier: 'Silver',
    bgStops: [['0%', '#cdeeff'], ['55%', '#5aa6d6'], ['100%', '#1b3f63']],
    skin: '#e7d3c2', skinShade: '#a98a70',
    hairColor: '#8fd4e8', hairKind: 'short',
    eyeColor: '#7fd8ff', browTilt: -3, browThick: 6, expression: 'calm',
    badgeShape: 'shield', badgeColor: '#bdeeff',
  },
  {
    id: 'blizzardcaller', tier: 'Gold',
    bgStops: [['0%', '#9fd8ff'], ['55%', '#2c5f92'], ['100%', '#0a1c30']],
    skin: '#dfe9ee', skinShade: '#8fa9ba',
    hairColor: '#e8f6ff', hairKind: 'ornate', hairColor2: '#bdeeff',
    eyeColor: '#eafcff', browTilt: 9, browThick: 7, expression: 'stern',
    badgeShape: 'snowflake', badgeColor: '#eafcff',
  },
  {
    id: 'trickster', tier: 'Silver',
    bgStops: [['0%', '#c9a6ff'], ['55%', '#6a3fb0'], ['100%', '#241539']],
    skin: '#d9b48e', skinShade: '#9a6d47',
    hairColor: '#3d2b52', hairKind: 'hoodedCloth',
    eyeColor: '#a98fd6', browTilt: 8, browThick: 6, expression: 'smirk',
    wink: 'left', badgeShape: 'mask', badgeColor: '#c9a6ff',
  },
  {
    id: 'mesmerist', tier: 'Gold',
    bgStops: [['0%', '#d8b4ff'], ['55%', '#5b2f8f'], ['100%', '#180a2b']],
    skin: '#c9b6d9', skinShade: '#7c5f92',
    hairColor: '#2c1740', hairKind: 'ornate', hairColor2: '#e8b6ff',
    eyeColor: '#e6c9ff', browTilt: -6, browThick: 6, expression: 'mystic',
    badgeShape: 'spiral', badgeColor: '#e6c9ff',
  },
  {
    id: 'wayfarer', tier: 'Common',
    bgStops: [['0%', '#dcd2a8'], ['55%', '#8a7a4a'], ['100%', '#332c18']],
    skin: '#c98f66', skinShade: '#8a5a38',
    hairColor: '#6b5636', hairKind: 'hoodedCloth',
    eyeColor: '#7a9d6a', browTilt: -2, browThick: 6, expression: 'calm',
    badgeShape: 'compass', badgeColor: '#e8dcab',
  },
  {
    id: 'ember_striker', tier: 'Common',
    bgStops: [['0%', '#ffc37a'], ['55%', '#e2622c'], ['100%', '#7a2410']],
    skin: '#e8ab7c', skinShade: '#ac6a3e',
    hairColor: '#8a3a1c', hairKind: 'windswept',
    eyeColor: '#ffd166', browTilt: 5, browThick: 7, expression: 'grin',
    badgeShape: 'ember', badgeColor: '#ffd166',
  },
];

const svgs = CHAR_SPECS.map(face).join('\n');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #14161f; }
  svg { display: block; }
</style></head><body>${svgs}</body></html>`;

const workDir = mkdtempSync(path.join(tmpdir(), 'seasons-battle-portraits-'));
const htmlPath = path.join(workDir, 'portraits.html');
writeFileSync(htmlPath, html);

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
await page.goto('file://' + htmlPath);

for (const spec of CHAR_SPECS) {
  const el = await page.$(`#${spec.id}`);
  await el.screenshot({ path: path.join(OUT_DIR, `${spec.id}.png`) });
}

await browser.close();
rmSync(workDir, { recursive: true, force: true });

console.log(`Wrote ${CHAR_SPECS.length} portraits to ${path.relative(ROOT, OUT_DIR)}/`);
