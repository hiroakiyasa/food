export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidWeight(weight: number): boolean {
  return weight > 20 && weight < 300;
}

export function isValidHeight(height: number): boolean {
  return height > 100 && height < 250;
}
