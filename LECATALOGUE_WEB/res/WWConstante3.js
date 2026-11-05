// 18.0.1.0 WWConstante3.js
/*! VersionVI: 30F180063c x */
// Le seul support technique disponible pour cette librairie est accessible a travers le service "Assistance Directe".

// Days of the week
var STD_LUNDI = "Monday";
var STD_MARDI = "Thuesday";
var STD_MERCREDI = "Wednesday";
var STD_JEUDI = "Thursday";
var STD_VENDREDI = "Friday";
var STD_SAMEDI = "Saturday";
var STD_DIMANCHE = "Sunday";

// Month of the year
var STD_JANVIER = "January";
var STD_FEVRIER = "February";
var STD_MARS = "March";
var STD_AVRIL = "April";
var STD_MAI = "May";
var STD_JUIN = "June";
var STD_JUILLET = "July";
var STD_AOUT = "August";
var STD_SEPTEMBRE = "September";
var STD_OCTOBRE = "October";
var STD_NOVEMBRE = "November";
var STD_DECEMBRE = "December";

// Constants for the popup menu of tables/loopers
var TABLE_EXPORT_EXCEL = "Export to Excel...";
var TABLE_EXPORT_EXCEL_TITLE = "Export the content to Excel...";
var TABLE_EXPORT_WORD = "Export to Word...";
var TABLE_EXPORT_WORD_TITLE = "Export the content to Word...";
var TABLE_EXPORT_XML = "Export to XML...";
var TABLE_EXPORT_XML_TITLE = "Export the content to XML...";
var TABLE_EXPORT_PDF = "Print in PDF...";
var TABLE_EXPORT_PDF_TITLE = "Print to a PDF file...";

// Error messages of debug
var STD_ERREUR_MESSAGE			= "Error running browser code\nError ";
var STD_ERREUR_CHAMP_FOCUS		= "SetFocus: unknown control";
var STD_ERREUR_NUM_CHAMP_FOCUS		= "1004";
var STD_ERREUR_CHAMP_OBLIGATOIRE1	= "'";
var STD_ERREUR_CHAMP_OBLIGATOIRE2	= "' control required";
var STD_TITRE_TRACE					= "Trace of WebDev browser codes";
var STD_INFO_TRACE					= "Ctrl+P enables you to print the trace window";
var STD_ERREUR_MESSAGE_UPLOAD		= "The upload failed.\nAn unexpected error occurred while uploading one of the files.\nCheck the size of the files to upload.";
var STD_ERREUR_MESSAGE_VIDEO		= "Unable to display the video file: %1.\n- Check whether the file exists on the server.\n- Check whether the consultation of this type of file (filtering by MIME type) is allowed by the Web server.";

// Tooltips and messages of the toolbar for the chart controls
var CHART_TOOLBAR =
{
	// Tooltips of the buttons in the bar
	ALTTEXT :
	{
		PIE : "Pie charts...",
		COL : "Bar charts...",
		CUR : "Line charts...",
		STO : "Stock charts...",
		SAV : "Save as...",
		PRI : "Print...",
		LEG : "Legend...",
		GDH : "Horizontal gridlines",
		GDV : "Vertical gridlines",
		SMO : "Smoothing",
		GRA : "Gradient",
		RAI : "Raised",
		ANT : "Anti-aliasing",
		TRA : "Transparency"
	},

	// Caption of the menu for the legend
	LEG :
	{
		0 : "None",
		1 : "Right",
		2 : "Left",
		3 : "Top",
		4 : "Bottom"
	},

	// Text of the menus for the types
	// Pie charts
	PIE :
	{
		0 : "Pie",
		1 : "Semi-circular",
		2 : "Donut",
		3 : "Funnel"
	},
	// Bar charts
	COL :
	{
		0 : "Clustered bar charts",
		1 : "Stacked bar charts",
		2 : "Grouped horizontal bar charts",
		3 : "Stacked horizontal bar charts"
	},
	// Line charts
	CUR :
	{
		0 : "Line",
		1 : "Scatter",
		2 : "Area",
		3 : "Radar",
		4 : "Bubbles"
	},
	// Stock charts
	STO :
	{
		0 : "Candlestick",
		1 : "BarCharts",
		2 : "MinMax"
	}
};

// Tooltips and messages in the toolbar of the rich HTML edit control
var HTML_TOOLBAR =
{
	// Tooltips of the buttons in the bar
	ALTTEXT :
	{
		GRA : "Bold",
		ITA : "Italic",
		SOU : "Underline",
		BAR : "Strikeout",
		AGA : "Align left",
		ACE : "Center",
		ADR : "Align right",
		AJU : "Justify",
		LNU : "Numbering",
		LPU : "Bullets",
		RMO : "Decrease indent",
		RPL : "Increase indent",
		EXP : "Superscript",
		IND : "Subscript",
		COL : "Color",
		LNK : "Insert a link",
		IMG : "Insert an image",
		FNA : "Font",
		FSI : "Font size"
	},
	// Couleurs de la palette
	COFP:
	{
		0: "General",
		1: "Title",
		2: "Subtitle",
		3: "Note/Warning"
	},
	COLP :
	{
		0: "General",
		1: "Title",
		2: "Subtitle",
		3: "Link (1)",
		4: "Link (2)",
		5: "Note/Warning"
	},
	FHE:
	{
		0: "Normal",
		1: "Title 1",
		2: "Title 2",
		3: "Title 3",
		4: "Title 4",
		5: "Title 5",
		6: "Title 6",
		7: unescape("Preformatted"),
		8: unescape("Highlighted")
	}
};
