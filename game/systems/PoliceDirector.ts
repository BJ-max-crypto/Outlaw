import Phaser from "phaser";
import { PoliceOfficer } from "@/game/entities/PoliceOfficer";
import type { Player } from "@/game/entities/Player";

export class PoliceDirector {
  readonly officers: PoliceOfficer[] = [];
  readonly group: Phaser.Physics.Arcade.Group;
  private spawned = false;
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
    if (!this.spawned) {
      this.spawned = true;
      points.forEach((point, index) => {
        const cop = new PoliceOfficer(this.scene, point.x, point.y, index * 120, crime);
        this.group.add(cop);
        const body = cop.body as Phaser.Physics.Arcade.Body;
        cop.arm(body);
        this.officers.push(cop);
      });
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
