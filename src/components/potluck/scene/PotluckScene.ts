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
import { destroySprites, GUEST_SPRITES, type SpriteBank, type SpriteName } from "./textures";
import { seatAngle, type SceneDish, type SceneModel, type SceneSeat } from "./model";

const INK = 0x171410;
const INK_SOFT = 0x4a4742;
const SURFACE = 0xe9e2d3;
const PAPER = 0xfbf7ee;
const LIME = 0xc4ee45;
const BUTTER = 0xffd84d;
const PLATE_TINTS = [0xc4ee45, 0xffd84d, 0xc9b8ff, 0xf2c77a, 0xff4d9d];

/** The paper backdrop behind the room, authored at a fixed size. */
const WORLD_W = 900;
const WORLD_H = 760;

/* ── the room, measured in metres ──────────────────────────────────────────
 *
 * Every number below is a real measurement in the modelled room, and every
 * object is placed by projecting it through the SAME orthographic camera the
 * sprites were rendered with (tools/blender/potluck_assets.py, 55° pitch and
 * 45° yaw, carried here in the manifest's `right` and `up` vectors).
 *
 * That is the whole point of this rewrite. The previous version squashed
 * circles into screen-space ellipses — TABLE_RX/TABLE_RY and friends — and
 * hoped they read as a tabletop seen from above. They are the "geometric
 * shapes as final artwork" the spec rules out, and no amount of tuning the
 * squash would have fixed it: a sprite drawn at 55° only sits correctly on a
 * floor drawn at 55°. With a shared projection, placement stops being
 * eyeballed. A chair goes where a chair goes, and it lands there.
 */
const PPM = 300;              // world pixels per metre, before the camera fits
const TABLE_TOP = 0.74;       // height of the tabletop off the floor
const DISH_RING = 0.36;       // where dishes sit on the top
/* Plates are 22cm across in the model, which is correct and too small to see:
   at the camera's fitted scale a cooked dish was six pixels of colour. The
   spec asks for food big enough to read, so the crockery is the one thing in
   the room deliberately drawn larger than life. */
const DISH_SCALE = 1.45;
const SETTING_RING = 0.47;    // an empty plate per person, nearer the rim
const GUEST_RING = 0.92;      // people, standing at their place
const CHAIR_RING = 1.18;      // their chair, just behind them
const CARD_Z = 1.14;          // a name card floats clear above the heads
const CARD_W = 0.32;          // and is 32cm wide — small enough that six do not collide
/** The width the name-card artwork is drawn at, before it is scaled to CARD_W. */
const CARD_ART_W = 56;
/** The card artwork is drawn at CARD_ART_W, so this is what makes it CARD_W wide. */
const CARD_SCALE = (CARD_W * PPM) / CARD_ART_W;
/** cos(55°): how far the ground plane is foreshortened up the screen. */
const GROUND_SQUASH = 0.5736;

/* The design extent, in metres along the camera's own axes.
 *
 * The floor is 2.4m across but only 1.38m tall once projected, and its sprite
 * frame is square — so fitting the camera to the frame would leave a third of
 * a phone screen empty above and below, which is exactly the "excessive empty
 * space" the spec calls out. These are the numbers for the CONTENT instead:
 * the floor rim sideways, and whichever is taller at the top, the far rim or
 * a name card above a guest at the back of the ring. */
const EXTENT_X = 1.24;
const EXTENT_UP = 1.66;
const EXTENT_DOWN = 0.94;

/* The camera stands at 45° of azimuth, so the nearest point on any ground
   ring is at 45° — not at the bottom of a screen-space ellipse. seatAngle()
   puts seat 0 at 90° for the old ellipse; this turns it round to the front of
   the real one, so the first guest still faces the viewer. */
const FRONT_TURN = -Math.PI / 4;

/** A ground point in the room, and where it lands. */
type Spot = {
  /** Angle around the table, before FRONT_TURN. */
  a: number;
  /** The point itself, in metres. */
  g: { x: number; y: number };
  /** The same point in world pixels. */
  p: { x: number; y: number };
  /** Depth order: the camera looks from +x +y, so bigger x+y is nearer. */
  z: number;
};

