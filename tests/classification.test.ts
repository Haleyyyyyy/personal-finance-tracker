import test from "node:test";
import assert from "node:assert/strict";
import {classifyTransaction,directionForType} from "../lib/classification.ts";

const cases=[
 ["UNIQLO 银座店",-500,"expense","shopping","clothing"],
 ["FamilyMart 便利店",-42,"expense","food","convenience_store"],
 ["宠物用品",-160,"expense","pets","pet_supplies"],
 ["ChatGPT Subscription",-140,"expense","subscriptions","ai_service"],
 ["信用卡预约还款",-5000,"card_repayment",null,null],
 ["理财申购",-20000,"investment",null,null],
 ["理财赎回",20535.77,"investment",null,null],
 ["CNY HKD 结售汇",-12831,"fx",null,null],
 ["ATM 取现",-5000,"cash",null,null],
 ["账户结息",24,"interest",null,null],
] as const;
for(const [description,amount,type,category,subcategory] of cases)test(description,()=>{const result=classifyTransaction(description,amount);assert.equal(result.transactionType,type);assert.equal(result.categoryKey,category);assert.equal(result.subcategoryKey,subcategory)});
test("ambiguous WeChat transfer is review",()=>assert.equal(classifyTransaction("快捷支付微信转账",-200).transactionType,"review"));
test("only expense has expense direction",()=>{assert.equal(directionForType("expense"),"expense");for(const type of ["transfer","card_repayment","investment","fx","cash","review"] as const)assert.equal(directionForType(type),"transfer")});
