export type TransactionType = "income"|"expense"|"transfer"|"card_repayment"|"investment"|"fx"|"cash"|"interest"|"review";

export type CategoryDefinition={key:string;label:string;color:string;subcategories:Array<{key:string;label:string}>};

export const transactionTypeLabels:Record<TransactionType,string>={income:"收入",expense:"消费",transfer:"转账",card_repayment:"信用卡还款",investment:"投资",fx:"外汇兑换",cash:"现金存取",interest:"利息",review:"待确认"};

export const expenseCategories:CategoryDefinition[]=[
 {key:"food",label:"餐饮",color:"#39765f",subcategories:[["restaurant","正餐"],["coffee_tea","咖啡 / 茶饮"],["delivery","外卖"],["snacks","零食"],["convenience_store","便利店"],["alcohol","酒水"],["other_food","其他餐饮"]].map(([key,label])=>({key,label}))},
 {key:"shopping",label:"购物",color:"#527fb2",subcategories:[["clothing","服饰"],["beauty","美妆"],["jewelry_luxury","珠宝 / 奢侈品"],["electronics","电子产品"],["home_goods","家居"],["daily_goods","日用品"],["online_shopping","网购"],["other_shopping","其他购物"]].map(([key,label])=>({key,label}))},
 {key:"transportation",label:"交通",color:"#4b968e",subcategories:[["public_transit","公交 / 地铁"],["taxi","打车"],["rail","铁路"],["flight","机票"],["fuel","加油"],["parking","停车"],["car_rental","租车"],["other_transportation","其他交通"]].map(([key,label])=>({key,label}))},
 {key:"housing",label:"住房",color:"#9a795d",subcategories:[["rent","房租"],["mortgage","房贷"],["property_management","物业"],["utilities","水电煤"],["internet_mobile","网络 / 通讯"],["home_repair","家庭维修"],["furniture_appliances","家具 / 家电"],["other_housing","其他住房"]].map(([key,label])=>({key,label}))},
 {key:"travel",label:"旅行",color:"#6c86ad",subcategories:[["hotel","酒店"],["attractions","景点 / 门票"],["local_transport","当地交通"],["tour_activity","旅行团 / 活动"],["visa_insurance","签证 / 保险"],["other_travel","其他旅行"]].map(([key,label])=>({key,label}))},
 {key:"entertainment",label:"娱乐",color:"#9a6bae",subcategories:[["movie","电影"],["performance","演出"],["gaming","游戏"],["hobby_activity","兴趣 / 活动"],["ktv_party","KTV / 聚会"],["other_entertainment","其他娱乐"]].map(([key,label])=>({key,label}))},
 {key:"health",label:"健康",color:"#cf776d",subcategories:[["medical","医疗"],["medicine","药品"],["checkup","体检"],["fitness","健身"],["dental","牙科"],["health_insurance","保险相关健康支出"],["other_health","其他健康"]].map(([key,label])=>({key,label}))},
 {key:"personal_care",label:"个人护理",color:"#c98aa7",subcategories:[["haircut","理发"],["beauty_care","美容"],["nails","美甲"],["spa","SPA"],["skin_care","护肤护理"],["other_personal_care","其他个人护理"]].map(([key,label])=>({key,label}))},
 {key:"pets",label:"宠物",color:"#b98652",subcategories:[["pet_food","宠物食品"],["pet_supplies","宠物用品"],["pet_medical","宠物医疗"],["pet_grooming","宠物美容"],["pet_service","宠物服务"],["other_pets","其他宠物"]].map(([key,label])=>({key,label}))},
 {key:"education",label:"教育",color:"#5f7ca8",subcategories:[["course","课程"],["books","书籍"],["exam","考试"],["language_learning","语言学习"],["training","培训"],["other_education","其他教育"]].map(([key,label])=>({key,label}))},
 {key:"subscriptions",label:"订阅 / 数字服务",color:"#7867a8",subcategories:[["ai_service","AI 服务"],["streaming","流媒体"],["cloud_storage","云存储"],["software","软件"],["app_subscription","App 订阅"],["membership","会员"],["other_digital","其他数字服务"]].map(([key,label])=>({key,label}))},
 {key:"social_gifts",label:"社交 / 礼物",color:"#d18b70",subcategories:[["gift","礼物"],["red_packet","红包"],["treating","请客"],["social_obligation","人情"],["wedding_event","婚礼 / 活动"],["other_social","其他社交"]].map(([key,label])=>({key,label}))},
 {key:"work",label:"工作",color:"#657681",subcategories:[["office_supplies","办公用品"],["business_travel","工作差旅"],["professional_training","职业培训"],["work_meal","工作餐"],["reimbursable","可报销费用"],["other_work","其他工作"]].map(([key,label])=>({key,label}))},
 {key:"financial_fees",label:"税费 / 金融费用",color:"#a36b5c",subcategories:[["tax","税"],["bank_fee","银行手续费"],["credit_card_fee","信用卡费用"],["remittance_fee","汇款手续费"],["fx_fee","外汇手续费"],["other_financial_fee","其他金融费用"]].map(([key,label])=>({key,label}))},
 {key:"charity",label:"公益 / 捐赠",color:"#659d7c",subcategories:[["charity_donation","慈善捐款"],["animal_charity","动物公益"],["public_welfare","公益项目"],["other_donation","其他捐赠"]].map(([key,label])=>({key,label}))},
 {key:"other",label:"其他",color:"#89958f",subcategories:[["uncategorized","未分类消费"],["other","其他"]].map(([key,label])=>({key,label}))},
];

