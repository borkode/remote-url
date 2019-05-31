const express = require("express");
const request = require("request");
const cookieParser = require("cookie-parser");
const getUrls = require("get-urls");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.get("*", (req, res, next) => {
  fs.writeFileSync(__dirname+"/requests.txt",Number(fs.readFileSync(__dirname+"/requests.txt"))+1)
  next();
});

app.get("/loader/new", (req, res) => {
    let json = JSON.parse(fs.readFileSync(__dirname+"/pop.json"));
    let tpop = "";
    let unsorted = [];
    let i = 0;
    Object.keys(json).forEach((k) => {
      unsorted[i]=json[k].visits+"|"+JSON.stringify(json[k]);
      i++;
    });
    let top_sorted = unsorted.sort();
    if(top_sorted.length>10){
      for(let i = 0; i < top_sorted.length-10; i++){
        delete top_sorted[i];
      }
    }
    top_sorted.forEach((c) => {
      let k = Number(c.split("|")[0]);
      let j = JSON.parse(c.split("|")[1]);
      let template = `<tr><td><strong>${j.tag}</strong> | ${j.visits} ${j.visits==1?"person has":"people have"} proxied this website</td></tr>`;
      tpop=template+tpop;
    });
    res.type("html");
    res.send(fs.readFileSync(__dirname+"/l_new.html").toString().replace("REPLACE_TABLE_POPULAR",tpop).replace("REPLACE_UNSORTED_COUNT",unsorted.length<10?unsorted.length.toString():"10").replace("REPLACE_UNSORTED_LENGTH",unsorted.length.toString()).replace("REPLACE_REQUESTS_COUNT",fs.readFileSync(__dirname+"/requests.txt")));
});

app.get("/loader/set_page", (req, res) => {
    let site = [req.query.w,"/"];
    if(site[0].endsWith("/")){
      site[0]=site[0].substring(0,site[0].length-1);
    }
    if(site[0].split("//")[1].indexOf("/")!=-1){
      site[0]=site[0].split("//")[0]+"//"+site[0].split("//")[1].split("/")[0];
      site[1]=req.query.w.split("//")[1].split("/");
      delete site[1][0];
      site[1]=site[1].join("/");
    }
    res.cookie.baseUrl = site[0];
    let json_write = JSON.parse(fs.readFileSync(__dirname+"/pop.json"));
    let e = "//"+site[0].split("//")[1];
    e.startsWith("www.") ?
      e=e.split("www.")[1]:"";
    json_write[e] == undefined ?
      json_write[e]={"tag":e.split("//")[1],"visits":0}:""
      json_write[e].visits+=1;
    fs.writeFileSync(__dirname+"/pop.json",JSON.stringify(json_write));
    res.redirect(site[1]);
});

app.get("/loader/external", (req, res) => {
  let url = req.query.url;
  delete req.query.url;
  Object.keys(req.query).forEach((key) => {
    url+="&";
    url+=key;
    url+="=";
    url+=url[key];
  });
  let ul;
    ul = url.split(".")[url.split(".").length-1].split("?")[0]||"NaN";
    if(ul!="png" && ul!="jpg" && ul!="ico" && ul!="jpeg"){
      request.get(url,{},(err,resp,body) => {
        body = replaceAllUrls(body);
        res.send(body);
      });
    }else{
      req.pipe(request(url));
    }
});

app.get("/", (req, res, next) => {
  if(res.cookie.baseUrl==undefined || res.cookie.baseUrl==""){
     res.redirect("/loader/new");
  }else{
    next();
  }
});

app.get("/loader/development", (req, res) => {
  let json = JSON.parse(fs.readFileSync(__dirname+"/pop.json"));
    let tpop = "";
    let unsorted = [];
    let i = 0;
    Object.keys(json).forEach((k) => {
      unsorted[i]=json[k].visits+"|"+JSON.stringify(json[k]);
      i++;
    });
    let top_sorted = unsorted.sort();
    if(top_sorted.length>10){
      for(let i = 0; i < top_sorted.length-10; i++){
        delete top_sorted[i];
      }
    }
    top_sorted.forEach((c) => {
      let k = Number(c.split("|")[0]);
      let j = JSON.parse(c.split("|")[1]);
      let template = `<tr><td><strong>${j.tag}</strong> | ${j.visits} ${j.visits==1?"person has":"people have"} proxied this website</td></tr>`;
      tpop=template+tpop;
    });
    res.type("html");
    res.send(fs.readFileSync(__dirname+"/l_dev.html").toString().replace("REPLACE_TABLE_POPULAR",tpop).replace("REPLACE_UNSORTED_COUNT",unsorted.length<10?unsorted.length.toString():"10").replace("REPLACE_UNSORTED_LENGTH",unsorted.length.toString()).replace("REPLACE_REQUESTS_COUNT",fs.readFileSync(__dirname+"/requests.txt")));
});

app.get("*", (req, res) => {
    request.get(res.cookie.baseUrl + req.originalUrl,{},(err,resp,body) => {
      let ul;
      ul = req.originalUrl.split(".")[req.originalUrl.split(".").length-1].split("?")[0]||"NaN";
      if(ul!="png" && ul!="jpg" && ul!="ico" && ul!="jpeg"){
        body = replaceAllUrls(body);
        res.send(body);
      }else{
        request(res.cookie.baseUrl + req.originalUrl).pipe(res);
      }
    });
});

function replaceAllUrls(body) {
    let b = body;
    try{
        let urls = getUrls(body);
        urls.forEach((url) => {
           b = b.replace(url,"/loader/external?url="+url);
        });
    }catch(e){}
    return b;
}

app.listen(process.env.PORT||80);
