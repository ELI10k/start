import type { PostgrestError } from "@supabase/supabase-js";

type PageResult<T> = Readonly<{ data: T[] | null; error: PostgrestError | null }>;

export async function fetchAllPages<T>(fetchPage:(from:number,to:number)=>PromiseLike<PageResult<T>>,pageSize=1000):Promise<PageResult<T>>{
  const data:T[]=[];
  for(let from=0;;from+=pageSize){
    const page=await fetchPage(from,from+pageSize-1);
    if(page.error)return{data:null,error:page.error};
    const rows=page.data??[];
    data.push(...rows);
    if(rows.length<pageSize)return{data,error:null};
  }
}
