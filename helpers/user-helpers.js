var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { USER_COLLECTION } = require('../config/collections');
const { resolve, reject } = require('promise');
const { response } = require('express');
const { use } = require('../routes/user');
const { ObjectID } = require('mongodb');
var objectId = require('mongodb').ObjectID;
var Razorpay = require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_7q7H4xAPWnSNpe',
    key_secret: 'RFGQeR2ks9ru3DpnsLZjIOn3',
});

module.exports = {

    doSignup: (userdata) => {
        return new Promise(async (resolve, reject) => {

            userdata.password = await bcrypt.hash(userdata.password, 10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userdata).then((data) => {

                resolve(data.ops[0])


            })

        })

    },

    doLogin: (userdata) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {};
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userdata.email });
            if (user) {
                bcrypt.compare(userdata.password, user.password).then((status) => {
                    if (status) {
                        console.log("login success..");
                        response.user = user;
                        response.status = true;
                        resolve(response);

                    } else {
                        console.log("login failed....");
                        resolve({ status: false });
                    }

                })
            } else {
                console.log("login failed...");
                resolve({ status: false });
            }
        })

    },

    addToCart: (proid, userid) => {
        let proObj = {
            item: objectId(proid),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userid) });
            if (userCart) {
                let proExit = userCart.products.findIndex(product => product.item == proid)
                if (proExit != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userid), 'products.item': objectId(proid) },
                            {
                                $inc: { 'products.$.quantity': 1 }

                            }
                        ).then(() => {
                            resolve()
                        })

                } else {


                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userid) },
                            {
                                $push: { products: proObj }

                            }
                        ).then((response) => {
                            resolve()

                        })
                }

            } else {
                cartObj = {
                    user: objectId(userid),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {

                    resolve();
                })
            }
        })

    },
    getCartProducts: (userid) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {

                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
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
    getCartCount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userid) })
            if (cart) {
                count = cart.products.length;
            }

            resolve(count);


        })


    },
    changeProductQunatity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }

                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }

                        }
                    ).then((response) => {
                        resolve({ status: true })
                    })

            }


        })
    },
    getTotalAmount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {

                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }


                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.Prize'] } }
                    }
                }

            ]).toArray()

            resolve(total[0].total)
        })

    },
    placeOrder: (order, product, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, product, total);
            let status = order['payment-method'] == "COD" ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode,
                    totalAmount: total,
                    date: new Date()

                },
                userid: objectId(order.userid),
                paymentMethod: order['payment-method'],
                products: product,
                status: status
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.ORDER_COLLECTION).removeOne({ user: objectId(order.userid) })
                resolve(response.ops[0]._id)

            })

        })

    },
    getCartproductList: (userid) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userid) })
            resolve(cart.products)

        })
    },
    getUserOrder: (userid) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userid: objectId(userid) }).toArray()
            resolve(orders)
        })

    },
    getOrderProducts: (orderid) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {

                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }


                }

            ]).toArray()

            resolve(orderItems)

        })
    },
    generateRazorpay: (orderid, totalPrize) => {
        return new Promise((resolve, reject) => {


            var options = {
                amount: totalPrize*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderid
            };
            instance.orders.create(options, function (err, order) {
                if (err) {

                    console.log(err);

                } else {
                    console.log("new order : " + order);
                    resolve(order)

                }

            });
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'RFGQeR2ks9ru3DpnsLZjIOn3');

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]'])
            {
                resolve()
            }else{
                reject()
            }
        })

    },
    changePaymentStatus:(orderid)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderid)},
            {

                $set:{
                     status: 'placed'
                }
            }
            
            ).then(()=>{
                resolve()
            })
          
      
        })

    }
}