export const categoryByKey=new Map(expenseCategories.map(category=>[category.key,category]));
export const legacyCategoryKeys:Record<string,string>={餐饮:"food",购物:"shopping",交通:"transportation",住房:"housing",旅行:"travel",娱乐:"entertainment",健康:"health",个人护理:"personal_care",宠物:"pets",教育:"education","订阅 / 数字服务":"subscriptions",订阅:"subscriptions","社交 / 礼物":"social_gifts",工作:"work","税费 / 金融费用":"financial_fees","公益 / 捐赠":"charity",其他:"other"};

export type Classification={transactionType:TransactionType;categoryKey:string|null;subcategoryKey:string|null;confidence:number;review:boolean};
export function classifyTransaction(description:string,signedAmount:number):Classification{
 const text=description.toLowerCase();
 if(/信用卡.*还款|还款.*信用卡|预约还款|中信.*还款/.test(text))return{transactionType:"card_repayment",categoryKey:null,subcategoryKey:null,confidence:.99,review:false};
 if(/理财|申购|赎回|基金|证券/.test(text))return{transactionType:"investment",categoryKey:null,subcategoryKey:null,confidence:.98,review:false};
 if(/结售汇|结汇|购汇|外汇兑换/.test(text))return{transactionType:"fx",categoryKey:null,subcategoryKey:null,confidence:.99,review:false};
 if(/atm|柜台取现|现金取款|取现/.test(text))return{transactionType:"cash",categoryKey:null,subcategoryKey:null,confidence:.98,review:false};
 if(/结息|利息/.test(text))return{transactionType:"interest",categoryKey:null,subcategoryKey:null,confidence:.98,review:false};
 if(/代发|工资|薪资|汇入汇款/.test(text)&&signedAmount>0)return{transactionType:"income",categoryKey:null,subcategoryKey:null,confidence:.94,review:false};
 if(/uniqlo|优衣库/.test(text))return expense("shopping","clothing",.99);
 if(/familymart|全家|7-eleven|便利店/.test(text))return expense("food","convenience_store",.98);
 if(/宠物用品/.test(text))return expense("pets","pet_supplies",.98);
 if(/宠物医院|动物医院/.test(text))return expense("pets","pet_medical",.98);
 if(/chatgpt|openai/.test(text))return expense("subscriptions","ai_service",.99);
 if(/icloud/.test(text))return expense("subscriptions","cloud_storage",.99);
 if(/netflix|spotify|腾讯视频|爱奇艺/.test(text))return expense("subscriptions","streaming",.98);
 if(/医院|诊所/.test(text))return expense("health","medical",.94);
 if(/pharmacy|药房|药店/.test(text))return expense("health","medicine",.94);
 if(/地铁|公交/.test(text))return expense("transportation","public_transit",.94);
 if(/滴滴|出租|打车/.test(text))return expense("transportation","taxi",.94);
 if(/酒店|宾馆/.test(text))return expense("travel","hotel",.94);
 if(/微信转账|快捷支付微信转账/.test(text))return{transactionType:"review",categoryKey:null,subcategoryKey:null,confidence:.35,review:true};
 if(signedAmount>0)return{transactionType:"review",categoryKey:null,subcategoryKey:null,confidence:.4,review:true};
 return expense("other","uncategorized",.55,true);
}
function expense(categoryKey:string,subcategoryKey:string,confidence:number,review=false):Classification{return{transactionType:"expense",categoryKey,subcategoryKey,confidence,review}}
export function directionForType(type:TransactionType):"income"|"expense"|"transfer"{return type==="income"||type==="interest"?"income":type==="expense"?"expense":"transfer"}
export function categoryLabel(key?:string|null){return categoryByKey.get(key??"")?.label??"其他"}
export function subcategoryLabel(categoryKey?:string|null,subcategoryKey?:string|null){return categoryByKey.get(categoryKey??"")?.subcategories.find(item=>item.key===subcategoryKey)?.label??"未分类"}
