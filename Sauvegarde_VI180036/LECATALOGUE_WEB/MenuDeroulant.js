
var main=""; 
var RepertoireImage="";
var ImageSiSousMenu="fleche1.gif";
var ImageSiPasSousMenu="vide.gif"; 
var font="ms sans serif";
var colBarre="#EDF2F9";
var colFond="#EDF2F9";
var colContour="#000066";
var colOver="#316AC5";
var colTextOff="navy";
var colTextOn="white";
var cssTexte=";font-weight:bold;color:navy;font-family:ms sans serif;font-size:12px";
var hauteur=15;
var nivmax=4;
var delai=500;
var isout=0;
var MnuImgBor = "MenuBordure.gif"
var MnuMarLib = 15

function CreerMain(X,Y,haut,colFOn,colFOff,colTOn,colTOff) 
{
	this.nb=0;
	this.X=X;
	this.Y=Y;
	this.haut=haut;
	this.Add=AddMain;
	this.Print=PrintMain;
}

function AddMain(txt,larg,mnu,url,target) 
{
	var m=new Object;
	m.txt=txt;
	m.larg=larg,m.mnu=mnu,m.url=url;
	m.target=target;
	this.nb++;
	this[this.nb]=m;
	if(mnu!='')
	{
		eval(mnu+'.parent="'+txt+'"');
	};
}

function PrintMain() 
{
	X=this.X;
	Y=this.Y;
	A="";
	for (var i=1;i<=this.nb;i++)
	{
		if (this[i].mnu=="")
		{
			this[i].mnu='0';
		}
		if ((document.all)||(window.sidebar))
		{		
			var clic=""; 
			var style=""; 
			if(this[i].url!="") 
			{
				style="cursor:hand;";
				clic=" onclick=\""+this[i].url+"\";";
			}
			A+="<DIV id='main"+i+"' style='position:absolute;left:"+X+";top:"+Y+";"+style+"width:"+this[i].larg+";height:"+this.haut+";background-color:"+colBarre+";"+cssTexte+";color:"+colTextOff+";text-align:center' onmouseover='start("+i+","+this[i].mnu+","+X+","+(Y+this.haut+1)+")'"+clic+">"+this[i].txt+"</DIV>";
		}
		if (document.layers) 
		{
			var txt=this[i].txt;
			if(this[i].url!="") 
			{
				txt="<A href='"+this[i].url+"'>"+txt+"</A>";
			}
			A+="<LAYER name='main"+i+"' left="+X+" top="+Y+" width="+this[i].larg+" height="+this.haut+" bgcolor="+colBarre+"  onmouseover='start("+i+","+this[i].mnu+","+X+","+(Y+this.haut+1)+")'><CENTER><SPAN style='background-color:"+colBarre+cssTexte+"'>"+txt+"</SPAN></CENTER></LAYER>";
		}
		X+=this[i].larg+1;
	}
	document.write(A);
}

function CreerMenu(nom,niv,target)
{
	this.nb=0;
	this.X=0;
	this.Y=0;
	this.width=1;
	this.niv=niv;
	this.parent=""; 
	this.ON=-1;
	this.nom=nom;
	this.target=""; 
	if ((target!="")&&(target!=null)) 
		this.target=target;
	this.add=Add;
	this.aff=Aff;
}

function Add(lib,lnk,mnu,target) 
{
	var rub = new Object;
	rub.lib=lib; 
	rub.target=target;	
	rub.lnk=""; 
	if ((lnk!="")&&(lnk!=null)) 
		rub.lnk=lnk; 
	rub.mnu=""; 
	if ((mnu!="")&&(mnu!=null)) 
	{
		rub.mnu=mnu; 
		mnu.parent=this;
	}	
	this[this.nb]=rub;	
	this.nb++;
}

function start(i,mnu,x,y) 
{
	isout=1;
	hideall(i);
	if (mnu!=0)
	{
		mnu.aff(x,y);
	};
	BGCalque("main"+i,colOver,colContour);
	FontCalque("main"+i,colTextOn,0);
	MoveCalque("fond",x-50,y+1);
	ShowCalque("fond");
	return false;
}

function onfond() 
{
	isout=1;
	setTimeout("hideall()",delai);
}

function hideall(i) 
{
	if (isout==1) 
	{
		for (var i=0;i<nivmax;i++) 
		{
			HideCalque("niv"+i);
			HideCalque("fond");
		}
		for (var i=1;i<=main.nb;i++) 
		{
			BGCalque("main"+i,colBarre,colFond); 
			FontCalque("main"+i,colTextOff,0);
		}
		window.status="";
		MoveCalque("fond",1,1);
	}
}

function hide(mnu) 
{
	if (mnu.ON>-1) 
	{
		if (mnu[mnu.ON].mnu!="") 
		{
			var nom="niv"+mnu[mnu.ON].mnu.niv;
			HideCalque(nom);
			hide(mnu[mnu.ON].mnu);
		}
	}
	mnu.ON=-1;
}

