export type TransactionType = "income"|"expense"|"investment"|"transfer"|"fx"|"cash"|"review";
export type CategoryDefinition={key:string;label:string;color:string;flow:TransactionType;budgetEnabled?:boolean;subcategories:Array<{key:string;label:string}>};
const subs=(rows:string[][])=>rows.map(([key,label])=>({key,label}));
export const transactionTypeLabels:Record<TransactionType,string>={income:"收入",expense:"支出",investment:"投资",transfer:"转账",fx:"外汇兑换",cash:"现金变动",review:"待确认"};

export const expenseCategories:CategoryDefinition[]=[
 {key:"food",label:"餐饮",color:"#39765f",flow:"expense",budgetEnabled:true,subcategories:subs([["restaurant","正餐"],["coffee_tea","咖啡茶饮"],["delivery","外卖"],["convenience_store","便利店"],["snacks","零食"],["groceries","食品采购"],["other_food","其他餐饮"]])},
 {key:"entertainment",label:"娱乐",color:"#9a6bae",flow:"expense",budgetEnabled:true,subcategories:subs([["movie","电影"],["concert","演出"],["games","游戏"],["events","活动"],["ktv_party","聚会"],["hobbies","兴趣"],["other_entertainment","其他娱乐"]])},
 {key:"pets",label:"宠物",color:"#b98652",flow:"expense",budgetEnabled:true,subcategories:subs([["pet_food","宠物食品"],["pet_supplies","宠物用品"],["pet_medical","宠物医疗"],["pet_grooming","宠物美容"],["pet_services","宠物服务"],["other_pets","其他宠物"]])},
 {key:"shopping",label:"购物",color:"#527fb2",flow:"expense",budgetEnabled:true,subcategories:subs([["clothing","服饰"],["beauty","美妆"],["jewelry_luxury","珠宝奢侈品"],["electronics","电子产品"],["online_shopping","网购"],["other_shopping","其他购物"]])},
 {key:"education",label:"教育",color:"#5f7ca8",flow:"expense",budgetEnabled:true,subcategories:subs([["courses","课程"],["books","书籍"],["exams","考试"],["language_learning","语言学习"],["professional_training","职业培训"],["other_education","其他教育"]])},
 {key:"other",label:"其他",color:"#89958f",flow:"expense",budgetEnabled:true,subcategories:subs([["transportation","交通"],["health","健康"],["subscriptions","订阅"],["work","工作"],["charity","公益捐赠"],["financial_fees","金融费用"],["personal_care","个人护理"],["miscellaneous","其他杂项"]])},
 {key:"housing",label:"住房",color:"#9a795d",flow:"expense",budgetEnabled:true,subcategories:subs([["rent","房租"],["mortgage","房贷"],["property_management","物业"],["utilities","水电煤"],["internet_telecom","网络通讯"],["home_repair","房屋维修"],["other_housing","其他住房"]])},
 {key:"travel",label:"旅行",color:"#6c86ad",flow:"expense",budgetEnabled:true,subcategories:subs([["flights","机票"],["rail","铁路"],["hotel","酒店"],["local_transport","当地交通"],["attractions","景点门票"],["tours_activities","旅行活动"],["visa","签证"],["travel_insurance","旅行保险"],["car_rental","租车"],["other_travel","其他旅行"]])},
 {key:"insurance",label:"保险",color:"#aa765e",flow:"expense",budgetEnabled:true,subcategories:subs([["medical_insurance","医疗保险"],["life_insurance","人寿保险"],["travel_insurance","旅行保险"],["vehicle_insurance","车辆保险"],["property_insurance","财产保险"],["other_insurance","其他保险"]])},
 {key:"household",label:"家用",color:"#7f8c61",flow:"expense",budgetEnabled:true,subcategories:subs([["daily_necessities","日用品"],["cleaning_supplies","清洁用品"],["kitchen_supplies","厨房用品"],["home_supplies","家居用品"],["small_appliances","小家电"],["other_household","其他家用"]])},
];
export const incomeCategories:CategoryDefinition[]=[
 ["salary","工资"],["bonus","奖金"],["interest","利息"],["investment_income","投资收益"],["reimbursement","报销"],["gift_income","礼金收入"],["refund","退款"],["other_income","其他收入"]
].map(([key,label])=>({key,label,color:"#39765f",flow:"income" as const,subcategories:[]}));
export const nonOperatingCategories:CategoryDefinition[]=[
 {key:"wealth_management",label:"理财",color:"#6c86ad",flow:"investment",subcategories:subs([["subscription","申购"],["redemption","赎回"]])},
 {key:"credit_card_repayment",label:"信用卡还款",color:"#657681",flow:"transfer",subcategories:[]},
 {key:"internal_transfer",label:"内部转账",color:"#657681",flow:"transfer",subcategories:[]},
 {key:"currency_exchange",label:"货币兑换",color:"#5f76a8",flow:"fx",subcategories:[]},
 {key:"cash_change",label:"现金变动",color:"#82908a",flow:"cash",subcategories:subs([["withdrawal","取现"],["deposit","存现"]])},
];
export const categoryDefinitions=[...incomeCategories,...expenseCategories,...nonOperatingCategories];
export const categoryByKey=new Map(categoryDefinitions.map(category=>[category.key,category]));
export const categoriesForFlow=(flow:TransactionType)=>categoryDefinitions.filter(category=>category.flow===flow);
export const legacyCategoryKeys:Record<string,string>={餐饮:"food",购物:"shopping",交通:"other",住房:"housing",旅行:"travel",旅游:"travel",娱乐:"entertainment",健康:"other",个人护理:"other",宠物:"pets",教育:"education","订阅 / 数字服务":"other",订阅:"other","社交 / 礼物":"other",工作:"other","税费 / 金融费用":"other","公益 / 捐赠":"other",其他:"other"};
export type Classification={transactionType:TransactionType;categoryKey:string|null;subcategoryKey:string|null;confidence:number;review:boolean};
export function classifyTransaction(description:string,signedAmount:number):Classification{
 const text=description.toLowerCase();
 if(/信用卡.*还款|还款.*信用卡|预约还款|中信.*还款/.test(text))return result("transfer","credit_card_repayment",null,.99);
 if(/理财|基金|证券/.test(text)){const child=/赎回|卖出|出金/.test(text)?"redemption":/申购|买入|入金/.test(text)?"subscription":null;return result("investment","wealth_management",child,.98,!child)}
 if(/结售汇|结汇|购汇|外汇兑换/.test(text))return result("fx","currency_exchange",null,.99);
 if(/atm|柜台取现|现金取款|取现/.test(text))return result("cash","cash_change","withdrawal",.98);
 if(/现金存入|存现/.test(text))return result("cash","cash_change","deposit",.98);
 if(/结息|利息/.test(text))return result("income","interest",null,.98);
 if(/代发|工资|薪资/.test(text)&&signedAmount>0)return result("income","salary",null,.98);
 if(/奖金|bonus/.test(text)&&signedAmount>0)return result("income","bonus",null,.96);
 if(/报销/.test(text)&&signedAmount>0)return result("income","reimbursement",null,.94);
 if(/汇入汇款/.test(text)&&signedAmount>0)return result("review",null,null,.45,true);
 if(/uniqlo|优衣库/.test(text))return expense("shopping","clothing",.99);
 if(/mikimoto/.test(text))return expense("shopping","jewelry_luxury",.99);
 if(/familymart|全家|7-eleven|便利店/.test(text))return expense("food","convenience_store",.98);
 if(/宠物用品/.test(text))return expense("pets","pet_supplies",.98);
 if(/宠物医院|动物医院/.test(text))return expense("pets","pet_medical",.98);
 if(/保险公司|保险费|policy premium/.test(text))return expense("insurance","other_insurance",.96);
 if(/洗衣液|清洁用品|纸巾/.test(text))return expense("household","cleaning_supplies",.96);
 if(/锅具|厨房用品/.test(text))return expense("household","kitchen_supplies",.95);
 if(/chatgpt|openai|icloud|netflix|spotify|腾讯视频|爱奇艺/.test(text))return expense("other","subscriptions",.98);
 if(/医院|诊所|药房|药店|体检/.test(text))return expense("other","health",.94);
 if(/地铁|公交|滴滴|出租|打车/.test(text))return expense("other","transportation",.94);
 if(/酒店|宾馆/.test(text))return expense("travel","hotel",.94);
 if(/航空|机票/.test(text))return expense("travel","flights",.94);
 if(/新干线|铁路/.test(text))return expense("travel","rail",.94);
 if(/景点|门票|迪士尼/.test(text))return expense("travel","attractions",.94);
 if(/房租/.test(text))return expense("housing","rent",.97);
 if(/捐款|公益/.test(text))return expense("other","charity",.94);
 if(/微信转账|快捷支付微信转账|转账汇款/.test(text))return result("review",null,null,.35,true);
 if(signedAmount>0)return result("review",null,null,.4,true);
 return expense("other","miscellaneous",.55,true);
}
function result(transactionType:TransactionType,categoryKey:string|null,subcategoryKey:string|null,confidence:number,review=false):Classification{return{transactionType,categoryKey,subcategoryKey,confidence,review}}
function expense(categoryKey:string,subcategoryKey:string,confidence:number,review=false):Classification{return result("expense",categoryKey,subcategoryKey,confidence,review)}
export function directionForType(type:TransactionType):"income"|"expense"|"transfer"{return type==="income"?"income":type==="expense"?"expense":"transfer"}
export function categoryLabel(key?:string|null){return categoryByKey.get(key??"")?.label??"未分类"}
export function subcategoryLabel(categoryKey?:string|null,subcategoryKey?:string|null){return categoryByKey.get(categoryKey??"")?.subcategories.find(item=>item.key===subcategoryKey)?.label??"未分类"}
