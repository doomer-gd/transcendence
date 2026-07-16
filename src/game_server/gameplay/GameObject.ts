import { Body } from "matter-js";


export interface Transform
{
  x: number,
  y: number
}

export class GameObject
{
  id: number;
  transform: Transform;
  label: string;
  [key: string]: any;

  constructor (id: number, transform: Transform, label: string)
  {
    this.id = id;
    this.transform = transform;
    this.label = label;
  }
}
