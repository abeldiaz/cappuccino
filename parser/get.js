if(process.argv.length<3){
    console.log('no parameters found');
    process.exit(1);
}

const request=require('request')
  , fs=require('fs')
  , join=require('path').join
  , url='http://www.fcyt.umss.edu.bo/horarios/'
  , gestion=process.argv[2]
  , path=join(__dirname,'..','data','FCyT',gestion)
  , regex=/<a href="(.*)">(.*\.pdf)<\/a>/g
  , get=()=>{
        console.log('request fcyt index ...');
        request(url,(error,response,body)=>{
            if(error){
                throw error;
            }

            console.log('parsing fcyt index ...');
            if(response.statusCode==200){
                var buffer=new Array()
                  , result

                while((result=regex.exec(body))!==null){
                    buffer.push({
                        name:result[2]
                      , url:result[1]
                    });
                }

                buffer.forEach((element)=>{
                    console.log('saved: '+element.name);
                    request(element.url).pipe(
                        fs.createWriteStream(join(path,element.name)));
                });
            }
        });
    }

fs.stat(path,(error,stats)=>{
    if(error){
        fs.mkdir(path,(error)=>{
            get();
        });
    }else{
        get();
    }
});

