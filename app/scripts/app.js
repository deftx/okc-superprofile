'use strict';

$.noConflict;

var crawl = function() {
    var templates = {};
    var template = null;
    var storage = chrome.storage.local;
    var crawling = false;

    var options = {
        backendUrl: 'http://localhost:8080/okc-superprofile-backend/public/index.php/profile'
    };

    var renderTemplate = function(view) {
        var out = Mustache.render(template, view);
        $("body").append(Mustache.render(templates.all));

        $("#okc_crawler > div").html(out);
    };

    var routes = {
        all: function() {
            template = null;

            $(document).on('click', '#okc_crawler_stop', function() {
                crawl().stop(true);
            });

            crawl().getCrawlData(function(crawlData) {
                if (crawlData.length > 0) {
                    $(".crawldata").show();
                }
            });
        },
        valid: function(route) {
            if (typeof templates[route] !== "undefined") {
                template = templates[route];
            }
        },
        favorites: function() {
            renderTemplate({});

            $(document).on('click', '#okc_crawler_crawl', function() {
                var toCrawl = [];
                $(".user_list .user_row_item").each(function(k,v) {
                    var user = {
                        username: $(".user_name a", v).text()
                    }

                    toCrawl.push(user);
                });

                storage.set({"toCrawl": toCrawl, crawling: true}, function() {
                    console.log('Crawling...');

                    crawling = true;
                    crawl().crawl();
                });
            });

            $(document).on('click', "#okc_crawler_submit", function() {
                crawl().submit();
            });
        },
        profile: function() {
            if (crawling) {
                renderTemplate({});
            }

            crawl().crawl();
        }
    };

    return {
        route: function() {
            templates = window.crawl_templates;

            var parser = document.createElement('a');
            parser.href = window.location.href;

            var path = parser.pathname.split("/");
            path = path[1];

            // Run for all routes
            routes.all();

            if (typeof routes[path] !== "undefined") {
                console.log("Route: " + path);
                routes.valid(path);
                routes[path]();
            }
        },
        crawl: function() {
            var that = this;

            storage.get(['toCrawl','crawling'], function(items) {
                var nextUser = items.toCrawl.shift();
                var thisUser = $("#basic_info_sn").text();

                var href = "";

                console.log(items);

                if (typeof items.crawling !== "undefined"
                    && items.crawling === true
                    ) {

                    var crawlData = {
                        user: thisUser,
                        essays: []
                    }

                    // Crawl every section and save
                    $("div[id^='essay_'].essay").each(function(k,v) {
                        crawlData.essays.push({
                            num: $(this).attr('id'),
                            text: $(this).find('div.text > div').html()
                        });
                    })

                    that.addCrawlData(crawlData);

                    if (typeof nextUser === "undefined") {
                        that.stop(false);
                        return;
                    } else {
                        href = "profile/" + nextUser.username;
                    }

                    that.setCrawlUsers(items.toCrawl);
                    that.redirect(href);
                }
            });
        },
        stop: function(clearCrawlData) {
            this.setCrawlUsers([]);

            var options = {
                toCrawl: [],
                crawling: false
            };

            crawling = false;

            if (clearCrawlData === true) {
                options.crawlData = [];
            }

            storage.set(options);

            this.redirect('favorites');
        },
        submit: function() {
            var that = this;
            this.getCrawlData(function(crawlData) {
                console.log(crawlData);

                $.post(options.backendUrl, { crawlData: crawlData }, function(data) {
                    console.log(data);
                });

                //that.stop(true);
            })
        },
        redirect: function(url) {
            window.location.href="https://www.okcupid.com/"+url
        },
        setCrawlUsers: function(users) {
            storage.set({ toCrawl: users });
        },
        addCrawlData: function(info) {
            storage.get("crawlData", function(items) {
                var crawlData = items.crawlData;

                console.log(crawlData);

                if (typeof crawlData === "undefined") {
                    var crawlData = [];
                }

                crawlData.push(info);

                storage.set({crawlData: crawlData});
            });
        },
        getCrawlData: function(callback) {
            storage.get('crawlData', function(items) {
                if (typeof items.crawlData === "undefined") {
                    items.crawlData = [];
                }

                callback(items.crawlData);
            })
        }
    }
};

(function($) {
    $(function() {
        window.crawl = crawl;

        crawl().route();
    });
})(jQuery);
