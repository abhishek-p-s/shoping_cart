var db=require('../config/connection')
var collection=require('../config/collections')
var promise=require('promise');
const { resolve, reject } = require('promise');
const { ObjectID } = require('mongodb');
const { response } = require('express');
var objectId=require('mongodb').ObjectID;

module.exports={
    addProduct:(product,callback)=>{
        console.log(product);
        db.get().collection('product').insertOne(product).then((data)=>{
            console.log(data)
            callback(data.ops[0]._id)

        })
    },

    getAllProducts:()=>{
        return new promise(async(resolve,reject)=>{
            let products= await db.get().collection(collection.PRODUCT_COLLECTIONS).find().toArray()
            resolve(products)
        })
    },

    deleteProduct:(proId)=>{
        return new promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTIONS).removeOne({_id:ObjectID(proId)}).then((response)=>{
                resolve(response)
            })
        })

    },
    getProductDetails:(proid)=>{
        return new promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTIONS).findOne({_id:objectId(proid)}).then((product)=>{
                resolve(product);
            })
        })

    },
    updateProduct:(proid,productDetails)=>{
        return new promise((resolve,reject)=>{
             
            db.get().collection(collection.PRODUCT_COLLECTIONS).updateOne({_id:objectId(proid)},{
                $set:{
                    name:productDetails.name,
                    Catagory:productDetails.Catagory,
                    Prize:productDetails.Prize,
                    Discription:productDetails.Discription

                }
            }).then((response)=>{
                resolve();
            })

        })

    }}