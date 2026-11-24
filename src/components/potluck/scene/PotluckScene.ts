/* The table, as a persistent scene.
 *
 * Layers are fixed containers; objects inside them are created once and
 * RECONCILED against the model by stable id, never rebuilt. Adding a dish
 * should make one plate appear, not redraw the room — which also means a tap
 * in flight is never yanked out from under a finger.
 *
 * The scene owns no application state. `reconcile(model)` is the only way in,
 * and taps go out through callbacks. It cannot fetch, mutate or know what a
 * potluck is.
 */

import { Application, Container, Graphics, Sprite, Text, TextStyle, type FederatedPointerEvent } from "pixi.js";
import { gsap } from "gsap";
import { makeTextures, destroyTextures, type TextureBank } from "./textures";
import { onEllipse, seatAngle, type SceneDish, type SceneModel, type SceneSeat } from "./model";

const INK = 0x171410;
const INK_SOFT = 0x4a4742;
const SURFACE = 0xe9e2d3;
const CREAM_WARM = 0xefe5d2;
const PAPER = 0xfbf7ee;
const LIME = 0xc4ee45;
const BUTTER = 0xffd84d;
const PLATE_TINTS = [0xc4ee45, 0xffd84d, 0xc9b8ff, 0xf2c77a, 0xff4d9d];

/** The world is authored at a fixed size; the camera fits it to the viewport. */
const WORLD_W = 900;
const WORLD_H = 760;
// Rounder than a first guess wants to make it. A wide, flat ellipse is the
// more convincing three-quarter view, but on a 375px screen the width binds
// the camera and the table ends up a stripe with dead space above and below.
// 0.63 squash keeps the perspective and lets the table own the viewport.
// There is a real tension here, and it is resolved rather than hidden. A flat
// ellipse is the more convincing three-quarter view; a round one uses the
// height of a portrait phone. Width binds the camera on a phone, so a flat
// table can only ever be a stripe across the middle. 0.75 squash is the
// compromise — still clearly seen from above and in front, tall enough to be
// the subject of the screen rather than a band across it.
const TABLE_RX = 268;
const TABLE_RY = 200;
const SEAT_RX = 326;
const SEAT_RY = 276;

export type SceneCallbacks = {
  onSeatTap: (seatId: string) => void;
  onDishTap: (dishId: string) => void;
  onEmptyTap: () => void;
};

type SeatView = { root: Container; chairBack: Sprite; chair: Sprite; card: Container; label: Text; seat: SceneSeat };
/* A dish is a plate, a lid and the food under it — three sprites, so the lid
   can leave without the plate. A single "covered plate" texture cannot be
   opened, and opening it is the point. */
type DishView = { root: Container; plate: Sprite; food: Sprite; cloche: Sprite; dish: SceneDish };

export class PotluckScene {
  readonly app: Application;
  private world = new Container();
  private layers: Record<string, Container> = {};
  private tex: TextureBank;
  private seats = new Map<string, SeatView>();
  private dishes = new Map<string, DishView>();
  private cb: SceneCallbacks;
  private reduced: boolean;
  private tweens = new Set<gsap.core.Tween>();
  private idle: gsap.core.Timeline | null = null;
  private destroyed = false;
  /* Opening a potluck is not four people arriving. Everything present on the
     first reconcile is simply placed; only what appears AFTER that animates in.
     The spec is explicit — do not replay every historical animation. */
  private primed = false;
  private onArrival?: () => void;

  constructor(app: Application, cb: SceneCallbacks, reducedMotion: boolean) {
    this.app = app;
    this.cb = cb;
    this.reduced = reducedMotion;
    this.tex = makeTextures(app.renderer);

    // Spec order, back to front. Named so a reader can find where a thing goes.
    for (const name of ["environment", "shadows", "chairs", "table", "settings", "food", "characters", "decorations", "effects", "indicators"]) {
      const c = new Container();
      c.sortableChildren = name === "food" || name === "chairs" || name === "characters";
      this.layers[name] = c;
      this.world.addChild(c);
    }

    this.world.sortableChildren = false;
    app.stage.addChild(this.world);
    this.buildRoom();
  }

  /* ── the parts that never change ───────────────────────────────────────── */

