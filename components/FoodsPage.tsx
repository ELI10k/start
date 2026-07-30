import FoodDatabase from "@/components/FoodDatabase";
import { foods } from "@/lib/foods";

export default function FoodsPage() {
  return (
    <main className="foods-page">
      <FoodDatabase foods={foods} />
    </main>
  );
}
