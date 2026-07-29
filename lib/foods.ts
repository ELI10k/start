export { foodRepository } from "./foods/repository.ts";
export type { Food, FoodQuery, FoodSort } from "./foods/types.ts";
import { foodRepository } from "./foods/repository.ts";
export const foods = foodRepository.getAll();
