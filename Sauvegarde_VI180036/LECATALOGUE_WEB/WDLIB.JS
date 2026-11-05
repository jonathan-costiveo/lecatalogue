// (C) PCSOFT - 1999-2000
// Le seul support technique disponible pour cette librairie est
// accessible à travers le service "Assistance Directe".


// Liste des messages d'erreurs qui peuvent être affichés :
var sErreur = "La valeur saisie est incorrecte.";


///////////////////////////////////////////////////////////////////////
function bIsNetscape()
{
	return ( navigator.appName=="Netscape" )
}
///////////////////////////////////////////////////////////////////////
function bIsExplorer()
{
	return ( navigator.appName=="Microsoft Internet Explorer" )
}
///////////////////////////////////////////////////////////////////////
function bIsLetter (c)
{   return ( ((c >= "a") && (c <= "z")) ||
			 ((c >= "A") && (c <= "Z")) ||
			 ( c == "á" ) || ( c == "à" ) || ( c == "â" ) ||
			 ( c == "é" ) || ( c == "è" ) || ( c == "ê" ) ||
			 ( c == "ï" ) || ( c == "î" ) ||
			 ( c == "ö" ) || ( c == "ô" ) ||
			 ( c == "ü" ) || ( c == "ù" ) || ( c == "û" ) ||
			 ( c == "ç" ) )
}
///////////////////////////////////////////////////////////////////////
function bIsDigit (c)
{	return ( (c >= "0") && (c <= "9") )	}
///////////////////////////////////////////////////////////////////////
function bIsSepTel(c)
{	return ( ( c == " " ) || ( c == "/" ) || ( c == "\\" ) || ( c == "." ) )		}
///////////////////////////////////////////////////////////////////////
function bIsSymbol(c)
{	return ( ( c == "," ) || ( c == "." ) || ( c == "+" ) || ( c == "-" ) || ( c == " " ) || ( c == "*" ) || ( c == "/" ) )		}
///////////////////////////////////////////////////////////////////////
function bIsControl(c)
{	return ( c < " " )		}
///////////////////////////////////////////////////////////////////////
function bIsSigne(c)
{	return (c=="+") || (c=="-")	}
///////////////////////////////////////////////////////////////////////
function ValRetIE(evt,test)
{
	if (test || (evt.keyCode == 13))
	{
		return evt.keyCode;
	}
	return test;
}

///////////////////////////////////////////////////////////////////////


function VerifRegExp(Champ,sRegExp)
{
	if ( parseInt(navigator.appVersion) >= 4 )
	{
		// on crée l'objet expression régulière à partir de la chaîne :
		regExp = new RegExp(sRegExp);
		// on test si la valeur du champ est ok :
		var test = (Champ.value == "") || regExp.test(Champ.value);
		if ( ! test )
		{	// si non, on averti l'utilisateur :
			alert( sErreur );
		
			if ( bIsExplorer() )
				Champ.style.color=0xff0000;
			Champ.focus();
		}
		else
		{
			if ( bIsExplorer() )
				Champ.style.color=0x000000;
		}
	}
	return true;
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
// handler pour le masque "tout en majuscules" :
function ToutEnMaj(evt)
{
	var car;
	// code différent pour netscape et ie :
	if ( bIsNetscape() )
	{	// conversion code ascii -> caractère :
		car = String.fromCharCode(evt.which);
		// est-ce que c'est une lettre minuscule :
		if ( ( car>='a' ) && ( car<='z') )
		{	// oui => on la convertit en majuscule :
			evt.which = escape(car.toUpperCase());
			// et on se l'envoie :
			evt.target.handleEvent(evt);
			// mais on n'accepte pas la minuscule courante :
			//return false;
		}
	}
	if ( bIsExplorer() )
	{	// conversion en caractère :
		car = String.fromCharCode(evt.keyCode);
		// puis passage en majuscule et code ascii :
		evt.keyCode = car.toUpperCase().charCodeAt(0);
	}
	return true;
}

///////////////////////////////////////////////////////////////////////

function ToutEnMin(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		if ( ( car>='A' ) && ( car<='Z') )
		{				
			evt.which = escape(car.toLowerCase());
			evt.target.handleEvent(evt);
//			return false;
		}
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.keyCode = car.toLowerCase().charCodeAt(0);
	}
	return true;
}

///////////////////////////////////////////////////////////////////////

function Lettre(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		// on accepte la touche si c'est bien une lettre :
		return bIsLetter(car) || bIsControl(car);
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		// on accepte la touche si c'est bien une lettre :
		evt.returnValue = ValRetIE(evt,bIsLetter(car));
	}

	return true;
}

///////////////////////////////////////////////////////////////////////

