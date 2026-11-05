var _p=null;
var _r=null;
var _b=null;
function _JCL(a,t,n,o)
{
	if(t=="_blank")
	{
		if(o!=null)open(a,n.toUpperCase(),o);
		else open(a,n.toUpperCase());
	}
	else if(t=="_top")top.document.location=a;
	else if(t=="_parent")parent.document.location=a;
	else if(t=="_self")self.document.location=a;
	else _JOF(top,t).document.location=a;
}
function _JRL(a,t,n,o)
{
	if(t=="_blank")
	{
		if(o!=null)open(a,n.toUpperCase(),o);
		else open(a,n.toUpperCase());
	}
	else if(t=="_top")top.document.location.replace(a);
	else if(t=="_parent")parent.document.location.replace(a);
	else if(t=="_self")self.document.location.replace(a);
	else _JOF(top,t).document.location.replace(a);
}
function _JSL(p,a,t,n,o)
{
	_b=p.WD_BUTTON_CLICK_.value;p.WD_BUTTON_CLICK_.value=a;
	if(t=="_blank"&&o!=null)
	{
		var d=new Date();var e=(n!=""?n.toUpperCase():"_BLANK_"+Math.abs(Date.UTC(d.getYear(),d.getMonth(),d.getDay(),d.getHours(),d.getMinutes(),d.getSeconds())));
		if(o)open("",e,o);else open("",e);t=e;
	}
	else if(t!="_blank"&&t!="_self"&&t!="_top"&&t!="_parent")t=t.toUpperCase();
	_p=p;_r=p.target;p.target=t;p.submit();
	setTimeout("_JRE()",1);
}
function _JRE(){_p.target=_r;_p.WD_BUTTON_CLICK_.value=_b;}
function _JOF(w,n)
{
	var i;for(i=0;i<w.frames.length;i++)
	{
		if(w.frames[i].name.toUpperCase()==n.toUpperCase())return w.frames[i]
		var f =_JOF(w.frames[i],n);if(f)return f;
	}
	return null;
}
