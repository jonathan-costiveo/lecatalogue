// Procedures globales du projet
function _RMP(c,o,r){var p=0;var t;var s=[];while (-1!=(t=c.indexOf(o,p))){s.push(c.substring(p,t));s.push(r);p=t+o.length}s.push(c.substring(p));return s.join("")}
function _NAO(p){if(p==0||p>127)return "toolbar=0,location=0,status=0,scrollbars=0,directories=0,menubar=0,resizable=0";var o="";if(p&1)o+="toolbar=1,";if(p&2)o+="location=1,";if(p&4)o+="status=1,";if(p&8)o+="menubar=1,";if(p&16)o+="scrollbars=1,"
if(p&32)o+="resizable=1,";if(p&64)o+="directories=1,";if(o.length>0)o=o.substr(0, o.length-1);return o}
function HFNAV_OUVREDETAILS(VsDetail){{var VsDetailNav=_RMP(VsDetail,clWDEncode.sEncodeCharset(unescape("\x26")),clWDEncode.sEncodeCharset(unescape("\x26amp;")))
VsDetailNav=_RMP(VsDetailNav,clWDEncode.sEncodeCharset(unescape("\x3C")),clWDEncode.sEncodeCharset(unescape("\x26lt;")));VsDetailNav=_RMP(VsDetailNav,clWDEncode.sEncodeCharset(unescape("\x3E")),clWDEncode.sEncodeCharset(unescape("\x26gt;")))
VsDetailNav=_RMP(VsDetailNav,clWDEncode.sEncodeCharset(unescape("\'")),clWDEncode.sEncodeCharset(unescape("\x26#39;")));VsDetailNav=_RMP(VsDetailNav,clWDEncode.sEncodeCharset(unescape("\"")),clWDEncode.sEncodeCharset(unescape("\x26quot;")))
VsDetailNav=_RMP(VsDetailNav,clWDEncode.sEncodeCharset(unescape("\r\n")),clWDEncode.sEncodeCharset(unescape("\x3CBR\x3E")));var VpclNavigateur=window.open("","DETAILS".toUpperCase(),_NAO(0)+",width="+400+",height="+600)
VpclNavigateur.document.write(((clWDEncode.sEncodeCharset(unescape("\x3CHTML\x3E\x3CHEAD\x3E\x3CTITLE\x3EDetails...\x3C/TITLE\x3E\x3C/HEAD\x3E\x3CBODY style=\"font-family:Verdana, Arial, Helvetica, sans-serif;font-size:12px;color:#1540A1;\"\x3E"))+VsDetailNav)+clWDEncode.sEncodeCharset(unescape("\x3C/BODY\x3E\x3C/HTML\x3E"))))
VpclNavigateur.document.close();ToClipBoard(VsDetail)}}
function ToClipBoard(sTexte)
{
	if (window.clipboardData)
	{
		window.clipboardData.setData("Text", sTexte);
		return;
	}
	// Pas de code pour la copie pour Firefox/autres navigateur pour le moment
}
