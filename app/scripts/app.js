'use strict';

$.noConflict;

var crawl = function() {
    var templates = {};
    var template = null;
    var storage = chrome.storage.local;

    var options = {
        backendUrl: 'http://localhost:8080/okc-superprofile-backend/public/index.php/profile'
    };

    var renderTemplate = function(view) {
        var out = Mustache.render(template, view);

        // Common template
        $("body").append(Mustache.render(templates.common));

        $("#okc_crawler > div").html(out);
    };

    /*
     * Routes
     */
    var routes = {
        /*
         * Runs even if route doesn't exist
         */
        _all: function() {
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
        /*
         * For valid routes only
         */
        _valid: function(route) {
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

                toCrawl = [ { username: '_bongo' },  { username: 'afrenchinLA' } ];

                crawl().start(toCrawl);
            });

            $(document).on('click', "#okc_crawler_submit", function() {
                crawl().submit();
            });
        },
        profile: function() {
            storage.get(['crawling'], function(items) {
                if (items.crawling) {
                    renderTemplate({});
                }

                crawl().crawl();
            });
        }
    };

    /*
     * Outside accessible functions
     */
    return {
        route: function() {
            templates = window.crawl_templates;

            var parser = document.createElement('a');
            parser.href = window.location.href;

            var path = parser.pathname.split("/");
            path = path[1];

            // Run for all routes
            routes._all();

            if (typeof routes[path] !== "undefined") {
                console.log("Route: " + path);
                routes._valid(path);
                routes[path]();
            }
        },
        start: function(toCrawl) {
            var that = this;

            var user = toCrawl.shift();

            storage.set({"toCrawl": toCrawl, crawling: true}, function() {
                console.log('Crawling...');

                that.redirect("profile/" + user.username);
            });
        },
        stop: function(clearCrawlData) {
            this.setCrawlUsers([]);

            var options = {
                toCrawl: [],
                crawling: false
            };

            if (clearCrawlData === true) {
                options.crawlData = [];
            }

            storage.set(options);

            this.redirect('favorites');
        },
        crawl: function() {
            var that = this;

            storage.get(['toCrawl','crawling'], function(items) {
                var nextUser = items.toCrawl.shift();
                var thisUser = $("#basic_info_sn").text();

                var href = "";

                if (items.crawling) {
                    var crawlData = {
                        user: thisUser,
                        info: "",
                        percentages: {
                            match: '',
                            friend: '',
                            enemy: ''
                        },
                        essays: [],
                        profile_details: []
                    }

                    /*
                     * Essays
                     */
                    $("div[id^='essay_'].essay").each(function(k,v) {
                        crawlData.essays.push({
                            num: $(this).attr('id'),
                            text: $(this).find('div.text > div').html()
                        });
                    })

                    /*
                     * User Info
                     */
                    crawlData.info = $(".userinfo .details .info").text();


                    /*
                     * Match percentages
                     */
                    var mperElem = $(".userinfo .percentages");

                    crawlData.percentages = {
                        match: $(".match strong", mperElem).text(),
                        friend: $(".friend strong", mperElem).text(),
                        enemy: $(".enemy strong", mperElem).text()
                    };

                    /*
                     * Profile details
                     */
                    $("#profile_details dl").each(function(k,v) {
                        var detail = {
                            key: "",
                            value: ""
                        }

                        var key   = $("dt", this);
                        var value = $("dd", this);

                        if ($("dd > span", this).size()) {
                            value = $("dd > span", this);
                        }

                        detail.value = value.text();
                        detail.key = key.text();

                        crawlData.profile_details.push(detail);
                    });

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

                if (typeof crawlData === "undefined") {
                    var crawlData = [];
                }

                crawlData.push(info);

                console.log(crawlData);

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
