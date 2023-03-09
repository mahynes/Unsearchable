google.load("feeds", "1");
var sources = new Array();
var viewedsources = new Array();
var deletedsources = new Array();
var savedsources = new Array();
var localterms = new Array();
var maxFeedResults = 10;
var pollSeconds = 60;
var lastWidth = $(window).width();

if(window.location.hash)
{
	var hash = window.location.hash.substring(1);
	$('.active').removeClass('active');
	jQuery('[data-section='+hash+']').parent().addClass('active');
	showTab(hash);
}

function initialize() {
  sources[0] = {feed:new google.feeds.Feed("http://digg.com/tag/news.rss"),searchUrl:"",name: "Digg", id:0, defaultChecked: 1, icon:"images/diggicon.jpg", isLocal:0};
  sources[1] = {feed:new google.feeds.Feed("http://news.google.com/?output=rss"),searchUrl:"http://news.google.com/?output=rss&q={0}", name:"Google News", id:1, defaultChecked: 1, icon:"images/googleicon.jpg", isLocal:0};
  sources[2] = {feed:new google.feeds.Feed("http://news.yahoo.com/rss"),searchUrl:"", name:"Yahoo News", id:2,defaultChecked: 1, icon:"images/yahooicon.jpg", isLocal:0};
  sources[3] = {feed:new google.feeds.Feed("http://www.bing.com/news/?format=rss"),searchUrl:"http://www.bing.com/news/search?format=rss&q={0}", name:"Bing News", id:3,defaultChecked: 1, icon:"images/bingicon.jpg", isLocal:0};
  sources[4] = {feed:new google.feeds.Feed("http://rss.cnn.com/rss/cnn_topstories.rss"),searchUrl:"", name:"CNN", id:4,defaultChecked: 1, icon:"images/cnnimage.gif", isLocal:0};
  sources[5] = {feed:new google.feeds.Feed("http://blog.masslive.com/breakingnews/rss.xml"),searchUrl:"", name:"Mass Live", id:5,defaultChecked: 0, icon:"images/masslivelogo.png", isLocal:1};
  sources[6] = {feed:new google.feeds.Feed("http://rss.nytimes.com/services/xml/rss/nyt/NYRegion.xml"),searchUrl:"", name:"New York Times", id:6,defaultChecked: 0, icon:"images/nytlogo.gif", isLocal:0};
  sources[7] = {feed:new google.feeds.Feed("http://braintree.patch.com/articles.rss"),searchUrl:"", name:"Braintree Patch", id:7,defaultChecked: 1, icon:"images/patchicon.jpg", isLocal:1};
  sources[8] = {feed:new google.feeds.Feed("http://www.wickedlocal.com/braintree/topstories/rss?view=true"),searchUrl:"", name:"Wicked Local: Braintree", id:8,defaultChecked: 1, icon:"images/wlbraintree_logo.png", isLocal:1};
  sources[9] = {feed:new google.feeds.Feed("http://wxdata.weather.com/wxdata/weather/rss/local/USMA0050?cm_ven=LWO&cm_cat=rss"),searchUrl:"", name:"Braintree Weather", id:9,defaultChecked: 0, icon:"images/TWC_logo.gif", isLocal:1};
  sources[10] = {feed:new google.feeds.Feed("http://feeds.boston.com/boston/topstories"),searchUrl:"", name:"Boston Globe", id:10,defaultChecked: 1, icon:"images/zip-tbg-header.gif", isLocal:1};
  loadSourceOptions();
  loadSourceArticles();
}
google.setOnLoadCallback(initialize);

$(window).resize(function(e){
	if(!$(e.target).hasClass('news-container__local'))
	{
		$('.news-articles').height($(window).height()-220);
		if($(window).width()>=764)
		{
			$('.news-container__local').width('70%');
			$('.news-container__national').width('19%');
		}
		else{
			$('.news-container__local').width('100%');
			$('.news-container__national').width('100%');
		}
		if($(window).width() < 764 && lastWidth >= 764)
		{
			$(".news-container__local").resizable('destroy');
		}
		else if(lastWidth < 764 && $(window).width() >=764)
		{
			$('.news-container__local').resizable({ handles: 'e' });
			$(".news-container__local").bind("resize", function (event, ui) {
				$('.news-container__national').width($('.news-container').width() -11- $('.news-container__local').width());
			});
		}
		lastWidth = $(window).width();
	}
});

