import test from "node:test";
import assert from "node:assert/strict";
import {categoriesForFlow,categoryDefinitions,classifyTransaction,directionForType,expenseCategories,transactionTypeLabels,type TransactionType} from "../lib/classification.ts";

const cases:Array<[string,number,TransactionType,string|null,string|null]>=[
 ["UNIQLO 银座店",-500,"expense","shopping","clothing"],
 ["MIKIMOTO",-900,"expense","shopping","jewelry_luxury"],
 ["FamilyMart 便利店",-42,"expense","food","convenience_store"],
 ["宠物用品",-160,"expense","pets","pet_supplies"],
 ["宠物医院",-600,"expense","pets","pet_medical"],
 ["ChatGPT Subscription",-140,"expense","other","subscriptions"],
 ["某医院门诊",-200,"expense","other","health"],
 ["滴滴打车",-80,"expense","other","transportation"],
 ["公益捐款",-100,"expense","other","charity"],
 ["东京酒店",-2500,"expense","travel","hotel"],
 ["航空机票",-1800,"expense","travel","flights"],
 ["新干线铁路",-600,"expense","travel","rail"],
 ["迪士尼门票",-500,"expense","travel","attractions"],
 ["房租",-6000,"expense","housing","rent"],
 ["保险公司保险费",-1200,"expense","insurance","other_insurance"],
 ["清洁用品纸巾",-160,"expense","household","cleaning_supplies"],
 ["厨房用品锅具",-300,"expense","household","kitchen_supplies"],
 ["信用卡预约还款",-5000,"transfer","credit_card_repayment",null],
 ["理财申购",-20000,"investment","wealth_management","subscription"],
 ["理财赎回",20535.77,"investment","wealth_management","redemption"],
 ["CNY HKD 结售汇",-12831,"fx","currency_exchange",null],
 ["ATM 取现",-5000,"cash","cash_change","withdrawal"],
 ["现金存入",5000,"cash","cash_change","deposit"],
 ["账户结息",24,"income","interest",null],
 ["代发工资",7755.36,"income","salary",null],
 ["奖金 bonus",3000,"income","bonus",null],
 ["差旅报销",900,"income","reimbursement",null],
];
for(const [description,amount,type,category,subcategory] of cases)test(description,()=>{const result=classifyTransaction(description,amount);assert.equal(result.transactionType,type);assert.equal(result.categoryKey,category);assert.equal(result.subcategoryKey,subcategory)});
test("ambiguous WeChat transfer and inbound remittance stay in review",()=>{assert.equal(classifyTransaction("快捷支付微信转账",-200).transactionType,"review");assert.equal(classifyTransaction("汇入汇款",24598.10).transactionType,"review")});
test("only income and expense map to operating directions",()=>{assert.equal(directionForType("income"),"income");assert.equal(directionForType("expense"),"expense");for(const type of ["investment","transfer","fx","cash","review"] as const)assert.equal(directionForType(type),"transfer")});
test("taxonomy has seven flows and exactly ten budget roots",()=>{assert.deepEqual(Object.keys(transactionTypeLabels),["income","expense","investment","transfer","fx","cash","review"]);assert.equal(expenseCategories.length,10);assert.ok(expenseCategories.every(item=>item.budgetEnabled));assert.equal(new Set(categoryDefinitions.map(item=>item.key)).size,categoryDefinitions.length)});
test("categories are constrained by flow",()=>{assert.ok(categoriesForFlow("income").some(item=>item.key==="interest"));assert.ok(!categoriesForFlow("expense").some(item=>item.key==="interest"));assert.ok(categoriesForFlow("transfer").some(item=>item.key==="credit_card_repayment"))});
