import Matter from "matter-js";


export function IsZero(x: number, eps = 1e-9)
{
  return Math.abs(x) < eps;
}

export function Normalize(x: number)
{
  if (IsZero(x))
    return 0;
  if (x < 0)
    return -1;
  return 1;
}

export function SetNonZeroComponents(target: Matter.Vector, source: Matter.Vector): Matter.Vector
{
  if (!IsZero(source.x))
    target.x = source.x;
  if (!IsZero(source.y))
    target.y = source.y;
  return target;
}

//prng based on seed and salt
export function SeededRandom(seed: number, salt = 0x9e3779b9): number
{
  let x = (seed ^ salt) >>> 0;

  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = (x ^ (x >>> 15)) >>> 0;

  return x / 0x100000000;
}