$(document).ready(function(e){
	$('.news-sources').on('click','.news-source__include',function(e){
		var id = $(this).val();
		var className = '.news-id-'.concat(id);
		if($(this).is(':checked'))
		{
			addNewsSourceToFeed(getSourceById(id));
			$(className).show();
		}
		else
		{
			$(className).hide();
		}
	});
	$('#searchBox').on('keypress',function(e){if(e.keyCode == 13){doSearch();}});
	$('#global-search').on('click',doSearch);
	$('#localizeBox').on('keypress',function(e){if(e.keyCode == 13){addLocalTerm();}});
	$('#local-term').on('click',addLocalTerm);

	$('.nav-tabs li a').on('click',function(e){
		$('.active').removeClass('active');
		$(this).parent().addClass('active');
		showTab($(this).attr('data-section'));
	});
	$('.news-articles').height($(window).height()-220);
	$('.news-container__local').resizable({ handles: 'e' });
	$(".news-container__local").bind("resize", function (event, ui) {
		$('.news-container__national').width($('.news-container').width() -11- $('.news-container__local').width());
	});
});

function showTab(tab)
{
	hideAllTabs();
	switch(tab)
	{
		case "NewsStream":
			$('.primary-news').show();
			loadSourceArticles();
			break;
		case "Saved":
			$('.saved-articles').show();
			loadSavedArticles();
			break;
		case "Deleted":
			loadRemovedArticles();
			$('.deleted-articles').show();
			break;
		case "Settings":
			$('.news-settings').show();
			break;
		default:
			$('.primary-news').show();
			loadSourceArticles();
			break;
	}
}


function hideAllTabs()
{
	$('.primary-news,.deleted-articles,.saved-articles,.news-settings').hide();
}

function doSearch(){
	$('.news-container__local .news-articles').empty();
	$('.news-container__national .news-articles').empty();
	loadSourceArticles();
}

function addLocalTerm(){
	//check for existing.
	var term = $('#localizeBox').val();
	if(term)
	{
		$('#localizedTerms').append('<li>'+ term + '</li>');
		$('#localizeBox').val('');
		localterms[localterms.length] = term;
		evaluateNationalForLocal(term);
		targetSearchableFeeds(term);
	}
}

function targetSearchableFeeds(term){
	$.each(sources,function(index,source){
		if(source.searchUrl){
			source.searchFeed = new google.feeds.Feed(source.searchUrl.format(term));
			source.searchFeed.setNumEntries(maxFeedResults*2);
			source.searchFeed.load(function(result){updateFeed(result,source);});
		}
	});
}


function evaluateNationalForLocal(term){
	$.each($('.news-container__national .news-article'),function(index,value){
		var url = $(this).find('.news-feed-url').val();
		var entry = viewedsources[url];
		if(entry){
			if(entry.title.toLowerCase().indexOf(term) >-1|| entry.content.toLowerCase().indexOf(term)> -1){
				insertArticle($('.news-container__local .news-articles'),$(this).html(),entry.publishedDate);
				$(this).remove();
			}
		}
	})
}

function getSourceById(id)
{
	for (var fx = 0; fx < sources.length; fx++)
  	{
		if(sources[fx].id == id)
			return sources[fx];
	}
	return null;
}

function loadRemovedArticles(){
	var html = '';

	for (var url in deletedsources) {
	   if (deletedsources.hasOwnProperty(url)) {
	      	var entry = deletedsources[url];

			html += "<div class='article article--deleted'>";
			html += '<a class="btn btn-default readd-article" onclick="readd($(this).next());">Un-Remove</a>';
			html += '<a href="'+entry.link+'">'+entry.link+'</a>';
			html += "</div>";
	   }
	}

	$('.deleted-articles').html(html);
}