export type SceneCallbacks = {
  onSeatTap: (seatId: string) => void;
  onDishTap: (dishId: string) => void;
  onEmptyTap: () => void;
};

/* The guest is now one rendered sprite rather than a stack of drawn parts, so
   there are no eyes to hide and no blink texture to swap to. Blinking is gone
   until there is a second render to swap IN — faking it by squashing the whole
   character would look worse than a steady gaze, and character animation is a
   later step of the spec than getting the room right. */
type Guest = { root: Container; inner: Container };
type SeatView = { root: Container; chair: Sprite; guest: Guest; card: Container; label: Text; seat: SceneSeat };
/* A dish is a plate, a lid and the food under it — three sprites, so the lid
   can leave without the plate. A single "covered plate" texture cannot be
   opened, and opening it is the point. */
type DishView = { root: Container; plate: Sprite; food: Sprite; cloche: Sprite; dish: SceneDish };

export class PotluckScene {
  readonly app: Application;
  private world = new Container();
  private layers: Record<string, Container> = {};
  private bank: SpriteBank;
  private seats = new Map<string, SeatView>();
  private dishes = new Map<string, DishView>();
  private cb: SceneCallbacks;
  private reduced: boolean;
  private tweens = new Set<gsap.core.Tween>();
  private idle: gsap.core.Timeline | null = null;
  private blinkTimers = new Set<ReturnType<typeof setTimeout>>();
  private stage = 0;
  private destroyed = false;
  /* Opening a potluck is not four people arriving. Everything present on the
     first reconcile is simply placed; only what appears AFTER that animates in.
     The spec is explicit — do not replay every historical animation. */
  private primed = false;
  private onArrival?: () => void;

  constructor(app: Application, bank: SpriteBank, cb: SceneCallbacks, reducedMotion: boolean) {
    this.app = app;
    this.cb = cb;
    this.reduced = reducedMotion;
    this.bank = bank;

    // Spec order, back to front. Named so a reader can find where a thing goes.
    for (const name of ["environment", "shadows", "chairs", "table", "settings", "food", "characters", "decorations", "effects", "indicators"]) {
      const c = new Container();
      c.sortableChildren = name === "food" || name === "chairs" || name === "characters" || name === "decorations";
      // (characters are depth-sorted too: whoever is nearer the viewer overlaps)
      this.layers[name] = c;
      this.world.addChild(c);
    }

    this.world.sortableChildren = false;
    app.stage.addChild(this.world);
    this.buildRoom();
  }

  /* ── the parts that never change ───────────────────────────────────────── */

  /* ── the shared camera ─────────────────────────────────────────────────── */

  /** A point in the modelled room, in metres, to world pixels. */
  private project(x: number, y: number, z: number): { x: number; y: number } {
    const { right, up } = this.bank.basis;
    return {
      x: (x * right[0] + y * right[1] + z * right[2]) * PPM,
      // Screen y runs down, the camera's up vector runs up.
      y: -(x * up[0] + y * up[1] + z * up[2]) * PPM,
    };
  }

  /** A seat or dish position on a ring around the table. */
  private spot(a: number, r: number): Spot {
    const t = a + FRONT_TURN;
    const g = { x: Math.cos(t) * r, y: Math.sin(t) * r };
    return { a, g, p: this.project(g.x, g.y, 0), z: Math.round((g.x + g.y) * 1000) };
  }

  /* A rendered piece at its true size, anchored on the spot it stands on.
     Both numbers come from the manifest: `metres` is how wide the rendered
     frame is in the room, so a candle and a dining table are sized against
     EACH OTHER instead of each being stretched to fill its own frame, and
     `anchor` is where the object's own origin sits inside that frame, so it
     can be placed by its base rather than nudged into place by eye. */
  private piece(name: SpriteName, k = 1): Sprite {
    const info = this.bank.sprites[name];
    const s = new Sprite(info.texture);
    s.anchor.set(info.anchor[0], info.anchor[1]);
    const w = info.metres * PPM * k;
    s.width = w;
    s.height = w;   // the frames are square by construction
    return s;
  }

