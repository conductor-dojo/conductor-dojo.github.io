const http=require('http'),fs=require('fs'),path=require('path');
http.createServer((req,res)=>{
  const f=req.url==='/'?'index.html':req.url.split('?')[0].slice(1);
  fs.readFile(path.join(__dirname,f),(e,d)=>{
    if(e){res.writeHead(404);res.end('no');return;}
    const t=f.endsWith('.json')?'application/json':'text/html';
    res.writeHead(200,{'Content-Type':t+'; charset=utf-8'});res.end(d);
  });
}).listen(8733,()=>console.log('keymap-dojo on http://localhost:8733'));
