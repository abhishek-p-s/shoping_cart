const { response } = require('express');
var express = require('express');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper=require('../helpers/product-helpers');
 
/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelpers.getAllProducts().then((products)=>{
    console.log(products);
    res.render('admin/view-products',{admin:true,products});

  })
  
  
});
router.get('/add-product',function(req,res){
  res.render('admin/add-product');
})

router.post('/add-product',(req,res)=>{
 
  productHelpers.addProduct(req.body,(id)=>{
    let image=req.files.image
    image.mv('./public/product-images/'+id +'.jpg',(err,done)=>{
      if(!err){

        res.render("admin/add-product",{admin:true})

      }else{
        console.log(err)
      }
    })
    

  })

})

router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id;
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/')
  })
  

})

router.get('/edit-product/:id',async(req,res)=>{

  let product=await productHelpers.getProductDetails(req.params.id);
  console.log(product);
  res.render('admin/edit-product',{product});
  

})

router.post('/edit-product/:id',(req,res)=>{

  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    let id=req.params.id;
    if(req.files.image){
      let image=req.files.image;
      image.mv('./public/product-images/'+id +'.jpg');

    }
  })
})

module.exports = router;