  /** A soft contact shadow for something `r` metres across, on the floor. */
  private contact(r: number, alpha = 1): Sprite {
    const s = new Sprite(this.bank.fx.shadow);
    s.anchor.set(0.5, 0.5);
    s.width = r * 2 * PPM;
    s.height = r * 2 * PPM * GROUND_SQUASH;
    s.alpha = alpha;
    return s;
  }

  /* ── the parts that never change ───────────────────────────────────────── */

  private buildRoom() {
    // The dotted paper the whole app is printed on, behind the room.
    const backdrop = new Graphics();
    backdrop.rect(-WORLD_W, -WORLD_H, WORLD_W * 2, WORLD_H * 2).fill({ color: SURFACE });
    for (let y = -WORLD_H; y < WORLD_H; y += 26) {
      for (let x = -WORLD_W; x < WORLD_W; x += 26) backdrop.circle(x, y, 1.6).fill({ color: INK, alpha: 0.05 });
    }
    this.layers.environment.addChild(backdrop);

    const at = (s: Sprite, x: number, y: number, z = 0) => {
      const p = this.project(x, y, z);
      s.position.set(p.x, p.y);
      return s;
    };

    this.layers.environment.addChild(at(this.piece("floor"), 0, 0));
    this.layers.environment.addChild(at(this.piece("rug"), 0, 0));
    // A plant against the far wall, so the floor has something on it besides
    // the table and the room reads as a room.
    this.layers.environment.addChild(at(this.piece("plant"), -1.42, 1.46));

    this.layers.shadows.addChild(at(this.contact(0.64, 0.95), 0, 0, 0.004));
    this.layers.table.addChild(at(this.piece("table"), 0, 0));

    /* A seasonal cloth, and nothing more than that. "Seasonal environments"
       could mean a different room four times a year; it could also mean one
       honest touch that makes December feel like December. This is the second,
       because the first is a pile of art nobody has drawn yet and a gimmick is
       worse than a plain table. One render, tinted four ways. */
    const cloth = this.piece("cloth");
    cloth.tint = SEASON_CLOTH[season()];
    this.layers.table.addChild(at(cloth, 0, 0));

    // Flowers on the top, off-centre, with a sway that is barely movement.
    // The spec asks for life, not for a table that fidgets.
    const flowers = this.piece("flowers");
    flowers.label = "flowers";
    flowers.zIndex = -120;
    this.layers.decorations.addChild(at(flowers, -0.12, -0.14, TABLE_TOP));
    if (!this.reduced) {
      this.track(gsap.to(flowers, { rotation: 0.045, duration: 2.6 + Math.random(), repeat: -1, yoyo: true, ease: "sine.inOut" }));
    }

    const candle = this.piece("candle");
    candle.label = "candle";
    candle.zIndex = 150;
    this.layers.decorations.addChild(at(candle, 0.15, 0.03, TABLE_TOP));
    if (!this.reduced) {
      /* The flame is part of the candle render now, so there is no separate
         sprite to flicker. Rather than draw a shape over the top of it — the
         exact thing this rewrite exists to stop — the candle gets a slow
         breath of warmth. A real flicker needs a second render, which belongs
         with the character animation step rather than here. */
      this.track(gsap.to(candle, { alpha: 0.88, duration: 1.3 + Math.random() * 0.5, repeat: -1, yoyo: true, ease: "sine.inOut" }));
    }
  }

  /* ── reconciliation: the only way state gets in ────────────────────────── */

