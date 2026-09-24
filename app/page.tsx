"use client";
import {useEffect,useMemo,useState} from "react";
import {Upload,WalletCards,ArrowDownLeft,ArrowUpRight,PiggyBank} from "lucide-react";
import {supabase} from "../lib/supabase";
type Tx={id:string;transaction_date:string;description:string;amount:number;direction:"income"|"expense"|"transfer";status:string};
export default function Home(){
 const [tx,setTx]=useState<Tx[]>([]);
 useEffect(()=>{(async()=>{try{const {data}=await supabase().from("transactions").select("id,transaction_date,description,amount,direction,status").order("transaction_date",{ascending:false});if(data)setTx(data as Tx[])}catch{}})()},[]);
 const stats=useMemo(()=>{let i=0,e=0;tx.forEach(x=>{if(x.direction==="income")i+=Number(x.amount);if(x.direction==="expense")e+=Number(x.amount)});return{i,e,s:i-e,r:i?Math.round((i-e)/i*100):0}},[tx]);
 return <main><aside><div className="brand"><div className="logo">¥</div><b>我的财务管家</b></div><nav><button className="active">总览</button><button>流水管理</button><button>待确认</button><button>账户</button><button>设置</button></nav><div className="privacy">🔒 财务数据仅供你本人访问<br/><small>Supabase RLS 隔离</small></div></aside><section><header><div><h1>财务总览</h1><p>自动整理你的财务生活</p></div><label className="upload"><Upload size={17}/>上传银行流水 PDF<input type="file" accept="application/pdf" hidden/></label></header><div className="cards"><Card icon={<ArrowDownLeft/>} t="本月收入" v={stats.i}/><Card icon={<ArrowUpRight/>} t="本月支出" v={stats.e}/><Card icon={<PiggyBank/>} t="本月结余" v={stats.s}/><Card icon={<WalletCards/>} t="储蓄率" v={stats.r} percent/></div><div className="panel" style={{marginTop:16}}><h2>Statement in, insight out.</h2><p>上传银行流水后，系统会整理收入、消费与内部转账；不确定的交易进入待确认。</p></div></section></main>
}
function Card({icon,t,v,percent=false}:{icon:React.ReactNode,t:string,v:number,percent?:boolean}){return <div className="card"><div>{icon}<span>{t}</span></div><strong>{percent?String(v)+"%":"¥"+v.toLocaleString()}</strong></div>}