function LettreChiffre(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return bIsLetter(car) || bIsDigit(car) || bIsControl(car) ;
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsLetter(car) || bIsDigit(car));
	}
	return true;
}

///////////////////////////////////////////////////////////////////////

function Chiffre(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return ( bIsDigit(car) || bIsControl(car) );
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsDigit(car));
	}

	return true;
}

///////////////////////////////////////////////////////////////////////

function LettreMaj(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		// conversion en majuscule :
		car = car.toUpperCase();
		// on laisse passer les caractères de controles :
		if ( bIsControl(car) )
			return true;
		// et on refuse tout ce qui n'est pas majuscule :
		if ( ( car<'A' ) || ( car>'Z') )
			return false;
	}
	if ( bIsExplorer() )
	{	// on récupère le caractère frappé :
		car = String.fromCharCode(evt.keyCode);
		// conversion en majuscule :
		car = car.toUpperCase();
		// est-ce que c'est bien une majuscule ?
		if ( ( car >='A' ) && ( car <='Z' ) )
			// ok : on renvoi son code ascii :
			evt.keyCode = car.charCodeAt(0);
		else
			// sinon, on refuse :
			evt.returnValue = false;
	}
	return true;
}

///////////////////////////////////////////////////////////////////////

function LettreMajChiffre(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		// conversion en majuscule :
		car = car.toUpperCase();
		// on laisse passer les caractères de controles :
		if ( bIsControl(car) )
			return true;
		// et on refuse tout ce qui n'est pas majuscule :
		if ( ( ( car<'A' ) || ( car>'Z') ) &&
			 ( ! bIsDigit(car) ) )
			return false;
	}
	if ( bIsExplorer() )
	{	// on récupère le caractère frappé :
		car = String.fromCharCode(evt.keyCode);
		// conversion en majuscule :
		car = car.toUpperCase();
		// est-ce que c'est bien une majuscule ?
		if ( ( ( car >='A' ) && ( car <='Z' ) ) ||
			 ( bIsDigit(car) ) )
			// ok : on renvoi son code ascii :
			evt.keyCode = car.charCodeAt(0);
		else
			// sinon, on refuse :
			evt.returnValue = false;
	}
	return true;
}

///////////////////////////////////////////////////////////////////////

function NumTel(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return bIsSepTel(car) || bIsDigit(car) || bIsControl(car);
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsSepTel(car) || bIsDigit(car));
	}

	return true;
}

///////////////////////////////////////////////////////////////////////

function ChiffreSymbol(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return bIsSymbol(car) || bIsDigit(car) || bIsControl(car);
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsSymbol(car) || bIsDigit(car));

	}
	return true;
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

function ChiffreSigne(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return ( bIsDigit(car) || bIsSigne(car) || (car==_WW_SEPMILLIER_) || bIsControl(car) );
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsDigit(car) || bIsSigne(car)  || (car==_WW_SEPMILLIER_));
	}
	return true;
}

///////////////////////////////////////////////////////////////////////

function ChiffreVirgule(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return ( bIsDigit(car) || (car==_WW_SEPDECIMAL_) || (car==_WW_SEPMILLIER_) || bIsControl(car) );
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsDigit(car) || (car==_WW_SEPDECIMAL_) || (car==_WW_SEPMILLIER_) || (car==","));
	}
	return true;
}

///////////////////////////////////////////////////////////////////////

function ChiffreSigneVirgule(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return ( bIsDigit(car) || bIsSigne(car) || (car==_WW_SEPDECIMAL_) || (car==_WW_SEPMILLIER_) || bIsControl(car) );
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsDigit(car) || bIsSigne(car) || (car==_WW_SEPDECIMAL_) || (car==_WW_SEPMILLIER_) || (car==","));
	}
	return true;
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

function HHMM(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return ( bIsDigit(car) || (car==":") || bIsControl(car) );
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsDigit(car) || (car==":"));
	}
	return true;
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

function JJMMAA(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return ( bIsDigit(car) || (car=="/") || bIsControl(car) );
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsDigit(car) || (car=="/"));
	}
	return true;
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

function Euro(evt)
{
	var car;

	if ( bIsNetscape() )
	{
		car = String.fromCharCode(evt.which);
		return bIsLetter(car) || bIsDigit(car) || (car==_WW_SEPMILLIER_) || (car==_WW_SEPDECIMAL_) || bIsControl(car);
	}
	if ( bIsExplorer() )
	{
		car = String.fromCharCode(evt.keyCode);
		evt.returnValue = ValRetIE(evt,bIsLetter(car) || bIsDigit(car) || (car==_WW_SEPMILLIER_) || (car==_WW_SEPDECIMAL_));
	}
	return true;
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////


