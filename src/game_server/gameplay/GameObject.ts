import { Body } from "matter";


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
  body?: Body;
  [key: string]: any;

  constructor (id: number, transform: Transform, label: string, body?: Body)
  {
    this.id = id;
    this.transform = transform;
    this.label = label;
    this.body = body;
  }
}