function over(mnu,i) 
{
	var nom="niv"+mnu.niv+"n"+i;
	var nomtd=nom+"td";
	isout=0;
	BGCalque(nom,colOver,colContour);
	FontCalque(nomtd,colTextOn,0);
}

function out(mnu,i) 
{
	var nom="niv"+mnu.niv+"n"+i; 	
	var nomtd=nom+"td";
	if (mnu[i].lib!="-") 
	{
		BGCalque(nom,colFond,colFond);
		FontCalque(nomtd,colTextOff,0);
	}
}

function clear(mnu)
{
	for (var j=0;j<mnu.nb;j++) 
	{
	   out(mnu,j);
	   hide(mnu);
	}
}

function mmover(mnu,i) 
{
	clear(mnu);
	over(mnu,i);
	mnu.ON=i;
	if (mnu[i].mnu!="") 
	{
		mnu[i].mnu.aff();
	}
	var ok=1;
	var Y=""; 
	var Z=mnu[i].lib;
	var u=mnu;
	while (u.niv>0) 
	{
		Z=u.parent[u.parent.ON].lib+" > "+Z;
		u=u.parent;
	}
	Z=u.parent+" > "+Z;
	for (var j=0;j<Z.length ;j++ )
	{
		if (Z.charAt(j)=="<") 
		{
			ok=0;
		}
		if (ok==1) 
		{
			Y+=Z.charAt(j); 
		}
		if (Z.charAt(j)==">") 
		{
			ok=1;
		}
	}
	window.status=Y;
}

function mmclick(mnu) 
{
	lnk=mnu[mnu.ON].lnk;
	if (lnk!="") 
	{
		if (mnu[mnu.ON].target=="_blank") 
		{
			eval(lnk);
		}
		else 
		{
			eval(lnk); 
		}
	}
}

function AFF()
{
	var n=new Image;
	n.src=RepertoireImage+ImageSiSousMenu;
	var m=new Image;
	m.src=RepertoireImage+ImageSiPasSousMenu;	
	var A="";
	if ((document.all)||(window.sidebar))
	{
		A="<DIV id='fond' style='position:absolute;border=1px;top:10;left:100;width:500;height:400;visibility:hidden;font-family:"+font+"' onmouseover='onfond()'></DIV>";
		A+="<DIV id='niv0' style='position:absolute;top:10;left:100;visibility:hidden;font-family:"+font+"'></DIV>";
		A+="<DIV id='niv1' style='position:absolute;top:10;left:100;visibility:hidden;font-family:"+font+"'></DIV>";
		A+="<DIV id='niv2' style='position:absolute;top:10;left:100;visibility:hidden;font-family:"+font+"'></DIV>";
		A+="<DIV id='niv3' style='position:absolute;top:10;left:100;visibility:hidden;font-family:"+font+"'></DIV>";
	}
	else
	{
		A="<LAYER name='fond' width=500 height=600 visibility=hide top=100 left=100 onmouseover='onfond()'>&nbsp;</LAYER>";
		A+="<LAYER name='niv0' top=200 left=200 visibility=show></LAYER>";
		A+="<LAYER name='niv1' top=200 left=200 visibility=show></LAYER>";
		A+="<LAYER name='niv2' top=200 left=200 visibility=show></LAYER>";
		A+="<LAYER name='niv3' top=200 left=200 visibility=show></LAYER>";
	}	
	document.write(A);main.Print();
}

// cadre interne : 0 ou 1
MnuCadInt = 0



