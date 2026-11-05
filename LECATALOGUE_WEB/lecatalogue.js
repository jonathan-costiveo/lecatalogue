// Procédures globales du projet
function _EC(c,p,s){var d=-s.length;for(var i=0;i<p-1;i++){d=c.indexOf(s,d+s.length);if(d==-1)return(p==1?c:"\b")}var f=c.indexOf(s,d+s.length);if(f==-1)f=c.length;return c.substring(d+s.length,f)}
function bVerifieFormatEmail(VSEMAIL){var VNLONGARO=0;var VNLONGLASTPOINT=0;var VSUTILISATEUR="";var VSSERVEUR="";var VSPAYS="";VNLONGARO=(VSEMAIL.indexOf("@")+1);if((!VNLONGARO)){return(0)}
if(((VSEMAIL.substring(((VNLONGARO+1))-1,VSEMAIL.length).indexOf("@")+1)!=0)){return(0)}var VI=1;while((_EC(VSEMAIL.substring(((VNLONGARO+1))-1,VSEMAIL.length),VI,".")!="\b")){VSPAYS=_EC(VSEMAIL.substring(((VNLONGARO+1))-1,VSEMAIL.length),VI,".")
VI=VI+1}if((VI==1)){return(0)}VNLONGLASTPOINT=(VSEMAIL.length-VSPAYS.length);VSUTILISATEUR=VSEMAIL.substring((1)-1,(VNLONGARO-1));VSSERVEUR=VSEMAIL.substring(((VNLONGARO+1))-1,(VNLONGLASTPOINT-1))
if(((VSUTILISATEUR.length==0)||(VSSERVEUR.length==0))){return(0)}if(((VSPAYS.length<2)||(VSPAYS.length>3))){return(0)}return(1)}
