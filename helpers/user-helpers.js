var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt');
const { USER_COLLECTION } = require('../config/collections');
const { resolve, reject } = require('promise');
const { response } = require('express');
const { use } = require('../routes/user');

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

    }

}