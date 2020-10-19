var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt');
const { USER_COLLECTION } = require('../config/collections');
const { resolve, reject } = require('promise');
const { response } = require('express');
const { use } = require('../routes/user');
const { ObjectID } = require('mongodb');
var objectId=require('mongodb').ObjectID;

module.exports={

    doSignup:(userdata)=>{
        return new Promise(async(resolve,reject)=>{

            userdata.password=await bcrypt.hash(userdata.password,10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userdata).then((data)=>{

                resolve(data.ops[0])
            

            })
          
        })
      
    },

    doLogin:(userdata)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false;
            let response={};
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userdata.email});
            if(user){
                bcrypt.compare(userdata.password,user.password).then((status)=>{
                    if(status){
                        console.log("login success..");
                        response.user=user;
                        response.status=true;
                        resolve(response);

                    }else{
                        console.log("login failed....");
                        resolve({status:false});
                    }

                })
            }else{
                console.log("login failed...");
                resolve({status:false});
            }
        })

    },

    addToCart:(proid,userid)=>{
        let proObj={
            item:objectId(proid),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userid)});
            if(userCart){
                let proExit=userCart.products.findIndex(product=>product.item==proid)
                if(proExit!=-1){
                    db.get().collection(collection.CART_COLLECTION)
                 .updateOne({user:objectId(userid),'products.item':objectId(proid)},
                 {
                     $inc:{'products.$.quantity':1}

                 }
                 ).then(()=>{
                     resolve()
                 })
                 
                }else{

               
                 db.get().collection(collection.CART_COLLECTION)
                 .updateOne({user:objectId(userid)},
                 {
                         $push:{products:proObj}
            
                 }
                 ).then((response)=>{
                     resolve()

                 })
                }

            }else{
                cartObj={
                    user:objectId(userid),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{

                    resolve();
                })
            }
        })

    },
    getCartProducts:(userid)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userid)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'

                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTIONS,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                  
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }

                   
                }
                // {
                //     $lookup:{
                //         from:collection.PRODUCT_COLLECTIONS,
                //         let:{prodList:'$products'},
                //         pipeline:[
                //            {
                //             $match:{
                //                 $expr:{
                //                     $in:['$_id',"$$prodList"]
                //                 }
                //             }
                //            }
                //         ],
                //         as:'cartItems'
                //     }
                // }
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount:(userid)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0;
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userid)})
            if(cart){
                count=cart.products.length;
            }

        resolve(count);


        })
       

    },
    changeProductQunatity:(details)=>{
       details.count=parseInt(details.count)
       details.quantity=parseInt(details.quantity)
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart)},
            {
                $pull:{products:{item:objectId(details.product)}}
                
            }
            ).then((response)=>{ 
                resolve({removeProduct:true}) 
            })
        }else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
                $inc:{'products.$.quantity':details.count}

            }
            ).then((response)=>{ 
                resolve(true)
            })
            
        }
            

        })
    } ,
    getTotalAmount:(userid)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userid)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'

                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTIONS,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                  
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }

                   
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$product.Prize']}}
                    }
                }
               
            ]).toArray()
           
            resolve(total[0].total)
        })

    }

}