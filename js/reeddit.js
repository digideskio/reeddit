$(document).ready(function() {

    var linksTemplate = "{{#children}}<article class='linkWrap'><div class='link' data-url='{{data.url}}' data-id='{{data.id}}' target='_blank'><div class='linkInfo'><p class='linkTitle'>{{data.title}}</p><p class='linkDomain'>{{data.domain}}</p><p class='linkSub'>{{data.subreddit}}</p></div><div class='linkThumb'><div style='background-image: url({{data.thumbnail}})'></div></div></div><div class='toComments' data-id='{{data.id}}'><div></div></div></article>{{/children}}";

    var linksTemplateLeft = "{{#children}}<article class='linkWrap'><div class='link' data-url='{{data.url}}' data-id='{{data.id}}' target='_blank'><div class='linkThumb'><div class='marginless' style='background-image: url({{data.thumbnail}})'></div></div><div class='linkInfo thumbLeft'><p class='linkTitle'>{{data.title}}</p><p class='linkDomain'>{{data.domain}}</p><p class='linkSub'>{{data.subreddit}}</p></div></div><div class='toComments' data-id='{{data.id}}'><div class='rightArrow'></div></div></article>{{/children}}";

    var linkSummaryTemplate = "<div id='linkSummary'><a href='{{url}}' target='_blank'><p id='summaryTitle'>{{title}}</p><p id='summaryDomain'>{{domain}}</p></a></div><div id='summaryExtra'><p id='summarySub'>{{sub}}</p><p id='summaryTime'></p><p id='summaryCommentNum'>{{comments}} comments</p></div>";

    var subredditsListTemplate = "<ul id='subs'>{{#subs}}<li><p class='sub'>{{name}}</p></li>{{/subs}}</ul>";

    var ancho = 320, activeView = 1, urlInit = "http://www.reddit.com/", urlEnd = ".json?jsonp=?",
    urlLimitEnd = ".json?limit=30&jsonp=?", loadedLinks = {}, posts = {}, currentSub = 'frontPage', mostrandoMenu = false,
    // Pseudo-Enums
    moverIzquierda = 1, moverDerecha = 2;

    var obtenerAncho = function() {
        ancho = $(window).width();
    };

    var loadLinks = function(baseUrl, fromSub) {
        var main = $("#mainWrap");
        if (fromSub) {
            var m = document.getElementById("mainWrap");
            m.scrollTop = 0;
            setTimeout(function () {
                main.prepend("<p class='loading'>Cargando links...</p>");
            }, 350);
        } else {
            main.empty();
            main.append("<p class='loading'>Cargando links...</p>");
        }
        $.getJSON(baseUrl + urlLimitEnd, function(result) {
            var links = result.data;
            var numThumbs = 0;
            for(var i = 0; i < links.children.length; i++) {
                var link = links.children[i];
                if(posts[link.data.id]) {
                    posts[link.data.id].comments = link.data.num_comments;
                    posts[link.data.id].time = link.data.created_utc;
                } else {
                    posts[link.data.id] = {
                        "title": link.data.title,
                        "text": link.data.selftext,
                        "time": link.data.created_utc,
                        "domain": link.data.domain,
                        "sub": link.data.subreddit,
                        "comments": link.data.num_comments,
                        "url": link.data.url,
                        "self": link.data.is_self,
                        "link": link.data.permalink
                    };
                }

                if(link.data.thumbnail || link.data.thumbnail === 'detault' || link.data.thumbnail === 'nsfw' || link.data.thumbnail === 'self'){
                    numThumbs++;
                }
            }
 
            var html = Mustache.to_html(numThumbs > 15 ? linksTemplateLeft : linksTemplate, links);
            if(fromSub) {
                main.empty();
            }else{
                $(".loading").remove();
            }
            main.append(html);
            var thumbs = $('.linkThumb div');
            $.each(thumbs, function(i, t) {
                var thumb = $(t);
                var bg = thumb.attr('style');
                if(bg === 'background-image: url()' || bg === 'background-image: url(default)' || bg === 'background-image: url(nsfw)' || bg === 'background-image: url(self)') {
                    thumb.parent().remove();
                }
            });
        });
    };

    var loadComments = function(data, baseElement, id) {
        var now = new Date().getTime();
        var converter = new Markdown.Converter();
        var com = $("<article/>");
        for(var i = 0; i < data.length - 1; i++) {
            var c = data[i];
            var html = converter.makeHtml(c.data.body);

            var comment = $("<div/>").addClass("commentWrap")
            .append($("<div/>").addClass("commentData")
                .append($("<div/>").addClass("commentAuthor")
                    .append($("<p/>").text(c.data.author)))
                .append($("<div/>").addClass("commentInfo")
                    .append($("<p/>").text(timeSince(now, c.data.created_utc)))))
            .append($("<div/>").addClass("commentBody").html(html));
            com.append(comment);
        }
        baseElement.append(com);
        loadedLinks[id] = com;
        $("#detailWrap a").attr("target", "_blank");
    };

    var procesarComentarios = function(comm) {
        var id = comm.attr("data-id");
        ensenar("#navBack");
        var detail = $("#detailWrap");
        detail.empty();

        var d = document.getElementById("detailWrap");
        d.scrollTop = 0;

        if (loadedLinks[id]) {
            detail.append(posts[id].summary);
            detail.append(loadedLinks[id]);
        } else {
            var postInfo = posts[id];
            var summaryWrap = $("<article/>");
            summaryWrap.append(Mustache.to_html(linkSummaryTemplate, postInfo));
            if(postInfo.text) {
                var summaryConverter1 = new Markdown.Converter();
                summaryWrap.append($("<div/>").attr("id", "selfText").append(summaryConverter1.makeHtml(postInfo.text)));
            }
            posts[id].summary = summaryWrap;
            detail.append(summaryWrap);
            $("#summaryTime").text(timeSince(new Date().getTime(), postInfo.time));
            var url = "http://www.reddit.com" + posts[id].link + urlEnd;
            detail.append("<p class='loading'>Cargando comentarios...</p>");
            $.getJSON(url, function(result) {
                $(".loading").remove();
                var comments = result[1].data.children;
                loadComments(comments, detail, id);
            });
        }

        slideFromRight();

        $("#titleHead").empty().append(title);
        $("#title").text(posts[id].title);
        $("#mainTitle").addClass('invisible');
    };

    var loadSubsList = function() {
        $.getJSON('./js/subs.json', function(subs) {
            var html = Mustache.to_html(subredditsListTemplate, subs);
            $("#mainMenu").append(html);
        });
    };

    function timeSince(now, time) {

        now = (now / 1000);

        var seconds = Math.floor(now - time);

        var interval = (seconds / 31536000);

        if (interval > 1) {
            interval = Math.floor(interval);
            return interval + (interval > 1 ? " years" : " year");
        }
        interval = (seconds / 2592000);
        if (interval > 1) {
            interval = Math.floor(interval);
            return interval + (interval > 1 ? " months" : " month");
        }
        interval = (seconds / 86400);
        if (interval > 1) {
            interval = Math.floor(interval);
            return interval + (interval > 1 ? " days" : " day");
        }
        interval = (seconds / 3600);
        if (interval > 1) {
            interval = Math.floor(interval);
            return interval + (interval > 1 ? " hours" : " hour");
        }
        interval = (seconds / 60);
        if (interval > 1) {
            interval = Math.floor(interval);
            return interval + (interval > 1 ? " minutes" : " minute");
        }
        return Math.floor(seconds) + " seconds";
    }

    window.applicationCache.addEventListener("updateready", function(e) {
        var update = window.confirm("Update descargado. Recargar para actualizar?");
        if(update) {
            window.location.reload();
        }
    });

    var changeMainTitle = function(title) {
        $("#subTitle").text(title);
    };

    var backToMainView = function(newTitle) {
        $("#navBack").addClass("invisible");
        $("#mainTitle").removeClass('invisible');
        $("#titleHead").empty().append(headerIcon);
        if(newTitle) {
            changeMainTitle(newTitle);
        }
    };

    var loadSub = function(sub) {
        if(sub !== currentSub) {
            var url;
            if (sub === 'frontPage') {
                url = urlInit;
            } else {
                url = urlInit + "r/" + sub + "/";
            }
            loadLinks(url, true);
            currentSub = sub;
        }
        changeMainTitle(sub);
    };

    var moverMenu = function(direccion) {
        if(direccion === moverIzquierda) {
            $("#container").css('-webkit-transform', 'translate3d(0px, 0px, 0px)');
            setTimeout(function() {
                mostrandoMenu = false;
            });
        }
        if(direccion === moverDerecha) {
            $("#container").css('-webkit-transform', 'translate3d(140px, 0px, 0px)');
            setTimeout(function() {
                mostrandoMenu = true;
            });
        }
    };

    // Taps

    tappable(".sub", {
        onTap: function(e, target) {
            var sub = $(target).first().text();
            moverMenu(moverIzquierda);
            loadSub(sub);
        },
        allowClick: false,
        activeClassDelay: 100,
        activeClass: 'sub-active'
    });

    tappable("#summarySub", {
        onTap: function(e, target) {
            slideFromLeft();
            var subreddit = $(target).text();
            loadLinks(urlInit + "r/" + subreddit + "/");
            backToMainView(subreddit);
        }
    });

    tappable("#navBack", {
        onTap: function(e) {
            slideFromLeft();
            setTimeout(function() {
                $('#detailWrap').empty();
            }, 350);
            backToMainView();
        }
    });

    tappable("#refresh", {
        onTap: function(e) {
            loadLinks(urlInit);
        }
    });
    
    tappable(".link", {
        onTap: function(e, target) {
            var comm = $(target);
            var id = comm.attr("data-id");
            var link = posts[id];
            if (link.self) {
                procesarComentarios(comm);
            } else {
                url = comm.attr("data-url");
                var a = document.createElement('a');
                a.setAttribute("href", url);
                a.setAttribute("target", "_blank");

                var dispatch = document.createEvent("HTMLEvents");
                dispatch.initEvent("click", true, true);
                a.dispatchEvent(dispatch);
            }
        },
        activeClassDelay: 100,
        activeClass: 'link-active'
    });

    tappable(".toComments", {
        onTap: function(e, target) {
            procesarComentarios($(target));
        },
        activeClass: 'toComments-active',
        activeClassDelay: 100
    });

    tappable("#subTitle", {
        onTap: function(e) {
            moverMenu(mostrandoMenu ? moverIzquierda : moverDerecha);
        },
        activeClass: 'subTitle-active'
    });

    // Swipes

    $("#detailView").swipeRight(function() {
        slideFromLeft();
        setTimeout(function() {
            $('#detailWrap').empty();
        }, 350);
        backToMainView();
    });

    $("#mainView").swipeRight(function() {
        if(activeView === 1) {
            moverMenu(moverDerecha);
        }
    });

    $("#mainView").swipeLeft(function() {
        if(mostrandoMenu) {
            moverMenu(moverIzquierda);
        }
    });

    $("#mainView").on("swipeLeft", ".link", function() {
        if(!mostrandoMenu) {
            procesarComentarios($(this));
        }
    });

    // Animaciones

    var slideFromLeft = function () {
        obtenerAncho();
        var main = $("#mainView");
        var det = $("#detailView");
        main.css("left", -ancho);
        setTimeout(function() {
            main.addClass("slideTransition").css('-webkit-transform', 'translate3d(' + ancho + 'px, 0px, 0px)');
            det.addClass("slideTransition").css('-webkit-transform', 'translate3d(' + ancho + 'px, 0px, 0px)');
            setTimeout(function() {
                main.removeClass("slideTransition").css({
                    "-webkit-transform": "",
                    "left": ""
                }).removeClass("fuera");
                det.css({
                    "-webkit-transform": "",
                    "left": ""
                }).removeClass("slideTransition");
                sacar("#detailView");
                activeView = 1;
            }, 350);
        }, 50);
    };

    var slideFromRight = function () {
        obtenerAncho();
        var main = $("#mainView");
        var det = $("#detailView");
        det.css("left", ancho);
        setTimeout(function() {
            main.addClass("slideTransition").css('-webkit-transform', 'translate3d(-' + ancho + 'px, 0px, 0px)');
            det.addClass("slideTransition").css('-webkit-transform', 'translate3d(-' + ancho + 'px, 0px, 0px)');
            setTimeout(function () { // Quita las propiedades de transition
                det.css("left", 0).removeClass("slideTransition").removeClass("fuera").css("-webkit-transform", "");
                main.removeClass("slideTransition").addClass("fuera").css("-webkit-transform", "");
                activeView = 2;
            }, 350);
        }, 100);
    };

    var reveal = function(element) {
        var el = $(element);
        el.removeClass("fuera").addClass("invisible");
        setTimeout(function() {
            el.removeClass("invisible");
        });
    };

    // Metodos de vistas

    var mostrar = function (element) {
        var el = $(element);
        el.removeClass("oculto");
    };

    var sacar = function (element) {
        var el = $(element);
        el.addClass("fuera");
    };

    var ingresar = function(element) {
        var el = $(element);
        el.removeClass("fuera");
        return el;
    };

    var ocultar = function(element) {
        var el = $(element);
        el.addClass("oculto");
    };

    var ensenar = function(element) {
        var el = $(element);
        el.removeClass("invisible");
    };

    var d = document, body = d.body;

    var supportOrientation = typeof window.orientation != 'undefined',
    getScrollTop = function() {
        return window.pageYOffset || d.compatMode === 'CSS1Compat' && d.documentElement.scrollTop || body.scrollTop || 0;
    },
    scrollTop = function() {
        if (!supportOrientation) {
            return;
        } else {
            $(body).css({
                "min-height": (screen.height - 64) + 'px',
                "position": "relative"
            });
            setTimeout(function() {
                window.scrollTo(0, 0);
                var top = getScrollTop();
                window.scrollTo(0, top === 1 ? 0 : 1);
            }, 1);
        }
    };

    var title = $("#title");
    var headerIcon =  $("#headerIcon");

    $("#title").remove();

    loadLinks(urlInit);
    loadSubsList();

    scrollTop();

    $("#container").on('touchstart', function(){
        window.scrollTo(0, 1);
    });

    $("#menuContainer").on('touchstart', function(){
        window.scrollTo(0, 1);
    });
});