function readd(element)
{
	var url = $(element).attr('href');
	delete deletedsources[url];
	$(element).parent().remove();
}

function loadSavedArticles(){
	$('.saved-articles .news-articles').empty();
	for (var url in savedsources) {
	   if (savedsources.hasOwnProperty(url)) {
			var entry = savedsources[url];
			addNewsEntry(entry,sources[entry.sourceid], true)
	   }
	}
}

function loadSourceOptions(){
	for (var fx = 0; fx < sources.length; fx++)
	  {
		  var source = sources[fx];
			var cbHtml = '<li><input type="checkbox" class="news-source__include cb-'+source.id+'" value="'+source.id+'" ' + (source.defaultChecked ? 'checked' : '') + ' />';
				cbHtml+= '<span class="news-source__text">'+source.name+'</span>';
				cbHtml+= '</li>';
			$('.news-sources').append(cbHtml);
	}
}

function loadSourceArticles(){
	for (var fx = 0; fx < sources.length; fx++)
	{
		var source = sources[fx];
		if($('.cb-'.concat(source.id)).is(':checked'))
		{
			addNewsSourceToFeed(source);
			source.lastUpdated = new Date();
		}
	}
}

function addFeedArticles(result,source) {
	if (!result.error)
	{
		for (var i = 0; i < result.feed.entries.length; i++)
		{
			var entry = result.feed.entries[i];
			if(entry.contentSnippet && deletedsources[entry.link] == null && $('input[value="'+entry.link+'"]').length == 0){
				addNewsEntry(entry, source);
			}
			else if($('input[value="'+entry.link+'"]').length > 0)
			{
				var element = $('input[value="'+entry.link+'"]').parent();
				//TODO:update the news source here.
			}
		}
	}
}


function updateNewsSource(source)
{
	//update the current div's time etc.  This is for weather etc that has same url but updated content.
}

function pollNewsSource(source)
{
	//this is bad, need to change and call updatefeed
	addNewsSourceToFeed(source);
}

function filterNewsFeed(result,searchPhrase,source)
{
	if (!result.error)
	{
		for (var i = 0; i < result.feed.entries.length; i++)
		{
			var entry = result.feed.entries[i];
			if(entry.contentSnippet && deletedsources.indexOf(entry.link) < 0 && $('input[value="'+entry.link+'"]').length == 0)
			{
				//search the title, and content
				if(entry.title.toLowerCase().indexOf(searchPhrase.toLowerCase()) >-1|| entry.content.toLowerCase().indexOf(searchPhrase.toLowerCase())> -1)
					addNewsEntry(entry, source);
			}
		}
	}
	setTimeout(function(e){
		pollNewsSource(source);
	}, pollSeconds*1000);
}

function addSourceToFeed(source)
{
	var searchPhrase = $('#searchBox').val();
	if(!searchPhrase)
	{
		source.feed.setNumEntries(maxFeedResults);
		source.feed.load(function(result){updateFeed(result,source);});
	}
	//search enabled rss
	else if(source.searchUrl)
	{
		source.searchFeed = new google.feeds.Feed(source.searchUrl.format(searchPhrase));
		source.searchFeed.setNumEntries(maxFeedResults*2);
		source.searchFeed.load(function(result){updateFeed(result,source);});
	}
	//manual rss search
	else{
		source.feed.setNumEntries(500);
		source.feed.load(function(result){filterNewsFeed(result,searchPhrase,source);});
	}
}

function updateFeed(result,source){
	addFeedArticles(result,source)
	source.lastUpdate = new Date();
	setTimeout(function(e){
		pollNewsSource(source);
	}, pollSeconds*1000);
}