  reconcile(model: SceneModel) {
    if (this.destroyed) return;
    const n = model.seats.length;

    /* The laid plates are re-placed on every reconcile rather than only when
       the seat count changes. They are at most one sprite per person, and the
       alternative is a stale plate sitting next to the dish that replaced it —
       which is what the table looked like: six pale discs where there were
       four people and two dishes. */
    this.clearPlaceSettings();

    const seenSeats = new Set<string>();
    model.seats.forEach((seat, i) => {
      seenSeats.add(seat.id);
      const at = this.spot(seatAngle(i, n), GUEST_RING);
      const existing = this.seats.get(seat.id);
      const view = existing ?? this.addSeat(seat, at);
      // A plate waiting for a dish — so it goes away once a dish arrives.
      if (seat.state !== "empty" && seat.dishIds.length === 0) this.addPlaceSetting(seat.id, at);
      this.updateSeat(view, seat, at);
    });
    for (const [id, view] of this.seats) {
      if (!seenSeats.has(id)) { view.root.destroy({ children: true }); view.guest.root.destroy({ children: true }); this.seats.delete(id); }
    }

    const seenDishes = new Set<string>();
    model.dishes.forEach((dish) => {
      seenDishes.add(dish.id);
      const seatIndex = model.seats.findIndex((s) => s.id === dish.seatId);
      const ownDishes = model.dishes.filter((d) => d.seatId === dish.seatId);
      const slot = ownDishes.findIndex((d) => d.id === dish.id);
      const a = seatAngle(seatIndex < 0 ? 0 : seatIndex, n);
      // Fan a person's dishes along the top in front of their chair.
      const spread = (slot - (ownDishes.length - 1) / 2) * 0.3;
      const at = this.spot(a + spread, DISH_RING);
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

  private addSeat(seat: SceneSeat, at: Spot): SeatView {
    const root = new Container();
    root.position.set(at.p.x, at.p.y);
    root.zIndex = at.z;

    /* The chair stands a little further out than the person does, so the
       scene reads as people AT a table rather than a chair and a guest
       occupying the same square foot. Both are placed in the room and the
       difference between the two projected points is the offset. */
    const chairAt = this.spot(at.a, CHAIR_RING);
    const chair = this.piece("chair");
    chair.position.set(chairAt.p.x - at.p.x, chairAt.p.y - at.p.y);
    const chairShade = this.contact(0.26, 0.7);
    chairShade.position.copyFrom(chair.position);
    const guestShade = this.contact(0.2, 0.75);

    const guest = this.makeGuest(seat);

    const card = new Container();
    const cardArt = new Sprite(this.bank.fx.nameCard);
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
    card.scale.set(CARD_SCALE);
    // Floating at a real height above the floor, so the card on the far side
    // of the table sits higher up the screen than the one at the front —
    // which is what makes the room look like a room.
    const cardAt = this.project(at.g.x, at.g.y, CARD_Z);
    card.position.set(cardAt.x - at.p.x, cardAt.y - at.p.y);

    root.addChild(chairShade, guestShade, chair);
    // The guest does NOT live inside the chair. Layers are painted in order
    // and the TABLE comes after the chairs, so a head sitting above its chair
    // was drawn and then covered by the tabletop. That is what the characters
    // layer is for: it is painted after the table, which is why the spec puts
    // it there. The cost is that the guest has to be moved in step with its
    // chair by hand, below.
    guest.root.position.set(at.p.x, at.p.y);
    guest.root.zIndex = at.z;
    /* The name card goes in with the GUEST, not with the chair. In the chairs
       layer it was painted before the tabletop, so the card of anyone sitting
       at the front of the table — the person whose name you most want to read
       — disappeared behind the table. It is a sibling of the breathing
       container rather than a child of it, so it does not breathe. */
    guest.root.addChild(card);
    this.layers.characters.addChild(guest.root);

    root.eventMode = "static";
    root.cursor = "pointer";
    // Generous hit area — the spec asks for it and a 52px chair is not a target.
    const hit = new Graphics();
    hit.rect(-130, -300, 260, 340).fill({ color: 0xffffff, alpha: 0.001 });
    root.addChildAt(hit, 0);
    root.on("pointertap", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.nudge(root);
      if (seat.state === "empty") this.cb.onEmptyTap();
      else this.cb.onSeatTap(seat.id);
    });

    this.layers.chairs.addChild(root);
    if (this.primed && !this.reduced) this.arrive(root, guest.root, card, at);
    else { card.scale.set(CARD_SCALE); }

    const view: SeatView = { root, chair, guest, card, label, seat };
    this.seats.set(seat.id, view);
    return view;
  }

  /* One of four rendered people, chosen by the seat's id so the same person
     is the same person every time the potluck is opened.
     Choosing a RENDER rather than tinting one: a Pixi tint multiplies the
     whole sprite, and the first version of this did exactly that — a red seat
     got red skin and red hair, which is a coloured statue, not a guest. */
  private makeGuest(seat: SceneSeat): Guest {
    const root = new Container();
    const inner = new Container();
    root.addChild(inner);

    const body = this.piece(GUEST_SPRITES[hash(seat.id) % GUEST_SPRITES.length]);
    inner.addChild(body);
    root.visible = seat.state !== "empty";

    const guest: Guest = { root, inner };
    if (!this.reduced) {
      // Randomised phase AND period, so nobody at the table breathes in time
      // with anybody else.
      // Breathing is on an inner container, because the outer one is what the
      // chair drags around — tweening y on both would fight, which is the bug
      // the steam already taught this file once.
      this.track(gsap.to(inner, {
        y: -5, duration: 1.6 + Math.random() * 0.9, repeat: -1, yoyo: true,
        ease: "sine.inOut", delay: Math.random() * 2,
      }));
    }
    return guest;
  }

  /* A chair arriving: it slides IN toward the table from further out, then the
     name card unfolds on top of it, then a small sparkle. Three beats rather
     than one fade, because the spec asks for anticipation and overlap and
     because a fade says nothing about where the chair came from. */
  private arrive(root: Container, follow: Container, card: Container, at: Spot) {
    // In from further out along the same radius — through the room, not across
    // the screen, so the chair arrives from where a chair would come from.
    const from = this.spot(at.a, GUEST_RING * 1.7);
    root.position.set(from.p.x, from.p.y);
    follow.position.set(from.p.x, from.p.y);
    root.alpha = 0;
    follow.alpha = 0;
    card.scale.set(CARD_SCALE, 0);     // folded flat
    card.alpha = 0;

    const tl = gsap.timeline();
    tl.to([root, follow], { alpha: 1, duration: 0.14 }, 0)
      .to([root, follow], { x: at.p.x, y: at.p.y, duration: 0.58, ease: "back.out(1.4)" }, 0)
      .to(card, { alpha: 1, duration: 0.12 }, 0.34)
      .to(card.scale, { y: CARD_SCALE, duration: 0.42, ease: "back.out(2.6)" }, 0.34);
    this.track(tl as unknown as gsap.core.Tween);
    this.sparkle(at.p.x, at.p.y - CARD_Z * PPM * 0.6, 4);
    this.onArrival?.();
  }

  /* An empty plate on the table in front of each chair. It is scenery — no
     hit area, no reconciliation — so it lives in its own layer and is cleared
     wholesale when the seat count changes.
     The drawn glass and cutlery are gone: there is no rendered glass in the
     set, and standing in for one with an outlined shape is the substitution
     this rewrite removes. A laid plate per person is real art and says the
     same thing. */
  private addPlaceSetting(seatId: string, at: Spot) {
    const g = this.spot(at.a, SETTING_RING);
    const plate = this.piece("plate", DISH_SCALE);
    const p = this.project(g.g.x, g.g.y, TABLE_TOP);
    plate.position.set(p.x, p.y);
    plate.alpha = 0.85;
    plate.label = `setting:${seatId}`;
    this.layers.settings.addChild(plate);
  }

  private clearPlaceSettings() { this.layers.settings.removeChildren().forEach((c) => c.destroy()); }

  private updateSeat(view: SeatView, seat: SceneSeat, at: Spot) {
    view.seat = seat;
    view.root.zIndex = at.z;
    view.guest.root.zIndex = at.z;
    if (view.root.x !== at.p.x || view.root.y !== at.p.y) {
      const d = this.reduced ? 0 : 0.5;
      this.track(gsap.to(view.root, { x: at.p.x, y: at.p.y, duration: d, ease: "power3.out" }));
      this.track(gsap.to(view.guest.root, { x: at.p.x, y: at.p.y, duration: d, ease: "power3.out" }));
    }
    const empty = seat.state === "empty";
    view.guest.root.visible = !empty;
    if (view.label.text !== seat.name) { view.label.text = seat.name; fitLabel(view.label); }
    view.card.visible = !empty;
    view.chair.alpha = empty ? 0.5 : 1;

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

  private addDish(dish: SceneDish, at: Spot): DishView {
    const root = new Container();
    const top = this.project(at.g.x, at.g.y, TABLE_TOP);
    root.position.set(top.x, top.y);
    root.zIndex = at.z;

    /* Three sprites so the lid can leave without the plate. All three were
       modelled on the same spot in the same room, so they stack by their own
       anchors — the cloche sits ON the plate because that is where it sat in
       Blender, not because of a hand-picked offset. */
    const plate = this.piece("plate", DISH_SCALE);
    const food = this.piece("food", DISH_SCALE);
    food.visible = dish.cooked;
    const cloche = this.piece("cloche", DISH_SCALE);
    // Lids are coloured per dish. Six identical cream domes on a cream cloth
    // read as a row of marshmallows; six colours read as six dishes.
    cloche.tint = PLATE_TINTS[hash(dish.id) % PLATE_TINTS.length];
    cloche.visible = !dish.cooked;
    root.addChild(plate, food, cloche);

    root.eventMode = "static";
    root.cursor = "pointer";
    const hit = new Graphics();
    hit.rect(-58, -84, 116, 116).fill({ color: 0xffffff, alpha: 0.001 });
    root.addChildAt(hit, 0);
    root.on("pointertap", (e: FederatedPointerEvent) => { e.stopPropagation(); this.nudge(root); this.cb.onDishTap(dish.id); });

    this.layers.food.addChild(root);
    if (this.primed && !this.reduced) {
      // Set down from above, with the squash of something with weight in it.
      root.y = top.y - 90;
      root.alpha = 0;
      const tl = gsap.timeline();
      tl.to(root, { alpha: 1, duration: 0.12 }, 0)
        .to(root, { y: top.y, duration: 0.34, ease: "power2.in" }, 0)
        .to(root.scale, { x: 1.18, y: 0.82, duration: 0.08 }, 0.34)
        .to(root.scale, { x: 1, y: 1, duration: 0.42, ease: "elastic.out(1,0.45)" }, 0.42);
      this.track(tl as unknown as gsap.core.Tween);
      this.onArrival?.();
    }

    const view: DishView = { root, plate, food, cloche, dish };
    this.dishes.set(dish.id, view);
    return view;
  }

  private updateDish(view: DishView, dish: SceneDish, at: Spot) {
    const wasCooked = view.dish.cooked;
    view.dish = dish;
    view.root.zIndex = at.z;
    const top = this.project(at.g.x, at.g.y, TABLE_TOP);
    if (view.root.x !== top.x || view.root.y !== top.y) {
      this.track(gsap.to(view.root, { x: top.x, y: top.y, duration: this.reduced ? 0 : 0.42, ease: "power3.out" }));
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
      const s = new Sprite(this.bank.fx.steam);
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
      const s = new Sprite(this.bank.fx.spark);
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

  /* Stage four is a STATE, not an event. Opening a potluck that was finished
     last Sunday should show a laid, decorated, candle-lit table — not throw
     confetti at you again. So the decorations are set from the stage every
     time, and the celebration only fires on the TRANSITION into it, and only
     if the scene was already on screen when it happened. */
  private setStage(stage: number) {
    /* The table dresses itself as the week goes on, out of the rendered set:
       flowers once there is somebody to sit with, a lit candle once something
       has actually been cooked. The bunting is gone — there is no bunting in
       the render set, and an outlined zigzag standing in for one is the
       placeholder art this rewrite removes. */
    const flowers = this.layers.decorations.getChildByLabel("flowers");
    if (flowers) flowers.visible = stage >= 2;

    const candle = this.layers.decorations.getChildByLabel("candle");
    if (candle) candle.visible = stage >= 3;

    const was = this.stage;
    this.stage = stage;
    if (stage >= 4 && was > 0 && was < 4 && this.primed && !this.reduced) this.feast();
  }

  /* The table already laid — this is the moment the last lid comes off IN
     FRONT OF YOU, plus confetti, plus everybody at the table bouncing.
     Brief: the spec allows 1.5-2.5s and the confetti is gone inside that. */
  private feast() {
    const flowers = this.layers.decorations.getChildByLabel("flowers");
    if (flowers) {
      this.track(gsap.fromTo(flowers.scale, { x: flowers.scale.x * 0.7, y: flowers.scale.y * 0.7 },
        { x: flowers.scale.x, y: flowers.scale.y, duration: 0.7, ease: "back.out(2.4)" }));
    }
    for (const view of this.seats.values()) {
      if (view.seat.state === "empty") continue;
      this.track(gsap.fromTo(view.guest.root, { y: view.guest.root.y },
        { y: view.guest.root.y - 16, duration: 0.26, yoyo: true, repeat: 3, ease: "sine.inOut", delay: Math.random() * 0.3 }));
    }
    this.confetti();
  }

  private confetti() {
    const COLS = [0xc4ee45, 0xffd84d, 0xff4d9d, 0xc9b8ff, 0xf2c77a, 0xe5462e];
    for (let i = 0; i < 46; i++) {
      const c = new Sprite(this.bank.fx.confetti);
      c.anchor.set(0.5);
      c.tint = COLS[i % COLS.length];
      c.position.set((Math.random() - 0.5) * 760, -420 - Math.random() * 200);
      c.rotation = Math.random() * 3;
      c.scale.set(0.7 + Math.random() * 0.6);
      this.layers.effects.addChild(c);
      const tl = gsap.timeline({ delay: Math.random() * 0.5, onComplete: () => c.destroy() });
      tl.to(c, { y: 380 + Math.random() * 90, duration: 1.5 + Math.random() * 0.8, ease: "none" }, 0)
        .to(c, { x: c.x + (Math.random() - 0.5) * 150, duration: 1.5 + Math.random() * 0.8, ease: "sine.inOut" }, 0)
        .to(c, { rotation: c.rotation + (Math.random() - 0.5) * 9, duration: 2, ease: "none" }, 0)
        .to(c, { alpha: 0, duration: 0.4 }, 1.5);
      this.track(tl as unknown as gsap.core.Tween);
    }
  }

  /* A picture of the table as it actually is, for the postcard. Everything in
     the scene is drawn by us, so there is nothing cross-origin in here and the
     extract always succeeds — which is the reason the table was never made of
     photographs. */
  snapshot(): HTMLCanvasElement | null {
    if (this.destroyed) return null;
    try {
      return this.app.renderer.extract.canvas(this.world) as HTMLCanvasElement;
    } catch {
      return null;
    }
  }

  /** 100–150ms tap feedback, per the spec's timings. */
  private nudge(target: Container) {
    if (this.reduced) return;
    gsap.fromTo(target.scale, { x: target.scale.x * 0.92, y: target.scale.y * 0.92 }, { x: 1, y: 1, duration: 0.14, ease: "back.out(3)" });
  }

  /* ── camera ────────────────────────────────────────────────────────────── */

  /** The scale that fits the room's CONTENT — not its sprite frames — in `w × h`. */
  private cameraScale(w: number, h: number) {
    return Math.min(
      w / (EXTENT_X * 2 * PPM * 1.03),
      h / ((EXTENT_UP + EXTENT_DOWN) * PPM * 1.03),
    );
  }

  /** Frame the room inside `w × h`, leaving room for the chrome. */
  fit(w: number, h: number, animate = false) {
    if (this.destroyed) return;
    const scale = this.cameraScale(w, h);
    // The room is not centred on the world origin — it runs further up the
    // screen than down it, because the far side of the floor and the name
    // cards above the back row are both up there. Offsetting by that
    // difference is what keeps the far rim from being cropped by the header.
    const midY = ((EXTENT_DOWN - EXTENT_UP) / 2) * PPM;
    const to = { x: w / 2, y: h / 2 - midY * scale, sx: scale, sy: scale };
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
    const scale = this.cameraScale(w, h) * 1.22;
    this.track(gsap.to(this.world.scale, { x: scale, y: scale, duration: 0.42, ease: "power3.out" }));
    this.track(gsap.to(this.world, {
      x: w / 2 - target.x * scale * 0.55,
      y: h * 0.40 - target.y * scale * 0.55,
      duration: 0.42, ease: "power3.out",
    }));
  }

  /* Keep a handle on every animation so destroy() can kill them, WITHOUT
     stealing the one callback the animation already had.
     The first version called eventCallback("onComplete", ...) and overwrote
     it. Every timeline built as gsap.timeline({ onComplete: () => sprite
     .destroy() }) therefore never destroyed its sprite: steam, sparks,
     confetti and hearts all accumulated on the effects layer for the life of
     the page. It was invisible because a finished particle sits at alpha 0 —
     the only way to see it was to count the layer's children and watch the
     number never go down. */
  private track<T extends gsap.core.Animation>(t: T): T {
    const handle = t as unknown as gsap.core.Tween;
    this.tweens.add(handle);
    const prev = t.eventCallback("onComplete") as (() => void) | null;
    t.eventCallback("onComplete", () => { this.tweens.delete(handle); prev?.(); });
    return t;
  }

  /* A reaction crossing the table, from the person who sent it to the dish it
     landed on. The spec asks for exactly this, and it is the one thing that
     makes a heart feel like it came from somebody rather than appearing.

     The arc is two tweens on y against one on x rather than a motion path —
     MotionPathPlugin is a paid GSAP plugin, and an up-then-down y with a
     linear x is indistinguishable from one at this distance. */
  fly(fromSeatId: string, toDishId: string) {
    if (this.reduced) return;
    const from = this.seats.get(fromSeatId)?.root;
    const to = this.dishes.get(toDishId)?.root;
    if (!from || !to) return;

    const s = new Sprite(this.bank.fx.heart);
    s.anchor.set(0.5);
    s.position.set(from.x, from.y - 40);
    s.scale.set(0.4);
    this.layers.effects.addChild(s);

    const peak = Math.min(from.y, to.y) - 90;
    const tl = gsap.timeline({ onComplete: () => { s.destroy(); } });
    tl.to(s.scale, { x: 1.5, y: 1.5, duration: 0.2, ease: "back.out(3)" }, 0)
      .to(s, { x: to.x, duration: 0.74, ease: "none" }, 0)
      .to(s, { y: peak, duration: 0.37, ease: "sine.out" }, 0)
      .to(s, { y: to.y - 12, duration: 0.37, ease: "sine.in" }, 0.37)
      .to(s, { rotation: 0.5, duration: 0.74, ease: "none" }, 0)
      .to(s.scale, { x: 0.9, y: 0.9, duration: 0.18 }, 0.56)
      .to(s, { alpha: 0, duration: 0.2 }, 0.72);
    this.track(tl as unknown as gsap.core.Tween);

    // and the dish notices it arrived
    this.track(gsap.delayedCall(0.74, () => {
      if (this.destroyed) return;
      const dish = this.dishes.get(toDishId)?.root;
      if (dish) gsap.fromTo(dish.scale, { x: 1.16, y: 1.16 }, { x: 1, y: 1, duration: 0.45, ease: "elastic.out(1,0.5)" });
    }) as unknown as gsap.core.Tween);
  }

  /** An accessible description of what the canvas is showing. */
  describe(model: SceneModel): string {
    const seated = model.seats.filter((s) => s.state !== "empty");
    return `A round table with ${seated.length} ${seated.length === 1 ? "person" : "people"} and ${model.dishCount} ${model.dishCount === 1 ? "dish" : "dishes"}, ${model.cookedCount} cooked.`;
  }

  destroy() {
    this.destroyed = true;
    this.idle?.kill();
    for (const t of this.blinkTimers) clearTimeout(t);
    this.blinkTimers.clear();
    for (const t of this.tweens) t.kill();
    this.tweens.clear();
    gsap.killTweensOf(this.world);
    this.seats.clear();
    this.dishes.clear();
    destroySprites(this.bank);
  }
}

/** Keep a name inside its card. "Laniekid" is wider than the card it stands on. */
function fitLabel(label: Text) {
  const MAX = 48;
  label.scale.set(1);
  if (label.width > MAX) label.scale.set(MAX / label.width);
}

/** Northern-hemisphere seasons by month, which is as clever as this gets. */
function season(): "winter" | "spring" | "summer" | "autumn" {
  const m = new Date().getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}

const SEASON_CLOTH: Record<ReturnType<typeof season>, number> = {
  winter: 0x9ad7e8,
  spring: 0xc4ee45,
  summer: 0xffd84d,
  autumn: 0xf2a65a,
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export { WORLD_W, WORLD_H, LIME, BUTTER, PAPER, INK_SOFT };
