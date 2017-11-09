if(process.argv.length<3){
    console.log('no parameters found');
    process.exit(1);
}

const pdftext=require('pdf-text')
  , join=require('path').join
  , gestion=process.argv[2]
  , path=join(__dirname,'..','data','FCyT',gestion)
  , file=require('file')
  , fs=require('fs')
  , async=require('async')
  , pdf2json=(path,done)=>{
        pdftext(path,(error,chunks)=>{
            let result=parseTXT(error,chunks);
            done(result);
        });
    }
  , parseTXT=(error,chunks)=>{
        if(error){
            console.log('error:'+error);
            return;
        }

        var regex1=/^([A-Z \(\)]+)\(([0-9]+)\)$/
          , regex2=/^ ?([ABCDEFGHIJ]) ?$/
          , regex3=/^([0-9]{7}) ?([A-Z¥\. ]+)/
          , regex31=/^([0-9]{7})/
          , regex32=/^([A-Z¥\. ]+)/
          , regex4=/^([0-9]{1,2}[A-Z]?)$/
          , regex5=/^(LU|MA|MI|JU|VI|SA) ([0-9]{3,4})-([0-9]{3,4})\((.*)\)$/
          , regex6=/^([A-Z¥ \.]{4,})$/
          , regex7=/^\(\*\)$/

        var flag1=false
          , flag2=false
          , flag3=false
          , flag31=false
          , flag6=false

        var level=undefined
          , subject=undefined
          , group=undefined

        var i1=-1
          , i2=-1
          , i3=-1
          , i4=-1

        var result=undefined
          , parseDuration=(s,f)=>{
                var _s=(parseInt(parseInt(s)/100)*60)+(parseInt(s)%100)
                  , _f=(parseInt(parseInt(f)/100)*60)+(parseInt(f)%100)

                return parseInt((_f-_s)/45)
            }

        chunks.forEach((element)=>{
console.log(element);
            var match1=regex1.exec(element)
            if(match1&&!flag1){
console.log('--> match1',element);
                result={
                    code:match1[2]
                  , name:match1[1]
                  , levels:[]
                };
                flag1=true;
            }

            var match2=regex2.exec(element)
            if(match2){
console.log('--> match2',element);
                if(!level||level!=match2[1]){
                    result.levels.push({
                        code:match2[1]
                      , subjects:[]
                    });
                    level=match2[1];
                    i1++;
                    i2=-1;
                    subject=undefined;
                }
            }

            var match3=regex3.exec(element)
            if(match3){
console.log('--> match3',element);
                if(!subject||subject!=match3[1]){
                    result.levels[i1].subjects.push({
                        code:match3[1]
                      , name:match3[2]
                      , groups:[]
                    });
                    subject=match3[1];
                    i2++;
                    i3=-1;
                    group=undefined;
                }
            }

            var match31=regex31.exec(element)
            if(match31){
console.log('--> match31',element);
                if(!subject||subject!=match31[1]){
                    result.levels[i1].subjects.push({
                        code:match31[1]
                      , name:''
                      , groups:[]
                    });
                    flag31=true;
                }
            }

            var match32=regex32.exec(element)
            if(match32&&flag31){
console.log('--> match32',element);
                if(!subject||subject!=match32[1]){
                    result.levels[i1].subjects[
                        result.levels[i1].subjects.length-1].name=match32[1];
                    subject=match32[1];
                    i2++;
                    i3=-1;
                    group=undefined;
                    flag6=true;
                }
                flag31=false;
            }

            var match4=regex4.exec(element)
            if(match4){
console.log('--> match4',element);
                if(!group||group!=match4[1]){
                    result.levels[i1].subjects[i2].groups.push({
                        code:match4[1]
                      , schedule:[]
                    });
                    group=match4[1];
                    i3++;
                    i4=-1;
                }
            }

            var match5=regex5.exec(element)
            if(match5){
console.log('--> match5',element);
                result.levels[i1].subjects[i2].groups[i3].schedule.push({
                    day:match5[1]
                  , start:match5[2]
                  , end:match5[3]
                  , duration:parseDuration(match5[2],match5[3])
                  , room:match5[4]
                });
                i4++;
                flag2=true;
            }

            var match6=regex6.exec(element)
            if(match6&&flag2&&!flag31&&!flag6){
console.log('--> match6',element);
                var groups=result.levels[i1].subjects[i2].groups[i3]

                if(!groups.teacher){
                    result.levels[i1].subjects[i2]
                          .groups[i3].teacher=match6[1];
                }else{
                    var teacher=groups.teacher

                    if(teacher!=match6[1]){
                        result.levels[i1].subjects[i2]
                              .groups[i3].teacher=[teacher,match6[1]];
                    }
                }

                result.levels[i1].subjects[i2]
                      .groups[i3].schedule[i4].teacher=match6[1];

                flag2=false;
                flag3=true;
                flag6=false;
            }

            var match7=regex7.exec(element)
            if(match7&&flag3){
console.log('--> match7',element);
                var teacher=result.levels[i1].subjects[i2].groups[i3].teacher

               if(teacher instanceof Array){
                   result.levels[i1].subjects[i2]
                         .groups[i3].teacher=teacher[0];
               }else{
                   result.levels[i1].subjects[i2]
                         .groups[i3].auxiliar=teacher;
                   delete result.levels[i1].subjects[i2]
                         .groups[i3].teacher
               }

                flag3=false;
            }
        });

        return result;
    }
  , q=async.queue((data,callback)=>{
        pdf2json(data.item,(json)=>{
            if(json){
                fs.writeFile(join(data.path,json.code+'.json'),JSON.stringify(json),
                (error)=>{
                    if(error){throw error}
                    console.log(json.name+' saved');
                    summary.push({
                        code:json.code
                      , name:json.name
                    });
                    callback();
                });
            }else{
                console.log(data.item+' was ignored');
                callback();
            }
        });
    },100)

q.drain=()=>{
    summary=summary.sort((a,b)=>{
        if(a.name>b.name){
            return 1;
        }
        if(a.name<b.name){
            return -1
        }
        return 0;
    });
    fs.writeFile(join(path,'..',gestion+'.json'),JSON.stringify(summary),
    (error)=>{
        if(error){throw error}

        console.log('summary saved');
    });
}

var summary=[]

file.walk(path,(error,base,dirs,files)=>{
    if(error){throw error}
    files.forEach((element)=>{
        var suffix='.pdf';
        if(element.indexOf(suffix,element.length-suffix.length) !== -1){
            q.push({path:base,item:element});
        }
    });
});

