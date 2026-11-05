var gbEnDehors = 0
var gsChampEnCours = ""
var gnNbCtx = 3

if(!window.event && window.captureEvents) {
  // set up event capturing for mouse events (add or subtract as desired)
  window.captureEvents(Event.MOUSEOVER|Event.MOUSEOUT|Event.CLICK|Event.DBLCLICK);
  // set window event handlers (add or subtract as desired)
  window.onmouseover = WM_getCursorHandler;
  window.onmouseout = WM_getCursorHandler;
  window.onclick = WM_getCursorHandler;
  window.ondblclick = WM_getCursorHandler;
  // create an object to store the event properties 
  window.event = new Object;
}


function WM_getCursorHandler(e) {
  // set event properties to global vars (add or subtract as desired)
  window.event.clientX = e.pageX;
  window.event.clientY = e.pageY;
  window.event.x = e.layerX;
  window.event.y = e.layerY;
  window.event.screenX = e.screenX;
  window.event.screenY = e.screenY;
  // route the event back to the intended function
  if ( routeEvent(e) == false ) {
    return false;
  } else {
    return true;
  }
}

function _WWCTX_AFFICHE()
{
	//Rend visible et modifie la position du menu contextuel en fonction du curseur de la souris
	var szCtx = "MCTX"	
	document.getElementById(szCtx).style.top = event.clientY
	document.getElementById(szCtx).style.left = event.clientX
	document.getElementById(szCtx).style.visibility = "visible"
	_WWCTX_SELECTION(1)
}

function _WWCTX_CACHE()
{
	if(gbEnDehors==1)
		document.getElementById("MCTX").style.visibility = "hidden"
}

function _WWCTX_FERME()
{
	gbEnDehors = 1;
	setTimeout("_WWCTX_CACHE()",500);
}

function _WWCTX_BLOQUE()
{
	return false;
}

// cadre interne : 0 ou 1
CtxCadInt = 0
// couleur de fond
CtxColFon = "#ffffff"
// couleur de cadre
CtxColCad = "#000000"
// image de bordure
CtxImgBor = "MenuBordure.gif"
// marge (dépend de l'image de bordure)
CtxMarge = 21
// couleur de fond de sélection
CtxColFonSel = "#A1ABC6"

function _WWCTX_SELECTION(idCtx)
{	
	gbEnDehors = 0;
	for(i=1;i<=gnNbCtx;i++)
	{
		var Elm	 = document.getElementById("Option" + i)
		var Fnt  = document.getElementById("OptionText" + i)
		Elm.style.borderWidth=0
		Fnt.style.marginLeft=CtxMarge
		Elm.style.backgroundColor = ""
	}	
	var Elm = document.getElementById("Option" + idCtx)
	var Fnt  = document.getElementById("OptionText" + idCtx)
	Elm.style.borderWidth=1
	Fnt.style.marginLeft=CtxMarge-CtxCadInt
	Elm.style.borderColor = CtxColCad
	Elm.style.backgroundColor = CtxColFonSel
}

function _WWCTX_OBJET(szNomObjet)
{
	return document.getElementById("ct_" + szNomObjet);
}

function _WWCTX_CREE(RepImg)
{
	var A;
	A  = "	<div id='MCTX' name='MCTX' style='z-index:999;position:absolute;visibility:hidden'>"
	A += "		<table border=1 cellspacing="+CtxCadInt+" cellpadding=0 bgcolor="+CtxColFon+" bordercolor="+CtxColCad+" style='background-image:url("+RepImg+"/"+CtxImgBor+");background-repeat:repeat-y;' width=150 height=66>"
	A += "			<tr width=100% height=66>"
	A += "				<td style='border-width:0' width=100% height=66 valign=middle>"
	A += "					<table border="+CtxCadInt+" style='border-width:0' cellspacing=0 cellpadding=0 align=center border=0 width=100% height=66>"
	A += "						<tr height=22 width=100%>"
	A += "							<td onselectstart='return(false)' border=1 title='Exporter le contenu vers Excel...' style='border-width:0' id='Option1' height=22 width=100% onmouseover='_WWCTX_SELECTION(1);' onmouseout='_WWCTX_FERME()' onmouseup='"+'_JEC("xls","EXPORTXLS",gsChampEnCours)'+"' style='cursor:hand' style=''>"
	A += "								<font id='OptionText1' face='Tahoma' style='margin-left:15px;font-size:8.000pt'>"
	A += "									Exporter vers Excel..."
	A += "								</font>"
	A += "							</td>"
	A += "						</tr>"
	A += "						<tr height=22 width=100%>"
	A += "							<td onselectstart='return(false)' border=1 title='Exporter le contenu vers Word...' style='border-width:0' id='Option2' height=22 width=100% onmouseover='_WWCTX_SELECTION(2);' onmouseout='_WWCTX_FERME()' onmouseup='"+'_JEC("rtf","EXPORTRTF",gsChampEnCours)'+"' style='cursor:hand' style='margin-left:15px;'>"
	A += "								<font id='OptionText2' face='Tahoma' style='margin-left:15px;font-size:8.000pt'>"
	A += "									Exporter vers Word..."
	A += "								</font>"
	A += "							</td>"
	A += "						</tr>"
	A += "						<tr height=22 width=100%>"
	A += "							<td onselectstart='return(false)' border=1 title='Exporter le contenu vers XML...' style='border-width:0' id='Option3' height=22 width=100% onmouseover='_WWCTX_SELECTION(3);' onmouseout='_WWCTX_FERME()' onmouseup='"+'_JEC("xml","EXPORTXML",gsChampEnCours)'+"' style='cursor:hand' style='margin-left:15px;'>"
	A += "								<font id='OptionText3' face='Tahoma' style='margin-left:15px;font-size:8.000pt'>"
	A += "									Exporter vers XML..."
	A += "								</font>"
	A += "							</td>"
	A += "						</tr>"
	A += "					</table>"
	A += "				</td>"
	A += "			</tr>"
	A += "		</table>"
	A += "	</div>"
	document.write(A)
}

function _WWCTX_OUVRE(sChamp)
{
	gbEnDehors = 0
	gsChampEnCours = sChamp
	_WWCTX_AFFICHE()
}

function _WWCTX_IN(sChamp)
{
	gbEnDehors = 0
	gsChampEnCours = sChamp
	var obj = _WWCTX_OBJET(gsChampEnCours)
	obj.oncontextmenu = _WWCTX_AFFICHE
	document.oncontextmenu = _WWCTX_BLOQUE
}

function _WWCTX_OUT(sChamp)
{
	gbEnDehors = 1
	gsChampEnCours = sChamp
	var obj = _WWCTX_OBJET(gsChampEnCours)
	obj.oncontextmenu = ""
	document.oncontextmenu = ""
}

function _WWCTX_PAGE()
{
	if(gbEnDehors==1 && gsChampEnCours != "" )
	{
		var obj = _WWCTX_OBJET(gsChampEnCours)
		obj.oncontextmenu = ""
		document.oncontextmenu = ""	
		gsChampEnCours = ""
		_WWCTX_CACHE()
	}
}
