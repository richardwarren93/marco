"use client";
import Link from "next/link";
import useSWR from "swr";

type Dish = { id: string; title: string | null; image_url?: string | null; photo_url?: string | null; source_recipe_id?: string | null; author_name?: string | null };
interface KitchenData { name: string; recipeCount: number; cookCount: number; recipes: Dish[]; cooks: Dish[]; saved: Dish[] }

export default function KitchenHub() {
  const { data, error, mutate } = useSWR<KitchenData>("/api/kitchen", async url => {
    const r = await fetch(url); const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Could not load your kitchen.");
    return result;
  }, { revalidateOnFocus: true, focusThrottleInterval: 30000 });
  return <div className="min-h-full bg-[#E9E2D3] text-[#171410] px-4 pt-6 pb-28">
    <div className="max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-start gap-4">
        <div><p className="text-sm text-[#A13924] mb-1">Make yourself at home</p><h1 className="text-3xl font-bold" style={{ fontFamily: '"Marker Felt", Georgia, serif' }}>{data ? `${data.name}’s kitchen` : "Your kitchen"}</h1>
          {data && <p className="text-sm mt-2 text-[#5D554B]">{data.recipeCount} saved recipes · {data.cookCount} cooks</p>}</div>
        <Link href="/profile" aria-label="Your profile and settings" className="rounded-full border-2 border-[#171410] bg-[#FFD84D] px-4 py-3 font-bold">{data?.name.slice(0, 1).toUpperCase() ?? "·"}</Link>
      </header>
      <nav aria-label="Kitchen tools" className="grid grid-cols-2 gap-3">
        <KitchenLink href="/meal-plan" title="Meal plan" subtitle="What’s cooking this week" emoji="🗓️" />
        <KitchenLink href="/grocery" title="Groceries" subtitle="Your shopping list" emoji="🛒" />
      </nav>
      <Link href="/recipes" className="block rounded-2xl border-2 border-[#171410] bg-[#FFD84D] p-4 font-bold text-lg">Your recipes <span className="float-right">→</span></Link>
      {error && <div role="alert" className="rounded-xl bg-white p-4"><p>{error.message}</p><button className="underline mt-2" onClick={() => mutate()}>Try again</button></div>}
      {!data && !error && <p role="status">Loading your kitchen…</p>}
      {data && <>
        <DishSection title="Recently saved" dishes={data.recipes} recipes empty="Save your first recipe to start your collection." href="/recipes/new" action="Save a recipe" />
        <DishSection title="Want to cook" dishes={data.saved} empty="Recipes you save from your tables appear here." href="/friends-stack" action="Visit your tables" />
        <DishSection title="You cooked" dishes={data.cooks} empty="Your own dishes appear here after you post a cook." href="/i-cooked" action="Post a cook" />
      </>}
      <Link href="/friends-stack" className="block rounded-xl border border-[#171410]/25 p-4">Potlucks live with your tables <span className="float-right">→</span></Link>
    </div>
  </div>;
}
function KitchenLink({ href, title, subtitle, emoji }: { href: string; title: string; subtitle: string; emoji: string }) {
  return <Link href={href} className="rounded-2xl border-2 border-[#171410] bg-[#FBF7EE] p-4"><span aria-hidden className="text-xl">{emoji}</span><h2 className="font-bold mt-2">{title}</h2><p className="text-xs text-[#5D554B] mt-1">{subtitle}</p></Link>;
}
function DishSection({ title, dishes, recipes = false, empty, href, action }: { title: string; dishes: Dish[]; recipes?: boolean; empty: string; href: string; action: string }) {
  return <section><h2 className="text-xl font-bold mb-3" style={{ fontFamily: '"Marker Felt", Georgia, serif' }}>{title}</h2>
    {dishes.length ? <div className="grid grid-cols-2 gap-3">{dishes.map(dish => {
      const id = recipes ? dish.id : dish.source_recipe_id;
      // eslint-disable-next-line @next/next/no-img-element
      const content = <>{dish.image_url || dish.photo_url ? <img src={dish.image_url || dish.photo_url || ""} alt="" loading="lazy" className="w-full h-28 object-cover" /> : <div aria-hidden className="h-20 flex items-center justify-center bg-[#FFD84D]/30 text-3xl">🍳</div>}<div className="p-3"><p className="font-semibold leading-snug">{dish.title || "Your cook"}</p>{dish.author_name && <p className="text-xs text-[#5D554B] mt-1">From {dish.author_name}</p>}{!id && <p className="text-xs text-[#5D554B] mt-1">No recipe attached</p>}</div></>;
      const style = "block overflow-hidden rounded-xl border-2 border-[#171410] bg-[#FBF7EE]";
      return id ? <Link key={dish.id} href={`/recipes/${id}`} className={style}>{content}</Link> : <div key={dish.id} className={style}>{content}</div>;
    })}</div> : <div className="rounded-xl border border-dashed border-[#171410]/40 bg-[#FBF7EE] p-4"><p className="text-sm text-[#5D554B]">{empty}</p><Link href={href} className="inline-block mt-3 text-sm font-semibold underline">{action}</Link></div>}
  </section>;
}
