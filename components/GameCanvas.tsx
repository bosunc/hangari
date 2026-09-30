"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/types";

type ClearResult = { best: number; rank: number | null };
type Props = { onExit: () => void; onClear: (time: number) => Promise<ClearResult> };

export default function GameCanvas({ onExit, onClear }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<import("phaser").Game | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [height, setHeight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clear, setClear] = useState<(ClearResult & { time: number }) | null>(null);

  useEffect(() => {
    let active = true;
    async function boot() {
      const Phaser = (await import("phaser")).default;
      if (!host.current || !active) return;
      class ClimbScene extends Phaser.Scene {
        player!: Phaser.Physics.Matter.Image;
        tool!: Phaser.Physics.Matter.Image;
        startAt = 0; cleared = false; highest = 0;
        constructor() { super("climb"); }
        create() {
          this.matter.world.setBounds(0, -3100, 800, 3700, 80, true, true, true, true);
          this.cameras.main.setBackgroundColor("#101a21");
          this.makeTextures(); this.buildWorld();
          this.player = this.matter.add.image(400, 445, "capsule", undefined, { shape: { type: "circle", radius: 31 }, friction: 0.08, frictionAir: 0.012, restitution: 0.08, density: 0.004 });
          this.player.setFixedRotation();
          this.tool = this.matter.add.image(400, 380, "tool", undefined, { shape: { type: "rectangle", width: 14, height: 142 }, friction: 0.9, frictionStatic: 1, restitution: 0.05, density: 0.001 });
          this.tool.setOrigin(.5, .84).setIgnoreGravity(true);
          this.matter.add.constraint(this.player.body as MatterJS.BodyType, this.tool.body as MatterJS.BodyType, 0, 1, { pointA: { x: 0, y: -8 }, pointB: { x: 0, y: 48 } });
          this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
            const world = this.cameras.main.getWorldPoint(p.x, p.y);
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, world.x, world.y) + Math.PI / 2;
            this.tool.setAngularVelocity(Phaser.Math.Angle.Wrap(angle - this.tool.rotation) * 0.22);
          });
          this.input.keyboard?.on("keydown-R", () => this.scene.restart());
          this.cameras.main.startFollow(this.player, true, .08, .08, 0, 110);
          this.cameras.main.setBounds(0, -3100, 800, 3700);
          this.startAt = performance.now();
        }
        makeTextures() {
          const g = this.add.graphics();
          g.fillStyle(0xe85d3f).fillCircle(36, 36, 34).fillStyle(0x1c2b32).fillCircle(36, 30, 20).lineStyle(5, 0xf3d083).strokeCircle(36, 30, 20).fillStyle(0xf3d083).fillRect(9, 54, 54, 10); g.generateTexture("capsule", 72, 72); g.clear();
          g.fillStyle(0xf3d083).fillRoundedRect(9, 0, 12, 126, 6).fillStyle(0x62d6c5).fillCircle(15, 10, 15).fillStyle(0x101a21).fillCircle(15, 10, 7); g.generateTexture("tool", 30, 142); g.destroy();
        }
        ledge(x: number, y: number, w: number, h: number, angle = 0, color = 0x53666b) {
          const body = this.matter.add.rectangle(x, y, w, h, { isStatic: true, angle: Phaser.Math.DegToRad(angle), friction: 0.9 });
          const shape = this.add.rectangle(x, y, w, h, color).setRotation(Phaser.Math.DegToRad(angle)); shape.setStrokeStyle(3, 0x819397); return body;
        }
        buildWorld() {
          this.add.text(54, 470, "BASE CAMP", { fontFamily: "monospace", fontSize: "16px", color: "#f3d083" });
          this.ledge(400, 540, 650, 50); this.ledge(625, 380, 190, 34, -12); this.ledge(400, 220, 230, 30, 22); this.ledge(155, 20, 170, 30);
          this.ledge(410, -180, 280, 34, -20); this.ledge(680, -405, 150, 28); this.ledge(430, -620, 120, 26); this.ledge(150, -835, 250, 34, 18);
          this.ledge(410, -1060, 170, 28); this.ledge(660, -1265, 190, 28, -25); this.ledge(390, -1490, 105, 25); this.ledge(130, -1725, 210, 30);
          this.ledge(370, -1940, 260, 32, -15); this.ledge(665, -2155, 140, 25); this.ledge(420, -2370, 120, 24); this.ledge(190, -2570, 190, 30, 18);
          this.ledge(420, -2775, 420, 44, -7, 0x69807c);
          this.add.text(310, -2865, "▲  SUMMIT  ▲", { fontFamily: "monospace", fontSize: "24px", color: "#f3d083" });
          const zone = this.add.zone(420, -2840, 360, 120); this.matter.add.gameObject(zone, { isStatic: true, isSensor: true, label: "summit" });
          this.matter.world.on("collisionstart", (event: MatterJS.IEventCollision<MatterJS.Engine>) => { for (const pair of event.pairs) { if ((pair.bodyA.label === "summit" || pair.bodyB.label === "summit") && !this.cleared && (pair.bodyA === this.player.body || pair.bodyB === this.player.body)) { this.cleared = true; const time = Math.floor(performance.now() - this.startAt); this.game.events.emit("stage-clear", time); } } });
        }
        update() {
          if (!this.player || this.cleared) return;
          const climbed = Math.max(0, Math.floor(445 - this.player.y)); this.highest = Math.max(this.highest, climbed);
          this.game.events.emit("hud", Math.floor(performance.now() - this.startAt), climbed);
        }
      }
      const instance = new Phaser.Game({ type: Phaser.AUTO, parent: host.current, width: 800, height: 600, backgroundColor: "#101a21", physics: { default: "matter", matter: { gravity: { y: 1.05 }, debug: false } }, scene: ClimbScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
      instance.events.on("hud", (time: number, h: number) => { setElapsed(time); setHeight(h); });
      instance.events.once("stage-clear", async (time: number) => { setElapsed(time); setSaving(true); try { const result = await onClear(time); setClear({ time, ...result }); } catch { setError("기록 저장에 실패했습니다. 연결을 확인하세요."); } finally { setSaving(false); } });
      game.current = instance;
    }
    void boot();
    return () => { active = false; game.current?.destroy(true); game.current = null; };
  }, [onClear]);

  return <main className="game-page"><div className="game-hud"><button onClick={onExit}>← EXIT</button><div><small>TIME</small><b>{formatTime(elapsed)}</b></div><div><small>HEIGHT</small><b>{height} m</b></div><button onClick={() => { setClear(null); game.current?.scene.getScene("climb").scene.restart(); }}>RESTART <kbd>R</kbd></button></div><div className="game-frame" ref={host} />{saving && <div className="toast">기록 저장 중…</div>}{error && <div className="toast error">{error}</div>}{clear && <section className="clear-modal"><p>▲ SUMMIT REACHED ▲</p><h1>STAGE<br />CLEAR</h1><div><span>이번 기록 <b>{formatTime(clear.time)}</b></span><span>개인 최고 <b>{formatTime(clear.best)}</b></span><span>전체 순위 <b>{clear.rank ? `#${clear.rank}` : "TOP 10 밖"}</b></span></div><button className="primary" onClick={onExit}>기록 확인하기 →</button></section>}<p className="game-tip">마우스를 캡슐 주위로 움직여 자석 곡괭이를 회전하세요. 끝을 지형에 걸고 밀어내세요.</p></main>;
}
