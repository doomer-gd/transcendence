import { Body } from "matter-js";
import { EPlayerActionTypes, G_ActionAnimMap, IPlayerState, Player } from "../gameobjects/Player";
import { Animator } from "./Animator";
import { IsZero } from "../utility/Maths";


export class AnimatorPlayer extends Animator
{
  body: Body;
  playerState: IPlayerState;

  constructor(player: Player, body: Body, playerState: IPlayerState)
  {
    super(player);
    this.body = body;
    this.playerState = playerState;
  }

  override update()
  {
    const action = this.playerState.action;
    if (action !== EPlayerActionTypes.move)
      this.setAnim(G_ActionAnimMap.get(action)!, this.playerState.actionStep);
    else if(!this.updateMoveAnim())
        this.step();
  }

  private updateMoveAnim(): boolean
  {
    const velocity = this.body.velocity;
    if (!this.playerState.isOnGround)
    {
      if (velocity.y < 0)
        return this.playAnim('jump', true);
      else
        return this.playAnim('fall', true);
    }
    else if (this.playerState.InputVelocity !== 0)
      return this.playAnim('walk', true);
    return this.playAnim('idle', true);
  }
}