function Aff(x,y)
{
	var nom=this.nom;
	var niv="niv"+this.niv;
	if (this.niv==0)
	{
		X=x;
		Y=y;
	}
	else
	{
		X=this.parent.X+this.parent.width-1;
		Y=this.parent.Y+(hauteur+4+3*MnuCadInt)*this.parent.ON+2*MnuCadInt
	}
	if ((document.all)||(window.sidebar)) 
	{
		var A=""
		A+=	"<TABLE border=1 cellpadding=0 cellspacing="+MnuCadInt+" style='"
		A+= "background-image:url("+RepertoireImage+MnuImgBor+");background-repeat:repeat-y;"
		A+= "border-color:"+colContour+";border-style:solid;border-width:1px'>";
		
		for (var i=0;i<this.nb;i++) 
		{
			if (this[i].lib=="-")
			{
				A += "	<TR>"
				A += "		<TD style='font-size:10px;border-style:none;margin:0px;height:"+(hauteur-2)+"px' colspan=2>"
				A += "			<DIV  style='background-color:"+colFond+";height:"+(hauteur+2)+"px'>"
				A += "				<HR noshade style='color:"+colContour+";height:1'>"
				A += "			</DIV>"
				A += "		</TD>"
				A += "	</TR>"; 
			}
			else
			{
				var img=RepertoireImage+ImageSiPasSousMenu;
				if (this[i].mnu!="")
				{
					img=RepertoireImage+ImageSiSousMenu
				}
				A += "	<TR>"
				A += "		<TD style='cssTexte;border-width:0;margin:0px'>"
				A += "			<TABLE id='"+niv+"n"+i+"' cellpadding=0 cellspacing=0 border="+MnuCadInt+" style='background-color:"+colFond+";border-width:"+MnuCadInt+";border-style:solid;cursor:hand;"+cssTexte+";color:"+colTextOff+"' width=100% onmouseover='mmover("+this.nom+","+i+")' onClick='mmclick("+this.nom+")'>"
				A += "				<TR>"
				A += "					<TD NOWRAP id='"+niv+"n"+i+"td' style='border-style:solid;border-width:0' width=100%>"
				A += "						<FONT style='margin-left:"+MnuMarLib+";"+cssTexte+"'>"+this[i].lib+"</FONT>"
				A += "					</TD>"
				A += "					<TD style='border-style:solid;border-width:0;' width=10 align=right>"
				A += "						<IMG src='"+img+"' height='"+hauteur+"' width='"+hauteur+"'>"
				A += "					</TD>"
				A += "				</TR>"
				A += "			</TABLE>"
				A += "		</TD>"
				A += "	</TR>";
			}
		}
		A += "</TABLE>"
	}
	else
	{
		var A="<table border=0 cellspacing=0 cellpadding=1><tr><td bgcolor="+colContour+">";
		A+="<TABLE border=0 cellpadding=0 cellspacing=0 bgcolor="+colFond+" width=100%>";
		for (var i=0;i<this.nb;i++) 
		{
			if (this[i].lib=="-")
			{
				A+="<TR><TD><HR width=99% height=1%></TD></TR>";
			}
			else
			{
				var img=RepertoireImage+ImageSiPasSousMenu;
				if (this[i].mnu!="")
				{
					img=RepertoireImage+ImageSiSousMenu
				}
				A+="<TR><TD><TABLE border=0 width=100% cellspacing=0><TR><TD><A href='javascript:mmclick("+this.nom+")' onmouseover='mmover("+this.nom+","+i+")'><SPAN style='background-color:"+colFond+cssTexte+"'>"+this[i].lib+"</SPAN></A></TD><TD width=10 align=right><IMG src='"+img+"' height="+hauteur+" width="+hauteur+"></TD></TR></TABLE></TD></TR>";
			}
		}
		A+="</TABLE></TD</TR></TABLE>"
	}
	if (document.all)
	{
		document.all[niv].innerHTML=A;
		document.all[niv].style.top=Y;
		document.all[niv].style.left=X;
		document.all[niv].style.visibility="visible";
		this.X=X;
		this.Y=Y;
		this.width=document.all[niv].clientWidth;
	}
	if (window.sidebar) 
	{
		document.getElementById(niv).innerHTML=A;
		document.getElementById(niv).style.top=Y;
		document.getElementById(niv).style.left=X;
		document.getElementById(niv).style.visibility="visible";
		this.X=X;
		this.Y=Y;
		this.width=document.getElementById(niv).offsetWidth;
	}
	if (document.layers) 
	{
		document.layers[niv].left=X;
		document.layers[niv].top=Y;
		document.layers[niv].document.write(A);
		document.layers[niv].document.close();
		document.layers[niv].visibility="show";
		this.X=X;
		this.Y=Y;
		this.width=document.layers[niv].clip.width;
	}
}

function HideCalque(nom)
{
	if (document.all)
	{
		document.all[nom].style.visibility="hidden";
	}
	if (window.sidebar)
	{
		document.getElementById(nom).style.visibility="hidden";
	}
	if (document.layers)
	{
		document.layers[nom].visibility="hide";
	}
}

function ShowCalque(nom)
{
	if (document.all) 
	{
		document.all[nom].style.visibility="visible";
	}
	if (window.sidebar) 
	{
		document.getElementById(nom).style.visibility="visible";
	}
	if (document.layers) 
	{
		document.layers[nom].visibility="show";
	}
}

function BGCalque(nom,BG,CC)
{
	if (document.all) 
	{
		document.all[nom].style.backgroundColor=BG;
		document.all[nom].style.borderColor = CC;
	}
	if (window.sidebar) 
	{
		document.getElementById(nom).style.backgroundColor=BG;
		document.getElementById(nom).style.borderColor = CC;
	}
}

function FontCalque(nom,Font,n) 
{
	if (document.all) 
	{
		document.all[nom].style.color=Font;
	}
	if (window.sidebar) 
	{
		document.getElementById(nom).style.color=Font;
	}
}

function MoveCalque(nom,X,Y) 
{
	if (document.all) 
	{
		document.all[nom].style.top=Y;
		document.all[nom].style.left=X;
	}
	if (window.sidebar) 
	{
		document.getElementById(nom).style.top=Y;
		document.getElementById(nom).style.left=X;
	}
	if (document.layers) 
	{
		document.layers[nom].top=Y;
		document.layers[nom].left=X;
	}
}

function GetLeft(nom) 
{
	if (document.all) 
	{
		return document.all[nom].style.left;
	}
	if (window.sidebar) 
	{
		return document.getElementById(nom).style.left
	}
	if (document.layers) 
	{
		return document.layers[nom].left;
	}
}

