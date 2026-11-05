// Procedures globales du projet
// EXE_ExtraitChaineRang
// ------------------------------------------------------------------------------------------------
// Parametres :
//	c : chaine de base
//	p : position de la sous-chaine recherchee (rangXxx)
//	s : separateur utilise
// Variables locales :
//	n : sens de parcours 0 = sens normal, 1 = sens inverse
//	h : cle de la chaine (actuellement le debut de la chaine)
// La dependance sur EXE_ExtraitChaine n'est pas declare (interdependance)
function _ECR(c,p,s)
{
	var h = (c + "").substring(0, 50);
	// Sens par defaut = depuis le debut
	var n = 0;
	// Selon le rang demande
	switch (p)
	{
	// rangDernier
	case -2147483645:
		// inverse le sens
		n = 1;
		// pas de break
	// rangPremier
	case -2147483648:
		// Ajoute dans le tableau
		if (!window.tabExtraitChaine)
		{
			tabExtraitChaine = new Array();
		}
		tabExtraitChaine[h] = 1;
		return _EC(c,tabExtraitChaine[h],s,n);

	// rangPrecedent
	case -2147483646:
		// inverse le sens
		n = 1;
		// pas de break
	// rangSuivant
	case -2147483647:
		// Recherche dans le tableau
		if (!window.tabExtraitChaine || !(tabExtraitChaine[h]))
		{
			return "\b";
		}
		(tabExtraitChaine[h])++;
		var sRes = _EC(c,tabExtraitChaine[h],s,n);
		if ("\b" == sRes)
		{
			// Fin du parcours
			delete tabExtraitChaine[h];
		}
		return sRes;
	}
}
// EXE_ExtraitChaine
// ------------------------------------------------------------------------------------------------
// Parametres :
//	c : chaine de base
//	p : position de la sous-chaine recherchee
//	s : separateur utilise
//	n : sens de parcours	1 => sens inverse, autre (inclus undenfined) => sens normal

// Variables locales :
//	d : position de debut de la chaine a extraire
//	f : position de fin de la chaine a extraire
//	i : compteur de boucle
function _EC(c,p,s,n)
{
	// rangXxx
	if ((p >= -2147483648) && (p <= -2147483645))
	{
		return _ECR(c,p,s);
	}
	// on passe toujours par un tableau de chaines
	var t=new Array();
	if(typeof(s)!=typeof(t))t[0]=s;else t=s;
	if (!(n == 1))
	{
		var d=0;
		// on recherche la position du p-1 eme separateur
		for(var i=0;i<p-1;i++)
		{
			// on cherche la position de la prochaine occurrence du premier separateur trouve dans le tableau des separateurs
			var m=-1;
			var l=0;
			for(var j=0;j<t.length;j++)
			{
				s=t[j];
				var k=c.indexOf(s,d);
				if((k>-1)&&((m<0)||(k<m)))
				{
					m=k;
					l=s.length;
				}
			}
			d=m+l;
			// si on ne trouve pas de separateur, on renvoie soit tout, soit rien en fontion de la position demandee
			if(d==-1)return(p==1?c:"\b");
		}
		// on cherche le separateur suivant parmi ceux du tableau des separateurs
		var f=-1;
		for(var j=0;j<t.length;j++)
		{
			var k=c.indexOf(t[j],d);
			if((k>-1)&&((f<0)||(k<f)))f=k;
		}
		// si f a depasse, on se place a la fin de la chaine
		if(f==-1)f=c.length;
		// finalement, on extrait et on retourne la sous chaine
		return c.substring(d,f);
	}
	else
	{
		var d = c.length;
		// on recherche la position du p-1 eme separateur
		for(var i=0;i<p-1;i++)
		{
			// on cherche la position de la prochaine occurrence du premier separateur trouve dans le tableau des separateurs
			var m=-1;
			for(var j=0;j<t.length;j++)
			{
				var k=c.lastIndexOf(t[j],d-1);
				if(k>m)m=k;
			}
			d=m;
			// si on ne trouve pas de separateur, on renvoie soit tout, soit rien en fontion de la position demandee
			if (d == -1)	return (p==1?c:"\b");
		}
		// on cherche le separateur suivant parmi ceux du tableau des separateurs
		var f=-1;
		var l=0;
		for(var j=0;j<t.length;j++)
		{
			s=t[j];
			var k=c.lastIndexOf(s,d-1);
			if(k>f)
			{
				f=k;
				l=s.length;
			}
		}
		f+=l;
		// si f a depasse, on se place au debut de la chaine
		if (f == -1)return c.substr(0, d);
		// finalement, on extrait et on retourne la sous chaine
		return c.substr(f, d - f);
	}
}
function PROCEDURESGLOBALESDELECATALOGUENAVIGATEUR_BVERIFIEFORMATEMAIL(VsEmail)
{
	{
	var VnLongAro=0;
	var VnLongLastPoint=0;
	var VsUtilisateur="";
	var VsServeur="";
	var VsPays="";
	VnLongAro=Position(VsEmail,"@",null);
	if((!VnLongAro))
	{
		return 0;
	}
	if((Position((VsEmail + "").substring((VnLongAro+1)-1, VsEmail.length),"@",null)!=0))
	{
		return 0;
	}
	var Vi=1;
	while((_EC((VsEmail + "").substring((VnLongAro+1)-1, VsEmail.length),Vi,".",0)!=clWDEncode.sEncodeCharset(unescape("\b"))))
	{
		VsPays=_EC((VsEmail + "").substring((VnLongAro+1)-1, VsEmail.length),Vi,".",0);
		Vi=Vi+1;
	}
	if((Vi==1))
	{
		return 0;
	}
	VnLongLastPoint=(VsEmail.length-VsPays.length);
	VsUtilisateur=(VsEmail + "").substring(1-1, (VnLongAro-1));
	VsServeur=(VsEmail + "").substring((VnLongAro+1)-1, (VnLongLastPoint-1));
	if(((VsUtilisateur.length==0)||(VsServeur.length==0)))
	{
		return 0;
	}
	if(((VsPays.length<2)||(VsPays.length>3)))
	{
		return 0;
	}
	return 1;
}
}
function PROCEDURESGLOBALESDELECATALOGUENAVIGATEUR_RECONNEXIONXX()
{
	{
}
}
