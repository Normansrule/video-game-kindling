// engine/library/sprite-art.js
// WHAT: The pixel art for the sprite library, as rows of letters. Each letter is a
//       color from PALETTE below; "." is see-through. Animated sprites list frames.
// WHY:  Text you can read and edit in any code editor. Change a row, reload, done.
// DOC:  docs/modules/library.md (section "Sprites")

export const PALETTE = {
  k: "#1a1c22", w: "#ffffff", l: "#c8ccd6", g: "#8a90a0", d: "#4a4e5a",
  r: "#e04050", R: "#9a2030", o: "#f08a30", y: "#ffd34d", Y: "#d99a1e",
  G: "#6ad05a", n: "#2e7a3a", b: "#4a8af0", B: "#2a4aa0", c: "#7ae6f4",
  p: "#a070f0", P: "#6040a0", s: "#fbcc8c", t: "#a06c3c", T: "#5a3a20", m: "#ff9ab0",
};

// category: "item" | "creature" | "effect". frames: one or more pictures (rows of letters).
export const SPRITE_ART = {
  coin: { category: "item", frames: [[
    "....kkkk....", "..kkyyyykk..", ".kyyywwyyYk.", ".kyywyyyyYk.", "kyywyYYyyyYk", "kyyyyYyyyyYk",
    "kyyyyYyyyyYk", "kyyyyYYyyyYk", ".kyyyyyyyYk.", ".kYyyyyyYYk.", "..kkYYYYkk..", "....kkkk....",
  ]] },
  gem: { category: "item", frames: [[
    "............", "...kkkkkk...", "..kccwccbk..", ".kcwccccbbk.", "kkkkkkkkkkkk", "kccwcccccbBk",
    ".kcccccccBk.", "..kcccccbk..", "...kccbBk...", "....kcBk....", ".....kk.....", "............",
  ]] },
  heart: { category: "item", frames: [[
    "............", ".kkk...kkk..", "kwrrk.krrrk.", "kwrrrkrrrrRk", "krrrrrrrrrRk", "krrrrrrrrrRk",
    ".krrrrrrrRk.", "..krrrrrRk..", "...krrrRk...", "....krRk....", ".....kk.....", "............",
  ]] },
  heart_empty: { category: "item", frames: [[
    "............", ".kkk...kkk..", "kdddk.kdddk.", "kd..dkd...dk", "kd........dk", "kd........dk",
    ".kd......dk.", "..kd....dk..", "...kd..dk...", "....kddk....", ".....kk.....", "............",
  ]] },
  key: { category: "item", frames: [[
    "............", "..kkkk......", ".kyyyyk.....", "kyykkyyk....", "kyk..kyk....", "kyykkyykkkkk",
    ".kyyyyyyyyYk", "..kkkkkkYkYk", ".......kk.kk", "............", "............", "............",
  ]] },
  sword: { category: "item", frames: [[
    "..........kk", ".........kwk", "........kwlk", ".......kwlk.", "......kwlk..", ".....kwlk...",
    ".kk.kwlk....", ".kYkwlk.....", "..kYYk......", ".kTkYYk.....", "kTk..kk.....", "kk..........",
  ]] },
  axe: { category: "item", frames: [[
    "....kkkk....", "...kllllk...", "..kllwllgk..", "..klwlltgk..", "..kgllltgk..", "...kgggtk...",
    "......tk....", "......tk....", ".....kTk....", ".....kTk....", ".....kTk....", "......k.....",
  ]] },
  shield: { category: "item", frames: [[
    ".kkkkkkkkkk.", "kbbbbyybbbBk", "kbwbbyybbbBk", "kbbbbyybbbBk", "kyyyyyyyyyYk", "kbbbbyybbbBk",
    "kbbbbyybbbBk", ".kbbbyybbBk.", ".kbbbyybbBk.", "..kbbyybBk..", "...kkYYkk...", ".....kk.....",
  ]] },
  bow: { category: "item", frames: [[
    "...kk.......", "...ktk......", "....ktk..l..", "....kTkk.l..", ".....kTk.l..", ".....kTk.l..",
    ".....kTk.l..", ".....kTk.l..", "....kTkk.l..", "....ktk..l..", "...ktk......", "...kk.......",
  ]] },
  arrow: { category: "item", frames: [[
    "............", "............", "............", "..........k.", "kk.......kgk", "rkkkkkkkkglk",
    "kk.......kgk", "..........k.", "............", "............", "............", "............",
  ]] },
  potion_red: { category: "item", frames: [[
    "....kkkk....", "....kttk....", "....kwlk....", "...kwllgk...", "..kwllllgk..", ".kwrrrrrrRk.",
    ".kwrwrrrrRk.", ".krrrrrrrRk.", ".krrrrrrRRk.", "..kRrrrRRk..", "...kkkkkk...", "............",
  ]] },
  potion_blue: { category: "item", frames: [[
    "....kkkk....", "....kttk....", "....kwlk....", "...kwllgk...", "..kwllllgk..", ".kwbbbbbbBk.",
    ".kwbwbbbbBk.", ".kbbbbbbbBk.", ".kbbbbbbBBk.", "..kBbbbBBk..", "...kkkkkk...", "............",
  ]] },
  apple: { category: "item", frames: [[
    "......k.....", ".....kTkGk..", "...kkkkGGk..", "..krrrrkk...", ".krwrrrrrRk.", ".krwrrrrrRk.",
    ".krrrrrrrRk.", ".krrrrrrrRk.", ".kRrrrrrRRk.", "..kRrrrRRk..", "...kkkkkk...", "............",
  ]] },
  bomb: { category: "item", frames: [[
    "........yo..", ".......kk.o.", "......kk....", "....kkkkk...", "...kddddddk.", "..kdwddddddk",
    "..kdwddddddk", "..kddddddddk", "..kddddddddk", "...kddddddk.", "....kkkkkk..", "............",
  ]] },
  scroll: { category: "item", frames: [[
    "............", ".kkkkkkkkkk.", "kTtttttttttk", ".kwwwwwwwwk.", ".kwddddddwk.", ".kwwwwwwwwk.",
    ".kwddddwwwk.", ".kwwwwwwwwk.", ".kwdddddwwk.", "kTtttttttttk", ".kkkkkkkkkk.", "............",
  ]] },
  star: { category: "item", frames: [[
    ".....kk.....", ".....kyk....", "....kyyk....", "kkkkkyyykkkk", "kyyywyyyyyYk", ".kyyyyyyyYk.",
    "..kyyyyyYk..", "..kyyyyyyk..", ".kyyYkkYyYk.", ".kyYk..kYYk.", "kkkk....kkkk", "............",
  ]] },
  crown: { category: "item", frames: [[
    "............", "............", "k....k....k.", "kyk.kyk.kyk.", "kyykyyyykyyk", "kyyyyryyyyyk",
    "kyyyrrryyyYk", "kyyyyryyyyYk", "kYYYYYYYYYYk", "kkkkkkkkkkkk", "............", "............",
  ]] },
  slime: { category: "creature", frames: [[
    "............", "............", "............", "....kkkk....", "..kkGGGGkk..", ".kGwGGGGGGk.",
    ".kGGkGGkGGk.", "kGGGkGGkGGnk", "kGGGGGGGGGnk", "kGGGGGGGGnnk", ".kkkkkkkkkk.", "............",
  ], [
    "............", "............", "............", "............", "............", "...kkkkkk...",
    ".kkGwGGGGkk.", "kGGGkGGkGGnk", "kGGGkGGkGGnk", "kGGGGGGGGnnk", ".kkkkkkkkkk.", "............",
  ]] },
  slime_blue: { category: "creature", frames: [[
    "............", "............", "............", "....kkkk....", "..kkbbbbkk..", ".kbwbbbbbbk.",
    ".kbbkbbkbbk.", "kbbbkbbkbbBk", "kbbbbbbbbbBk", "kbbbbbbbbBBk", ".kkkkkkkkkk.", "............",
  ], [
    "............", "............", "............", "............", "............", "...kkkkkk...",
    ".kkbwbbbbkk.", "kbbbkbbkbbBk", "kbbbkbbkbbBk", "kbbbbbbbbBBk", ".kkkkkkkkkk.", "............",
  ]] },
  bat: { category: "creature", frames: [[
    "............", "kk........kk", "kPk..kk..kPk", "kPPk.kpk.PPk", "kPPPkppkPPPk", ".kPPpwpwpPk.",
    "..kkpppppk..", "....kmmk....", ".....kk.....", "............", "............", "............",
  ], [
    "............", "............", "............", ".....kk.....", "....kppk....", "..kkpwpwpkk.",
    ".kPPpppppPPk", "kPPkkmmkkPPk", "kPk..kk..kPk", "kk........kk", "............", "............",
  ]] },
  ghost: { category: "creature", frames: [[
    "....kkkk....", "..kkwwwwkk..", ".kwwwwwwwlk.", ".kwkkwwkkwlk", ".kwkkwwkkwlk", "kwwwwwwwwwlk",
    "kwwwwkkwwwlk", "kwwwwwwwwwlk", "kwwwwwwwwllk", "kwlwwlwwlwlk", "kk.kk.kk.kk.", "............",
  ], [
    "............", "....kkkk....", "..kkwwwwkk..", ".kwwwwwwwlk.", ".kwkkwwkkwlk", ".kwkkwwkkwlk",
    "kwwwwwwwwwlk", "kwwwwkkwwwlk", "kwwwwwwwwllk", "kwlwwlwwlwlk", ".kk.kk.kk.kk", "............",
  ]] },
  skeleton: { category: "creature", frames: [[
    "...kkkkkk...", "..kwwwwwwk..", "..kwkkwkkk..", "..kwwwwwwk..", "...kwkwkk...", "....kwwk....",
    "..kkwwwwkk..", ".kwkkwwkkwk.", "....kwwk....", "...kwkkwk...", "...kwk.kwk..", "...kk..kk...",
  ]] },
  spider: { category: "creature", frames: [[
    "............", "............", "k..k....k..k", ".k.k.kk.k.k.", "..kkkddkkk..", "kkkdrdrddkkk",
    "..kddddddk..", ".kkddddddkk.", "k..kddddk..k", "..k.kkkk.k..", ".k........k.", "............",
  ]] },
  frog: { category: "creature", frames: [[
    "............", "............", "..kk....kk..", ".kwkk..kkwk.", ".kkGGGGGGkk.", "kGGGGGGGGGGk",
    "kGrrrrrrrrGk", "kGGGGGGGGGnk", ".kGGGGGGGnk.", "kGGk.kk.kGGk", "kkk......kkk", "............",
  ]] },
  bird: { category: "creature", frames: [[
    "............", "............", "....kkk.....", "...kbbbk....", "..kbwkbbkkk.", "kkbbbbbbbbok",
    "kbBBbbbbbk..", ".kBBBbbbk...", "..kkkkkk....", "....k.k.....", "............", "............",
  ], [
    "............", "..kkk.......", ".kBBBk......", ".kBBbbkk....", "..kbwkbbkkk.", "kkbbbbbbbbok",
    "..kbbbbbbk..", "...kkkkkk...", "....k.k.....", "............", "............", "............",
  ]] },
  fish: { category: "creature", frames: [[
    "............", "............", "....kkkk....", "..kkoooook..", "kkoowkoooook", "kooooooooook",
    "kkoooooooYok", "..kkYYYYYk..", "....kkkkk...", "............", "............", "............",
  ]] },
  bee: { category: "creature", frames: [[
    "............", "...kk.kk....", "..kwwkwwk...", "...kkkkk....", "..kyykkyyk..", ".kkykkyykkk.",
    ".kyykkyykyk.", "..kyykkyyk..", "...kkkkkk...", "............", "............", "............",
  ], [
    "............", "............", "..kwk.kwk...", "...kkkkk....", "..kyykkyyk..", ".kkykkyykkk.",
    ".kyykkyykyk.", "..kyykkyyk..", "...kkkkkk...", "............", "............", "............",
  ]] },
  spark: { category: "effect", frames: [[
    "............", ".....y......", ".....y......", "....yyy.....", "..yyywyyy...", "....yyy.....",
    ".....y......", ".....y......", "............", "............", "............", "............",
  ]] },
  puff: { category: "effect", frames: [[
    "............", "....llll....", "..llwwwwll..", ".lwwwwwwwwl.", ".lwwwwwwwgl.", "lwwwwwwwwwgl",
    "lwwwwwwwwggl", ".lwwwwwwggl.", ".llwwwwgggl.", "..lllggggl..", "....llll....", "............",
  ]] },
  fireball: { category: "effect", frames: [[
    "............", "......rr....", "....rroor...", "...rooyyor..", "..royywwyor.", "..roywwwyor.",
    "..royywwyor.", "...rooyyor..", "....rroor...", "......rr....", "............", "............",
  ]] },
  bullet: { category: "effect", frames: [[
    "............", "............", "............", "............", ".....kk.....", "....kyyk....",
    "....kywk....", ".....kk.....", "............", "............", "............", "............",
  ]] },
};
