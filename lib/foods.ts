export type FoodCategory =
  | "חלבון"
  | "פחמימה"
  | "שומן"
  | "ירקות"
  | "פירות"
  | "מוצרי חלב"
  | "אחר";

export type FoodItem = {
  id: number;
  name: string;
  category: FoodCategory;
  servingAmount: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  brand?: string;
};

export const initialFoods: FoodItem[] = [
  {
    id: 1,
    name: "חזה עוף מבושל",
    category: "חלבון",
    servingAmount: 100,
    servingUnit: "גרם",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
  },
  {
    id: 2,
    name: "פרגית מבושלת",
    category: "חלבון",
    servingAmount: 100,
    servingUnit: "גרם",
    calories: 209,
    protein: 26,
    carbs: 0,
    fat: 11,
    fiber: 0,
  },
  {
    id: 3,
    name: "טונה במים",
    category: "חלבון",
    servingAmount: 100,
    servingUnit: "גרם",
    calories: 116,
    protein: 26,
    carbs: 0,
    fat: 1,
    fiber: 0,
  },
  {
    id: 4,
    name: "ביצה",
    category: "חלבון",
    servingAmount: 1,
    servingUnit: "יחידה",
    calories: 78,
    protein: 6.3,
    carbs: 0.6,
    fat: 5.3,
    fiber: 0,
  },
  {
    id: 5,
    name: "קוטג׳ 5%",
    category: "מוצרי חלב",
    servingAmount: 100,
    servingUnit: "גרם",
    calories: 105,
    protein: 11,
    carbs: 3,
    fat: 5,
    fiber: 0,
  },
  {
    id: 6,
    name: "יוגורט חלבון",
    category: "מוצרי חלב",
    servingAmount: 1,
    servingUnit: "גביע",
    calories: 145,
    protein: 20,
    carbs: 10,
    fat: 2,
    fiber: 0,
  },
  {
    id: 7,
    name: "אורז בסמטי מבושל",
    category: "פחמימה",
    servingAmount: 100,
    servingUnit: "גרם",
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    fiber: 0.4,
  },
  {
    id: 8,
    name: "בורגול מבושל",
    category: "פחמימה",
    servingAmount: 100,
    servingUnit: "גרם",
    calories: 83,
    protein: 3.1,
    carbs: 18.6,
    fat: 0.2,
    fiber: 4.5,
  },
  {
    id: 9,
    name: "לחם מלא",
    category: "פחמימה",
    servingAmount: 1,
    servingUnit: "פרוסה",
    calories: 80,
    protein: 3.5,
    carbs: 14,
    fat: 1.2,
    fiber: 2,
  },
  {
    id: 10,
    name: "בננה",
    category: "פירות",
    servingAmount: 1,
    servingUnit: "יחידה",
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 3.1,
  },
  {
    id: 11,
    name: "שמן זית",
    category: "שומן",
    servingAmount: 10,
    servingUnit: "מ״ל",
    calories: 90,
    protein: 0,
    carbs: 0,
    fat: 10,
    fiber: 0,
  },
  {
    id: 12,
    name: "אבוקדו",
    category: "שומן",
    servingAmount: 100,
    servingUnit: "גרם",
    calories: 160,
    protein: 2,
    carbs: 8.5,
    fat: 14.7,
    fiber: 6.7,
  },
];