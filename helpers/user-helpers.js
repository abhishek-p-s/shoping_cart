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
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userid)});
            if(userCart){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user:objectId(userid)},
                {
                        $push:{products:objectId(proid)}
            
                }
                ).then((response)=>{
                    resolve()

                })

            }else{
                cartObj={
                    user:objectId(userid),
                    products:[objectId(proid)]
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
                    $lookup:{
                        from:collection.PRODUCT_COLLECTIONS,
                        let:{prodList:'$products'},
                        pipeline:[
                           {
                            $match:{
                                $expr:{
                                    $in:['$_id',"$$prodList"]
                                }
                            }
                           }
                        ],
                        as:'cartItems'
                    }
                }
            ]).toArray()
            resolve(cartItems[0].cartItems)
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
       

    }

}