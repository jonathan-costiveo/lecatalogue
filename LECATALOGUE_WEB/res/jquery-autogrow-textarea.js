/*!
Grab Bag - Assorted Detritus
  (c) 2008 Jason Frame (jason@onehackoranother.com)
  Released under The MIT License.
 */
jQuery().ready(function(){$.fn.autogrow=function(){return this.filter("textarea").each(function(){var n=$(this),r=n.height(),u=n.css("lineHeight"),i=$("<div><\/div>").css({position:"absolute","word-wrap":"break-word",top:-1e4,left:-1e4,width:$(this).width()-parseInt(n.css("paddingLeft"))-parseInt(n.css("paddingRight")),fontSize:n.css("fontSize"),fontFamily:n.css("fontFamily"),lineHeight:n.css("lineHeight"),resize:"none"}).appendTo(document.body),t=function(){var n=function(n,t){for(var i=0,r="";i<t;i++)r+=n;return r},t=this.value.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/&/g,"&amp;").replace(/\n$/,"<br/>&nbsp;").replace(/\n/g,"<br/>").replace(/ {2,}/g,function(t){return n("&nbsp;",t.length-1)+" "});i.html(t),$(this).css("height",Math.max(i.height()+40,r)).css("overflow","hidden")};$(this).change(t).keyup(t).keydown(t),t.apply(this)}),this}})