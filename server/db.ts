import fs from 'node:fs';
import path from 'node:path';
import type { DayPlan, Food, MealEntry, Profile } from '../shared/types';

export interface User {
  id: string; name: string; email: string; passwordHash: string; role: 'user' | 'admin'; profile: Profile; createdAt: string;
}
export interface Data {
  users: User[];
  meals: (MealEntry & { userId: string })[];
  weights: { userId: string; date: string; kg: number }[];
  water: { userId: string; date: string; ml: number }[];
  plans: { userId: string; date: string; plan: DayPlan }[];
  activity: { userId: string; date: string }[];
  customFoods: Food[];
  conversations: { userId: string; mode: 'nutrition' | 'fitness'; role: 'user' | 'model'; text: string; createdAt: string }[];
}

const empty = (): Data => ({ users: [], meals: [], weights: [], water: [], plans: [], activity: [], customFoods: [], conversations: [] });

/** Tiny JSON-file store. Writes are atomic (temp file + rename) so a crash cannot corrupt data. */
export class Store {
  data: Data;
  constructor(private file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.data = this.load();
  }
  private load(): Data {
    if (!fs.existsSync(this.file)) return empty();
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<Data>;
      return { ...empty(), ...parsed }; // missing collections from older files are added, nothing is dropped
    } catch (err) {
      const backup = `${this.file}.corrupt-${Date.now()}`;
      fs.copyFileSync(this.file, backup);
      console.error(`Data file could not be parsed. A copy was saved to ${backup}. Starting with an empty store.`, err);
      return empty();
    }
  }
  save(): void {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
