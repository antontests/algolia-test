(function ($) {
    var AUTOCOMPLETE_DELAY = 50;
    var AUTOCOMPLETE_ITEMS_IN_FEED = 10;
    var ITEMS_ON_PAGE = 15;
    var PLACEHOLDER_IMAGE_PATH = '/img/placeholder-image.png';

    function MainController() {
        this.elements = {};
        this.templates = {};
        this.algolia_client = null;
        this.algolia_index = null;
        this.current_query = '';
        this.current_category = '';
        this.searching_in_category = false;
        this.pages_loaded = 0;
        this.current_pages_number = 0;
    }

    MainController.prototype = {
        /**
         * INITIALIZATION METHODS
         */

        /**
         * Inits the Algolia search connection and index.
         */
        initAlgoliaIndex: function () {
            var self = this;

            self.algolia_client = algoliasearch('JS7TG4PFI2', '6c17ecb855533edebe856bd1f5f549ea');
            self.algolia_index = self.algolia_client.initIndex('apps');
        },

        /**
         * Inits the Handlebars helpers.
         */
        initHandlebars: function () {
            Handlebars.registerHelper('uriencode', function(str) {
                return encodeURIComponent(str);
            });
        },

        /**
         * Inits the Algolia search connection and index.
         */
        initCategoriesListAndBindEvents: function () {
            var self = this;

            self.algolia_index.search('', { facets: ['category'] }, function (error, result) {
                var categories = [];

                if (!error) {
                    for (var category_name in result.facets.category) {
                        categories.push(category_name);
                    }
                }

                $('#categories_list_container').html(
                    self.templates.categories_list({ items: categories })
                );

                self.elements.$categories = $('.sidebar-nav .nav-list li');
                self.elements.$categories_links = $('.sidebar-nav .nav-list a');

                self.elements.$categories_links.click(function (event) {
                    self.interfaceSelectCategory(decodeURIComponent($(this).attr('href').substr(1)));
                });

                self.markCategorySelected(self.current_category);
            });
        },

        /**
         * Inits the interface elements collection.
         */
        initElements: function () {
            this.elements = $.extend({}, {
                $search_input: $('#search'),
                $clear_search_query_button: $('#clear_search_query'),
                $in_category_button: $('#in_category_button'),
                $results_found_number: $('#results_found_number'),
                $search_form: $('#search_form'),
                $search_results: $('#search_results'),
                $categories: $(), // It's left for late initialization in initCategoriesListAndBindEvents().
                $categories_links: $(), // It's left for late initialization initCategoriesListAndBindEvents().
                $load_more_button: $('#load_more')
            });
        },

        /**
         * Inits the handlebars templates of the page.
         */
        initTemplates: function () {
            this.templates = $.extend({}, {
                categories_list: Handlebars.compile($('#categories-list-template').html()),
                autocomplete_item: Handlebars.compile($('#autocomplete-item-template').html()),
                list: Handlebars.compile($('#list-template').html())
            });
        },

        /**
         * Renders the initial search results.
         */
        initSearchInterfaceAndResults: function () {
            var self = this;

            if (self.elements.$search_input.val()) {
                self.current_query = self.elements.$search_input.val();
            }

            if (window.location.hash) {
                self.current_category = decodeURIComponent(window.location.hash.substr(1));
            }
            self.markCategorySelected(self.current_category);

            self.searching_in_category = !!(self.current_query && self.current_category);
            self.elements.$in_category_button.toggleClass('active', self.searching_in_category);

            self.refreshSearchResults();
        },

        /**
         * Binds interface events.
         */
        bindEvents: function () {
            var self = this;

            self.elements.$search_input.autocomplete({
                minLength: 0,
                delay: AUTOCOMPLETE_DELAY,
                source: self.fetchAutocompleteResults.bind(self)
            })
                .on('autocompleteselect', function (event, ui) {
                    self.interfaceSubmitSearchForm();
                })
                .autocomplete('instance')._renderItem = function( ul, item ) {
                    var $li = $(self.templates.autocomplete_item({ item: item }));
                    return $li.appendTo(ul);
                };

            self.elements.$clear_search_query_button.click(function (event) {
                self.interfaceClearSearchQuery();
            });

            self.elements.$in_category_button.click(function (event) {
                self.interfaceToggleSearchingInCategory();
            });

            self.elements.$search_form.submit(function (event) {
                event.preventDefault();
                self.interfaceSubmitSearchForm();
            });

            self.elements.$load_more_button.click(function (event) {
                self.interfaceLoadMore();
            });
        },

        /**
         * Binds interface events to an item of the search results.
         * @param items
         */
        bindSearchItemsEvents: function (items) {
            var self = this;

            $(items).find('.thumbnail-category a').click(function (event) {
                self.interfaceSelectCategory(decodeURIComponent($(this).attr('href').substr(1)));
            });
        },



        /**
         * UTILITY METHODS
         */

        /**
         * Decodes HTML entities in a given string.
         * @param encoded_string
         * @returns {string}
         */
        htmlEntityDecode: function (encoded_string) {
            return $('<textarea />').html(encoded_string).text();
        },

        /**
         * Fetches the search results and calls the given response_callback passing the search_results array as a parameter.
         * @param request The search query string.
         * @param parameters Object with the Algolia search parameters.
         * @param response_callback A closure to be called after the search request is completed.
         */
        fetchSearchResults: function (request, parameters, response_callback) {
            var self = this,
                default_parameters = {
                    hitsPerPage: ITEMS_ON_PAGE
                };

            if (self.current_category) {
                default_parameters.filters = 'category:"'+self.current_category+'"';
            }

            if ($.isFunction(parameters)) {
                response_callback = parameters;
                parameters = {};
            }

            var search_options = $.extend(default_parameters, parameters);

            self.algolia_index.search(request, search_options, function (error, result) {
                var search_results = [];

                if (!error) {
                    self.setResultsFoundNumber(result.nbHits);
                    self.current_pages_number = result.nbPages;
                    self.pages_loaded = result.page + 1;

                    search_results = result.hits;
                    for (var ii in search_results) {
                        if (!search_results[ii].image) {
                            search_results[ii].image = PLACEHOLDER_IMAGE_PATH;
                        }
                    }
                }

                return error ? response_callback(error) : response_callback(search_results)
            });
        },

        /**
         * Fetches the search results and calls the given response_callback.
         * This method is optimized to be a source-callback for jQueryUI autocomplete plugin.
         * @param request Object with a single field "term", that contains the search query.
         * @param response_callback A closure to be called after the search request is completed.
         */
        fetchAutocompleteResults: function (request, response_callback) {
            var self = this,
                search_options = { hitsPerPage: AUTOCOMPLETE_ITEMS_IN_FEED };

            if (self.searching_in_category) {
                search_options.filters = 'category:"'+self.current_category+'"';
            }

            self.algolia_index.search(request.term, search_options, function (error, result) {
                var search_results = result.hits;

                for (var ii in search_results) {
                    search_results[ii].value = self.htmlEntityDecode(search_results[ii].name);
                }

                return error ? response_callback(error) : response_callback(search_results);
            });
        },

        /**
         * Renders the search results into the search results feed.
         * @param items
         */
        renderSearchResults: function (items) {
            var self = this;

            self.elements.$search_results.append(
                self.templates.list({ items: items })
            );
            self.bindSearchItemsEvents(self.elements.$search_results.children());
        },

        /**
         * Refreshes the search results according to the current values of the query string and the category.
         * Resets the number of loaded pages.
         */
        refreshSearchResults: function () {
            var self = this;

            self.pages_loaded = 0;

            self.fetchSearchResults(self.current_query, { page: 0 }, function (search_results) {
                self.elements.$search_results.empty();
                self.renderSearchResults(search_results);
                self.refreshLoadMoreButtonState();
            });
        },

        /**
         * Append a new page of fetched according to the current values of the query string and the category search results to the already shown results.
         */
        appendNewSearchResultsPage: function () {
            var self = this;

            self.fetchSearchResults(self.current_query, { page: self.pages_loaded }, function (search_results) {
                self.renderSearchResults(search_results);
                self.refreshLoadMoreButtonState();
            });
        },

        /**
         * Marks the given category selected.
         */
        markCategorySelected: function (category) {
            var self = this;

            self.elements.$categories.removeClass('active');
            self.elements.$categories_links.filter('[href="#'+category+'"]').parent().addClass('active');
        },

        /**
         * Marks "Load more" button either active or inactive.
         */
        refreshLoadMoreButtonState: function () {
            var self = this,
                visible = self.pages_loaded < self.current_pages_number;

            self.elements.$load_more_button.toggle(visible);
        },

        /**
         * Sets a number of found results to the interface number container.
         */
        setResultsFoundNumber: function (results_found) {
            var self = this;

            self.elements.$results_found_number.html(results_found);
        },



        /**
         * INTERFACE HANDLERS
         */

        /**
         * Clears search query field.
         */
        interfaceClearSearchQuery: function () {
            var self = this;

            self.current_query = '';
            self.elements.$search_input.val('');
            self.refreshSearchResults();
        },

        /**
         * Toggles "In Category" button state.
         */
        interfaceToggleSearchingInCategory: function () {
            var self = this;

            self.elements.$in_category_button.toggleClass('active');
            self.searching_in_category = !self.searching_in_category;
        },

        /**
         * Submits the search form.
         */
        interfaceSubmitSearchForm: function () {
            var self = this;

            self.current_query = self.elements.$search_input.val();

            if (!self.searching_in_category) {
                self.current_category = '';
                self.markCategorySelected(self.current_category);
            }

            self.refreshSearchResults();
        },

        /**
         * Selects the category in the list of the categories.
         */
        interfaceSelectCategory: function (category) {
            var self = this;

            if (!self.searching_in_category) {
                self.current_query = '';
                self.elements.$search_input.val('');
            }
            self.current_category = category;

            self.refreshSearchResults();
            self.markCategorySelected(category);
        },

        /**
         * Selects the category in the list of the categories.
         */
        interfaceLoadMore: function () {
            var self = this;

            self.appendNewSearchResultsPage();
        },

        /**
         * Runs the initialization of the interface.
         */
        run: function () {
            if (Handlebars===undefined) {
                console.error('Handlebars module required for this page hasn\'t been found.');
                return;
            }

            this.initAlgoliaIndex();
            this.initHandlebars();
            this.initTemplates();
            this.initCategoriesListAndBindEvents();
            this.initElements();
            this.bindEvents();
            this.initSearchInterfaceAndResults();
        }
    }

    var controller = new MainController();
    controller.run();
})(jQuery);