function addNewsEntry(entry,source, issaved)
{
	var html =  '<div class="news-article news-id-'+source.id+'" >';
			html += '<input type="hidden" class="news-feed-url" value="'+entry.link+'" />';
			html += '<input type="hidden" class="news-date-parsable" value="'+entry.publishedDate+'" />';
			html += '<a class="btn btn-default btn-news save-article" onclick="saveArticle($(this).parent());">Save</a>'
			html += '<a class="btn btn-default btn-news remove-article" onclick="removeArticle($(this).parent());">Remove</a>'
			html += '<div class="news-source"><img src="'+source.icon +'" /></div>';
			html += '<div class="news-date">'+Date.parse(entry.publishedDate).toString("dddd, MMMM dd, yyyy h:mm:ss tt") +'</div>';
			html += '<a class="news-title" target="_blank" href="'+entry.link+'">'+entry.title+'</a>';
			html += '<div class="news-snippet">'+entry.contentSnippet+'</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
	if(!issaved)
	{
		if(source.isLocal || articleContainsLocalTerm(entry)){
			insertArticle($('.news-container__local .news-articles'),html,entry.publishedDate);
		}

		else{
			insertArticle($('.news-container__national .news-articles'),html,entry.publishedDate);
		}
		entry.sourceid = source.id;
		viewedsources[entry.link] = entry;
	}
	else{
		insertArticle($('.saved-articles .news-articles'),html,entry.publishedDate);
	}
}

function articleContainsLocalTerm(entry){
	//search the title, and content
	for(var i in localterms)
	{
		var term = localterms[i].toLowerCase();
		if(entry.title.toLowerCase().indexOf(term) >-1|| entry.content.toLowerCase().indexOf(term)> -1)
			return true;
	}
	return false;
}

function saveArticle(article)
{
	var entryForSave = viewedsources[$(article).find('.news-feed-url').val()];
	savedsources[entryForSave.link] = entryForSave;
	$(article).find('.save-article').addClass('saved');
	$(article).find('.save-article').text('Saved');
}

function removeArticle(article)
{
	var entryForDelete = viewedsources[$(article).find('.news-feed-url').val()];
	if(!savedsources[entryForDelete.link]) deletedsources[entryForDelete.link] = entryForDelete;
	else if(article.closest('.saved-articles').length > 0){
		deletedsources[entryForDelete.link] = entryForDelete;
		delete savedsources[entryForDelete.link];
	}
	$(article).fadeOut(250, function() { $(this).remove(); });
}

function insertArticle(element,html,date)
{
	var articles = $(element).find('.news-article');
	for(var i = 0; i < articles.length; i++)
	{
		var d1 = Date.parse(date);
		var d2 = Date.parse($(articles[i]).find('.news-date-parsable').val());
		if(d1 > d2)
		{
			$(articles[i]).before(html);
			return;
		}
	}
	$(element).append(html);
}

function sortAlpha(a,b){
    return a.innerHTML.toLowerCase() > b.innerHTML.toLowerCase() ? 1 : -1;
};

function sortDate(a,b){
	return new Date( $(a).find('.news-date').text() ) < new Date( $(b).find('.news-date').text() );
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

 equalheight = function(container){

	var currentTallest = 0,
		 currentRowStart = 0,
		 rowDivs = new Array(),
		 $el,
		 topPosition = 0;
	jQuery(container).each(function() {

		jQueryel = jQuery(this);
		jQuery(jQueryel).height('auto')
		topPostion = jQueryel.position().top;

		if (currentRowStart != topPostion) {
			for (currentDiv = 0 ; currentDiv < rowDivs.length ; currentDiv++) {
				rowDivs[currentDiv].height(currentTallest);
			}
			rowDivs.length = 0; // empty the array
			currentRowStart = topPostion;
			currentTallest = jQueryel.height();
			rowDivs.push(jQueryel);
		} else {
			rowDivs.push(jQueryel);
			currentTallest = (currentTallest < jQueryel.height()) ? (jQueryel.height()) : (currentTallest);
		}
		for (currentDiv = 0 ; currentDiv < rowDivs.length ; currentDiv++) {
			rowDivs[currentDiv].height(currentTallest);
		}
	});
}

function ScrollToMiddle(element)
{
	  var elementPosition = $(element).position();
	  var elementTop = elementPosition.top;
  window.scroll(0,(elementTop - 25));
}
