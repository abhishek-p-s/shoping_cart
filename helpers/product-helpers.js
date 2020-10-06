var db=require('../config/connection')
var collection=require('../config/collections')
var promise=require('promise');

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
    }
}