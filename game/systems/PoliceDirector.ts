import Phaser from "phaser";
import { PoliceOfficer } from "@/game/entities/PoliceOfficer";
import type { Player } from "@/game/entities/Player";

export class PoliceDirector {
  readonly officers: PoliceOfficer[] = [];
  readonly group: Phaser.Physics.Arcade.Group;
  private wired = false;

  constructor(private scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  alert(
    points: { x: number; y: number }[],
    walls: Phaser.Physics.Arcade.StaticGroup,
    player: Player,
    crime: { x: number; y: number },
    onHit: () => void,
  ): void {
    while (this.officers.length < points.length) {
      const index = this.officers.length;
      const point = points[index];
      const cop = new PoliceOfficer(this.scene, point.x, point.y, index * 120, crime);
      this.group.add(cop);
      const body = cop.body as Phaser.Physics.Arcade.Body;
      cop.arm(body);
      this.officers.push(cop);
    }
    if (!this.wired) {
      this.wired = true;
      this.scene.physics.add.collider(this.group, walls);
      this.scene.physics.add.collider(this.group, this.group);
      this.scene.physics.add.collider(this.group, player, () => onHit());
    }
    this.officers.forEach((cop, index) => {
      cop.alert(crime, points[index] ?? points[0]);
    });
  }

  /** Point the officers at a new crime without moving them or restarting the chase. */
  press(crime: { x: number; y: number }): void {
    for (const cop of this.officers) cop.press(crime);
  }

  update(
    delta: number,
    player: Player,
    active: boolean,
    blockers: Phaser.Geom.Rectangle[],
  ): void {
    for (const officer of this.officers) {
      officer.update(delta, player, active, blockers);
    }
  }

  stop(): void {
    for (const officer of this.officers) officer.halt();
  }
}
