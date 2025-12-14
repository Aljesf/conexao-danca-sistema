import { cookies } from "next/headers";

// Normaliza cookies() para lidar com o comportamento assíncrono no Next 15.
export async function getCookieStore() {
  const maybe = cookies() as any;
  if (maybe && typeof maybe.then === "function") {
    return await maybe;
  }
  return maybe;
}
