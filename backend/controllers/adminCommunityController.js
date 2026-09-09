const Community = require('../models/Community');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (v,d,min,max)=>{const n=parseInt(v,10); if(Number.isNaN(n)) return d; return Math.min(max,Math.max(min,n));};

exports.listCommunities = async (req,res)=>{
  try{
    const page=clampInt(req.query.page,1,1,10000); const limit=clampInt(req.query.limit,30,1,100);
    const search=String(req.query.search||'').trim();
    const filter={}; if(search) filter.name=new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
    const [total, communities]=await Promise.all([
      Community.countDocuments(filter),
      Community.find(filter).populate('owner','username phoneNumber').populate('members','username').sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean()
    ]);
    res.json({success:true, communities, pagination:{page,limit,total,pages:Math.ceil(total/limit)||1}});
  }catch(e){ console.error('[AdminCommunity] list',e); res.status(500).json({success:false,message:'Failed'});}
};

exports.deleteCommunity = async (req,res)=>{
  try{
    const c=await Community.findById(req.params.id);
    if(!c) return res.status(404).json({success:false,message:'Community not found'});
    await c.deleteOne();
    await logAdminAction(req.admin.id,'admin_deleted_community',{communityId:req.params.id},null,null,req);
    try{ const io=req.app.get('io'); if(io) io.emit('community:deleted',{communityId:String(req.params.id)});}catch{}
    res.json({success:true,message:'Community deleted'});
  }catch(e){ res.status(500).json({success:false,message:'Failed'});}
};