  private buildRoom() {
    const floor = new Graphics();
    floor.rect(-WORLD_W, -WORLD_H, WORLD_W * 2, WORLD_H * 2).fill({ color: SURFACE });
    // the dotted paper the whole app is printed on
    for (let y = -WORLD_H; y < WORLD_H; y += 26) {
      for (let x = -WORLD_W; x < WORLD_W; x += 26) floor.circle(x, y, 1.6).fill({ color: INK, alpha: 0.05 });
    }
    this.layers.environment.addChild(floor);

    const shadow = new Graphics();
    shadow.ellipse(0, 26, TABLE_RX + 16, TABLE_RY + 12).fill({ color: INK, alpha: 0.12 });
    this.layers.shadows.addChild(shadow);

    const table = new Graphics();
    table.ellipse(0, 0, TABLE_RX, TABLE_RY).fill({ color: CREAM_WARM }).stroke({ width: 5, color: INK });
    table.ellipse(0, 0, TABLE_RX - 26, TABLE_RY - 15).stroke({ width: 2.5, color: INK, alpha: 0.22 });
    this.layers.table.addChild(table);

    const candle = new Sprite(this.tex.candle);
    candle.anchor.set(0.5, 1);
    candle.position.set(0, 6);
    const flame = new Sprite(this.tex.flame);
    flame.anchor.set(0.5, 1);
    flame.position.set(0, -20);
    flame.label = "flame";
    this.layers.decorations.addChild(candle, flame);
    if (!this.reduced) {
      // Randomised so nothing in the room ever pulses in time with anything else.
      const flicker = gsap.to(flame.scale, { y: 1.22, x: 0.88, duration: 0.42 + Math.random() * 0.3, repeat: -1, yoyo: true, ease: "sine.inOut" });
      this.tweens.add(flicker as gsap.core.Tween);
    }
  }

  /* ── reconciliation: the only way state gets in ────────────────────────── */

  reconcile(model: SceneModel) {
    if (this.destroyed) return;
    const n = model.seats.length;

    const seenSeats = new Set<string>();
    model.seats.forEach((seat, i) => {
      seenSeats.add(seat.id);
      const a = seatAngle(i, n);
      const at = onEllipse(a, SEAT_RX, SEAT_RY);
      const view = this.seats.get(seat.id) ?? this.addSeat(seat, at);
      this.updateSeat(view, seat, at);
    });
    for (const [id, view] of this.seats) {
      if (!seenSeats.has(id)) { view.root.destroy({ children: true }); this.seats.delete(id); }
    }

    const seenDishes = new Set<string>();
    model.dishes.forEach((dish) => {
      seenDishes.add(dish.id);
      const seatIndex = model.seats.findIndex((s) => s.id === dish.seatId);
      const ownDishes = model.dishes.filter((d) => d.seatId === dish.seatId);
      const slot = ownDishes.findIndex((d) => d.id === dish.id);
      const a = seatAngle(seatIndex < 0 ? 0 : seatIndex, n);
      // Fan a person's dishes along the rim in front of their chair.
      const spread = (slot - (ownDishes.length - 1) / 2) * 0.17;
      const at = onEllipse(a + spread, TABLE_RX - 54, TABLE_RY - 30);
      const view = this.dishes.get(dish.id) ?? this.addDish(dish, at);
      this.updateDish(view, dish, at);
    });
    for (const [id, view] of this.dishes) {
      if (!seenDishes.has(id)) { view.root.destroy({ children: true }); this.dishes.delete(id); }
    }

    this.setStage(model.stage);
    this.primed = true;
  }

  /** Called when something arrives after first paint — the page buzzes. */
  setArrivalSignal(fn: () => void) { this.onArrival = fn; }

  private addSeat(seat: SceneSeat, at: { x: number; y: number }): SeatView {
    const root = new Container();
    root.position.set(at.x, at.y * 1.0);
    root.zIndex = at.y;

    const chairBack = new Sprite(this.tex.chairBack);
    chairBack.anchor.set(0.5, 1);
    const chair = new Sprite(this.tex.chair);
    chair.anchor.set(0.5, 0.5);

    const card = new Container();
    const cardArt = new Sprite(this.tex.nameCard);
    cardArt.anchor.set(0.5, 1);
    const label = new Text({
      text: seat.name,
      // Sized for the world, not the screen: at the camera's fitted scale this
      // lands around 11px, which is the floor for a name you have to read.
      style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: "700", fill: INK, align: "center" }),
    });
    label.anchor.set(0.5, 1);
    label.position.set(0, -4);
    fitLabel(label);
    card.addChild(cardArt, label);
    card.scale.set(1.35);
    card.position.set(0, -38);

    root.addChild(chairBack, chair, card);

    root.eventMode = "static";
    root.cursor = "pointer";
    // Generous hit area — the spec asks for it and a 52px chair is not a target.
    const hit = new Graphics();
    hit.rect(-44, -70, 88, 110).fill({ color: 0xffffff, alpha: 0.001 });
    root.addChildAt(hit, 0);
    root.on("pointertap", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.nudge(root);
      if (seat.state === "empty") this.cb.onEmptyTap();
      else this.cb.onSeatTap(seat.id);
    });

    this.layers.chairs.addChild(root);
    if (this.primed && !this.reduced) this.arrive(root, card, at);
    else { card.scale.set(1.35); }

    const view: SeatView = { root, chairBack, chair, card, label, seat };
    this.seats.set(seat.id, view);
    return view;
  }

  /* A chair arriving: it slides IN toward the table from further out, then the
     name card unfolds on top of it, then a small sparkle. Three beats rather
     than one fade, because the spec asks for anticipation and overlap and
     because a fade says nothing about where the chair came from. */
  private arrive(root: Container, card: Container, at: { x: number; y: number }) {
    const outward = 1.5;
    root.position.set(at.x * outward, at.y * outward);
    root.alpha = 0;
    card.scale.set(1.35, 0);     // folded flat
    card.alpha = 0;

    const tl = gsap.timeline();
    tl.to(root, { alpha: 1, duration: 0.14 }, 0)
      .to(root, { x: at.x, y: at.y, duration: 0.58, ease: "back.out(1.4)" }, 0)
      .to(card, { alpha: 1, duration: 0.12 }, 0.34)
      .to(card.scale, { y: 1.35, duration: 0.42, ease: "back.out(2.6)" }, 0.34);
    this.track(tl as unknown as gsap.core.Tween);
    this.sparkle(at.x, at.y - 40, 4);
    this.onArrival?.();
  }

  private updateSeat(view: SeatView, seat: SceneSeat, at: { x: number; y: number }) {
    view.seat = seat;
    view.root.zIndex = at.y;
    if (view.root.x !== at.x || view.root.y !== at.y) {
      this.track(gsap.to(view.root, { x: at.x, y: at.y, duration: this.reduced ? 0 : 0.5, ease: "power3.out" }));
    }
    const empty = seat.state === "empty";
    if (view.label.text !== seat.name) { view.label.text = seat.name; fitLabel(view.label); }
    view.card.visible = !empty;
    view.chair.alpha = empty ? 0.45 : 1;
    view.chairBack.alpha = empty ? 0.45 : 1;
    view.chair.tint = empty ? 0xffffff : 0xffffff;

    if (empty && !this.reduced) {
      // An empty chair wiggles now and then: an invitation, not an alarm.
      if (!view.root.getChildByLabel?.("wiggling")) {
        const marker = new Container(); marker.label = "wiggling"; view.root.addChild(marker);
        this.track(gsap.to(view.root, {
          rotation: 0.05, duration: 0.5, yoyo: true, repeat: -1, repeatDelay: 2.4 + Math.random() * 2.6, ease: "sine.inOut",
        }));
      }
    }
  }

  private addDish(dish: SceneDish, at: { x: number; y: number }): DishView {
    const root = new Container();
    root.position.set(at.x, at.y);
    root.zIndex = 1000 + at.y;

    const plate = new Sprite(this.tex.plateEmpty);
    plate.anchor.set(0.5, 0.65);
    const food = new Sprite(this.tex.plateFood);
    food.anchor.set(0.5, 0.65);
    food.visible = dish.cooked;
    const cloche = new Sprite(this.tex.cloche);
    cloche.anchor.set(0.5, 0.65);
    cloche.visible = !dish.cooked;
    root.addChild(plate, food, cloche);

    root.eventMode = "static";
    root.cursor = "pointer";
    const hit = new Graphics();
    hit.rect(-36, -40, 72, 72).fill({ color: 0xffffff, alpha: 0.001 });
    root.addChildAt(hit, 0);
    root.on("pointertap", (e: FederatedPointerEvent) => { e.stopPropagation(); this.nudge(root); this.cb.onDishTap(dish.id); });

    this.layers.food.addChild(root);
    if (this.primed && !this.reduced) {
      // Set down from above, with the squash of something with weight in it.
      root.y = at.y - 70;
      root.alpha = 0;
      const tl = gsap.timeline();
      tl.to(root, { alpha: 1, duration: 0.12 }, 0)
        .to(root, { y: at.y, duration: 0.34, ease: "power2.in" }, 0)
        .to(root.scale, { x: 1.18, y: 0.82, duration: 0.08 }, 0.34)
        .to(root.scale, { x: 1, y: 1, duration: 0.42, ease: "elastic.out(1,0.45)" }, 0.42);
      this.track(tl as unknown as gsap.core.Tween);
      this.onArrival?.();
    }

    const view: DishView = { root, plate, food, cloche, dish };
    this.dishes.set(dish.id, view);
    return view;
  }

  private updateDish(view: DishView, dish: SceneDish, at: { x: number; y: number }) {
    const wasCooked = view.dish.cooked;
    view.dish = dish;
    view.root.zIndex = 1000 + at.y;
    if (view.root.x !== at.x || view.root.y !== at.y) {
      this.track(gsap.to(view.root, { x: at.x, y: at.y, duration: this.reduced ? 0 : 0.42, ease: "power3.out" }));
    }
    view.food.tint = PLATE_TINTS[hash(dish.id) % PLATE_TINTS.length];
    if (dish.cooked && !wasCooked && this.primed && !this.reduced) {
      this.reveal(view);
    } else {
      view.food.visible = dish.cooked;
      view.cloche.visible = !dish.cooked;
      view.cloche.alpha = 1;
      view.cloche.y = 0;
    }
  }

  /* The lid coming off — the one moment the spec asks to feel like a reward,
     and the only sequence here that is allowed to take most of a second.

     Order matters: the dish rises BEFORE the lid leaves, so the lid looks
     lifted rather than dropped through. Food appears under the lid while it is
     still in the way, so it is uncovered rather than popped into existence. */
  private reveal(view: DishView) {
    view.root.zIndex = 9999;                    // above its neighbours while open
    const tl = gsap.timeline({ onComplete: () => { view.root.zIndex = 1000 + view.root.y; } });

    tl.to(view.root.scale, { x: 1.3, y: 1.3, duration: 0.22, ease: "back.out(3)" }, 0)
      .add(() => { view.food.visible = true; view.food.alpha = 0; }, 0.14)
      .to(view.food, { alpha: 1, duration: 0.2 }, 0.14)
      .to(view.cloche, { y: -54, alpha: 0, duration: 0.42, ease: "power2.out" }, 0.18)
      .to(view.cloche.scale, { x: 1.12, y: 1.12, duration: 0.42, ease: "power2.out" }, 0.18)
      .add(() => { view.cloche.visible = false; view.cloche.y = 0; view.cloche.alpha = 1; view.cloche.scale.set(1); }, 0.62)
      .to(view.root.scale, { x: 1, y: 1, duration: 0.55, ease: "elastic.out(1,0.5)" }, 0.52);

    this.track(tl as unknown as gsap.core.Tween);
    this.steam(view.root.x, view.root.y - 10);
    this.sparkle(view.root.x, view.root.y - 16, 7);
    this.onArrival?.();
  }

  /* Slow, drifting, randomised — not a jet.
   *
   * One timeline per wisp rather than three overlapping tweens. The first
   * version faded IN and OUT with two concurrent gsap.to() calls on the same
   * alpha; the later one won from the first frame, so every wisp rose at alpha
   * zero. It was drawn, it moved, it was destroyed, and nobody ever saw it.
   * Inside a timeline the two are sequenced and cannot fight. */
  private steam(x: number, y: number) {
    for (let i = 0; i < 7; i++) {
      const s = new Sprite(this.tex.steam);
      s.anchor.set(0.5);
      s.position.set(x + (Math.random() - 0.5) * 22, y);
      s.scale.set(0.8 + Math.random() * 0.5);
      s.alpha = 0;
      this.layers.effects.addChild(s);

      const rise = 1.3 + Math.random() * 0.6;
      const tl = gsap.timeline({ delay: i * 0.1, onComplete: () => s.destroy() });
      tl.to(s, { alpha: 0.85, duration: 0.22 }, 0)
        .to(s, { y: y - 70 - Math.random() * 40, x: s.x + (Math.random() - 0.5) * 40, duration: rise, ease: "sine.out" }, 0)
        .to(s.scale, { x: s.scale.x * 1.35, y: s.scale.y * 1.35, duration: rise, ease: "sine.out" }, 0)
        .to(s, { alpha: 0, duration: rise * 0.5 }, rise * 0.5);
      this.track(tl as unknown as gsap.core.Tween);
    }
  }

  private sparkle(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.tex.spark);
      s.anchor.set(0.5);
      s.position.set(x, y);
      s.scale.set(0.5 + Math.random() * 0.4);
      this.layers.effects.addChild(s);
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      this.track(gsap.to(s, {
        x: x + Math.cos(a) * (44 + Math.random() * 28), y: y + Math.sin(a) * (32 + Math.random() * 22),
        alpha: 0, rotation: Math.random() * 2, duration: 0.6 + Math.random() * 0.35,
        ease: "power2.out", onComplete: () => s.destroy(),
      }));
    }
  }

  private setStage(stage: number) {
    const flame = this.layers.decorations.getChildByLabel("flame");
    if (flame) flame.visible = stage >= 3;
  }

  /** 100–150ms tap feedback, per the spec's timings. */
  private nudge(target: Container) {
    if (this.reduced) return;
    gsap.fromTo(target.scale, { x: target.scale.x * 0.92, y: target.scale.y * 0.92 }, { x: 1, y: 1, duration: 0.14, ease: "back.out(3)" });
  }

  /* ── camera ────────────────────────────────────────────────────────────── */

  /** Frame the whole table inside `w × h`, leaving room for the chrome. */
  fit(w: number, h: number, animate = false) {
    if (this.destroyed) return;
    // Chairs stick out past the seat ellipse, and a name card stands above the
    // tallest of them — that is what the margins are, measured rather than
    // guessed at, so the top card is never clipped by the header.
    // +44 is the name card's half-width past the chair it stands on. At +30
    // the cards on the far left and right lost their last letter.
    const halfW = SEAT_RX + 44;
    const halfH = SEAT_RY + 76;
    const scale = Math.min(w / (halfW * 2 * 1.03), h / (halfH * 2 * 1.03));
    const to = { x: w / 2, y: h / 2 + halfH * scale * 0.06, sx: scale, sy: scale };
    if (animate && !this.reduced) {
      this.track(gsap.to(this.world, { x: to.x, y: to.y, duration: 0.42, ease: "power3.out" }));
      this.track(gsap.to(this.world.scale, { x: to.sx, y: to.sy, duration: 0.42, ease: "power3.out" }));
    } else {
      this.world.position.set(to.x, to.y);
      this.world.scale.set(scale);
    }
  }

  /** Lean toward something that was tapped, without ever hiding the rest. */
  focus(id: string, w: number, h: number) {
    if (this.reduced) return;
    const target = this.seats.get(id)?.root ?? this.dishes.get(id)?.root;
    if (!target) return;
    const base = Math.min(w / ((SEAT_RX + 44) * 2 * 1.03), h / ((SEAT_RY + 76) * 2 * 1.03));
    const scale = base * 1.22;
    this.track(gsap.to(this.world.scale, { x: scale, y: scale, duration: 0.42, ease: "power3.out" }));
    this.track(gsap.to(this.world, {
      x: w / 2 - target.x * scale * 0.55,
      y: h * 0.40 - target.y * scale * 0.55,
      duration: 0.42, ease: "power3.out",
    }));
  }

  private track(t: gsap.core.Tween) { this.tweens.add(t); t.eventCallback("onComplete", () => this.tweens.delete(t)); }

  /** An accessible description of what the canvas is showing. */
  describe(model: SceneModel): string {
    const seated = model.seats.filter((s) => s.state !== "empty");
    return `A round table with ${seated.length} ${seated.length === 1 ? "person" : "people"} and ${model.dishCount} ${model.dishCount === 1 ? "dish" : "dishes"}, ${model.cookedCount} cooked.`;
  }

  destroy() {
    this.destroyed = true;
    this.idle?.kill();
    for (const t of this.tweens) t.kill();
    this.tweens.clear();
    gsap.killTweensOf(this.world);
    this.seats.clear();
    this.dishes.clear();
    destroyTextures(this.tex);
  }
}

/** Keep a name inside its card. "Laniekid" is wider than the card it stands on. */
function fitLabel(label: Text) {
  const MAX = 48;
  label.scale.set(1);
  if (label.width > MAX) label.scale.set(MAX / label.width);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export { WORLD_W, WORLD_H, LIME, BUTTER, PAPER, INK_SOFT };
